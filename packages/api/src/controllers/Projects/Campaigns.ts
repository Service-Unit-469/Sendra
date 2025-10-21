import { createRoute, z } from "@hono/zod-openapi";
import {
  CampaignPersistence,
  type CompileProps,
  ContactPersistence,
  EmailPersistence,
  EmailService,
  getEmailConfig,
  MembershipPersistence,
  ProjectPersistence,
  rootLogger,
  SmsPersistence,
  TaskQueue,
  UserPersistence,
} from "@sendra/lib";
import {
  Campaign,
  CampaignSchema,
  CampaignSchemas,
  EmailSchema,
  SmsSchema,
  type Project,
} from "@sendra/shared";
import type { AppType } from "../../app";
import { BadRequest, HttpException, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import {
  BearerAuth,
  isAuthenticatedProjectMemberOrSecretKey,
} from "../../middleware/auth";
import { registerProjectEntityCrudRoutes } from "./ProjectEntity";
import { validateEmail } from "./utils";

const logger = rootLogger.child({
  module: "Campaigns",
});

const resolveRecipients = async (rawRecipients: string[], project: Project) => {
  const contactPersistence = new ContactPersistence(project.id);
  if (rawRecipients.length === 1 && rawRecipients[0] === "all") {
    const projectContacts = await contactPersistence.listAll();
    const subscribedContacts = projectContacts.filter((c) => c.subscribed);
    return subscribedContacts.map((c) => c.id);
  }
  const ids = rawRecipients.filter((r) => !r.includes("@"));
  const contactsWithIds = (await contactPersistence.batchGet(ids)).filter(
    (c) => c.subscribed
  );

  const contactsWithEmails = await Promise.all(
    rawRecipients
      .filter((r) => r.includes("@"))
      .map(async (email) => {
        let contactWithEmail = await contactPersistence.getByEmail(email);
        if (!contactWithEmail) {
          contactWithEmail = await contactPersistence.create({
            email: email,
            project: project.id,
            subscribed: true,
            data: {},
          });
        }
        return contactWithEmail;
      })
  ).then((contacts) => contacts.filter((c) => c.subscribed));

  return [
    ...contactsWithIds.map((c) => c.id),
    ...contactsWithEmails.map((c) => c.id),
  ];
};

async function sendTestEmails(projectId: string, campaign: Campaign) {
  const emailConfig = getEmailConfig();
  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);
  if (!project) {
    throw new NotFound("project");
  }

  const membershipPersistence = new MembershipPersistence();
  const members = await membershipPersistence.getProjectMemberships(projectId);

  const userPersistence = new UserPersistence();
  const users = await userPersistence.batchGet(members.map((m) => m.user));

  logger.info(
    { campaign: campaign.id, recipients: users.length },
    "Sending test email"
  );

  const params = {
    contact: {
      email: emailConfig.defaultEmail,
      data: {},
      subscribed: true,
    },
    email: {
      sendType: "MARKETING",
      subject: `[Campaign Test] ${campaign.subject}`,
    },
    project: {
      name: project.name,
      id: project.id,
    },
  };
  const subject = EmailService.compileSubject(
    `[Campaign Test] ${campaign.subject}`,
    params
  );
  params.email.subject = subject;
  await EmailService.send({
    from: {
      name: project.from ?? project.name,
      email:
        project.identity?.verified && project.email
          ? project.email
          : emailConfig.defaultEmail,
    },
    to: users.map((m) => m.email),
    content: {
      subject,
      html: EmailService.compileBody(campaign.body, params as CompileProps),
    },
  });
}

async function sendEmails(
  campaign: Campaign,
  campaignPersistence: CampaignPersistence,
  userDelay: number,
  projectId: string
) {
  if (campaign.recipients.length === 0) {
    throw new HttpException(400, "No recipients provided");
  }

  logger.info(
    { campaign: campaign.id, recipients: campaign.recipients.length },
    "Sending email campaign"
  );

  // Update campaign status
  await campaignPersistence.put({
    ...campaign,
    status: "DELIVERED",
  });

  let delay = userDelay ?? 0;

  const tasks = campaign.recipients.map((contactId: string, index: number) => {
    if (index % 80 === 0) {
      delay += 1;
    }

    return {
      campaign: campaign.id,
      contactId,
      delaySeconds: delay * 60,
    };
  });

  const emailPersistence = new EmailPersistence(projectId);
  const contactPersistence = new ContactPersistence(projectId);
  const emailTasks = await Promise.all(
    tasks.map(async (taskData) => {
      const createdEmail = await emailPersistence.create({
        subject: campaign.subject,
        body: campaign.body,
        source: campaign.id,
        sourceType: "CAMPAIGN",
        email: await contactPersistence
          .get(taskData.contactId)
          .then((c) => c?.email ?? ""),
        contact: taskData.contactId,
        sendType: "MARKETING",
        status: "QUEUED",
        project: projectId,
      });

      await TaskQueue.addTask({
        type: "sendEmail",
        payload: {
          email: createdEmail.id,
          campaign: taskData.campaign,
          contact: taskData.contactId,
          project: projectId,
        },
        delaySeconds: taskData.delaySeconds,
      });
    })
  );
  logger.info(
    { campaign: campaign.id, tasks: emailTasks.length },
    "Added email campaign tasks"
  );
}

