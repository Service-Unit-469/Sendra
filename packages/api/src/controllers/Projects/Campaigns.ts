import { createRoute, z } from "@hono/zod-openapi";
import {
  CampaignPersistence,
  type CompileProps,
  ContactPersistence,
  EmailService,
  getEmailConfig,
  MembershipPersistence,
  ProjectPersistence,
  rootLogger,
  TaskQueue,
  TemplatePersistence,
  UserPersistence,
} from "@sendra/lib";
import { CampaignSchema, CampaignSchemas, EmailSchema, type Project } from "@sendra/shared";
import type { AppType } from "../../app";
import { HttpException, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";
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
  const contactsWithIds = (await contactPersistence.batchGet(ids)).filter((c) => c.subscribed);

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
      }),
  ).then((contacts) => contacts.filter((c) => c.subscribed));

  return [...contactsWithIds.map((c) => c.id), ...contactsWithEmails.map((c) => c.id)];
};

export const registerCampaignsRoutes = (app: AppType) => {
  registerProjectEntityCrudRoutes(app, {
    entityPath: "campaigns",
    entityName: "Campaign",
    getSchema: CampaignSchema.extend({
      _embed: z
        .object({
          emails: EmailSchema.optional(),
        })
        .optional(),
    }),
    createSchema: CampaignSchemas.create,
    updateSchema: CampaignSchemas.update,
    embeddable: ["emails"],
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
      campaign.recipients = await resolveRecipients(campaign.recipients, project);
      return campaign;
    },
    preUpdateEntity: async (projectId, campaign) => {
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      campaign.recipients = await resolveRecipients(campaign.recipients, project);
      await validateEmail(projectId, campaign.email);
      return campaign;
    },
  });

  app.openapi(
    createRoute({
      tags: ["Campaign"],
      operationId: "send-campaign",
      method: "post",
      path: "/projects/{projectId}/campaigns/{campaignId}/send",
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
      const emailConfig = getEmailConfig();
      const { projectId, campaignId } = c.req.param();
      const body = await c.req.json();
      const { live, delay: userDelay } = CampaignSchemas.send.parse(body);

      const campaignPersistence = new CampaignPersistence(projectId);
      const campaign = await campaignPersistence.get(campaignId);

      if (!campaign || campaign.project !== projectId) {
        throw new NotFound("campaign");
      }

      if (live) {
        if (campaign.recipients.length === 0) {
          throw new HttpException(400, "No recipients provided");
        }

        logger.info({ campaign: campaign.id, recipients: campaign.recipients.length }, "Queueing campaign");

        // Update campaign status
        await campaignPersistence.put({
          ...campaign,
          status: "DELIVERED",
        });

        await TaskQueue.addTask({
          type: "queueCampaign",
          payload: {
            campaign: campaign.id,
            project: projectId,
            delay: userDelay,
          },
        });
        logger.info({ campaign: campaign.id, recipients: campaign.recipients.length }, "Campaign queued");
      } else {
        const projectPersistence = new ProjectPersistence();
        const project = await projectPersistence.get(projectId);
        if (!project) {
          throw new NotFound("project");
        }

        const membershipPersistence = new MembershipPersistence();
        const members = await membershipPersistence.getProjectMemberships(projectId);

        const userPersistence = new UserPersistence();
        const users = await userPersistence.batchGet(members.map((m) => m.user));

        logger.info({ campaign: campaign.id, recipients: users.length }, "Sending test email");

        const templatePersistence = new TemplatePersistence(projectId);
        const template = await templatePersistence.get(campaign.template);
        if (!template) {
          throw new NotFound("template");
        }

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
        const subject = EmailService.compileSubject(`[Campaign Test] ${campaign.subject}`, params);
        params.email.subject = subject;
        await EmailService.send({
          from: {
            name: project.from ?? project.name,
            email: project.identity?.verified && project.email ? project.email : emailConfig.defaultEmail, // TODO: Add env variable to configure default email
          },
          to: users.map((m) => m.email),
          content: {
            subject,
            html: EmailService.compileBody(campaign.body.html, params as CompileProps),
            plainText: EmailService.compileBody(campaign.body.plainText, params as CompileProps),
          },
        });
      }
      return c.json({}, 202);
    },
  );
};