async function sendSmsCampaign(
  campaign: Campaign,
  campaignPersistence: CampaignPersistence,
  userDelay: number,
  projectId: string
) {
  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);
  if (!project) {
    throw new NotFound("project");
  }

  const smsConfig = project.sms;
  if (!smsConfig.enabled) {
    throw new BadRequest("SMS is not enabled for this project");
  }

  const contactPersistence = new ContactPersistence(projectId);
  const contacts = await contactPersistence.batchGet(campaign.recipients);

  const contactsWithPhones = contacts.filter(
    (c) => c?.data[smsConfig.phoneKey]
  );
  if (contactsWithPhones.length === 0) {
    throw new BadRequest("No contacts with phones found");
  }

  logger.info(
    { campaign: campaign.id, recipients: campaign.recipients.length },
    "Sending SMS campaign"
  );

  // Update campaign status
  await campaignPersistence.put({
    ...campaign,
    status: "DELIVERED",
  });

  let delay = userDelay ?? 0;

  const tasks = campaign.recipients.map((contactId: string, index: number) => {
    if (index % 80 === 0) {
      delay += 1;
    }

    return {
      campaign: campaign.id,
      contactId,
      delaySeconds: delay * 60,
    };
  });

  const smsPersistence = new SmsPersistence(projectId);
  const smsTasks = await Promise.all(
    tasks.map(async (taskData) => {
      const createdSms = await smsPersistence.create({
        phone: (contactsWithPhones.find((c) => c.id === taskData.contactId)
          ?.data[smsConfig.phoneKey] ?? "") as unknown as string,
        body: campaign.body,
        source: campaign.id,
        sourceType: "CAMPAIGN",
        contact: taskData.contactId,
        sendType: "MARKETING",
        status: "QUEUED",
        project: projectId,
      });

      await TaskQueue.addTask({
        type: "sendSms",
        payload: {
          sms: createdSms.id,
          campaign: taskData.campaign,
          contact: taskData.contactId,
          project: projectId,
        },
        delaySeconds: taskData.delaySeconds,
      });
    })
  );
  logger.info(
    { campaign: campaign.id, tasks: smsTasks.length },
    "Added SMS campaign tasks"
  );
}

export const registerCampaignsRoutes = (app: AppType) => {
  registerProjectEntityCrudRoutes(app, {
    entityPath: "campaigns",
    entityName: "Campaign",
    getSchema: CampaignSchema.extend({
      _embed: z
        .object({
          emails: z.array(EmailSchema).optional(),
          smses: z.array(SmsSchema).optional(),
        })
        .optional(),
    }),
    createSchema: CampaignSchemas.create,
    updateSchema: CampaignSchemas.update,
    embeddable: ["emails", "smses"],
    listQuerySchema: z.string(),
    getPersistence: (projectId: string) => new CampaignPersistence(projectId),
    preCreateEntity: async (projectId, campaign) => {
      await validateEmail(projectId, campaign.email);
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      campaign.status = "DRAFT";
      campaign.recipients = await resolveRecipients(
        campaign.recipients,
        project
      );
      return campaign;
    },
    preUpdateEntity: async (projectId, campaign) => {
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      campaign.recipients = await resolveRecipients(
        campaign.recipients,
        project
      );
      await validateEmail(projectId, campaign.email);
      return campaign;
    },
  });

  app.openapi(
    createRoute({
      method: "post",
      path: "/projects/:projectId/campaigns/:campaignId/send",
      request: {
        params: z.object({
          projectId: z.string(),
          campaignId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: CampaignSchemas.send,
            },
          },
        },
      },
      responses: {
        202: {
          description: "Campaign sent",
        },

        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        500: getProblemResponseSchema(500),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, campaignId } = c.req.param();
      const body = await c.req.json();
      const { live, delay: userDelay } = CampaignSchemas.send.parse(body);

      const campaignPersistence = new CampaignPersistence(projectId);
      const campaign = await campaignPersistence.get(campaignId);

      if (!campaign || campaign.project !== projectId) {
        throw new NotFound("campaign");
      }

      if (campaign.channel === "SMS") {
        if (live) {
          await sendSmsCampaign(
            campaign,
            campaignPersistence,
            userDelay,
            projectId
          );
          return c.json({}, 202);
        } else {
          throw new BadRequest("SMS campaign testing is not supported");
        }
      }

      if (live) {
        await sendEmails(campaign, campaignPersistence, userDelay, projectId);
      } else {
        await sendTestEmails(projectId, campaign);
      }
      return c.json({}, 202);
    }
  );
};
