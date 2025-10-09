import { createRoute, z } from "@hono/zod-openapi";
import {
  CampaignPersistence,
  ContactPersistence,
  EmailPersistence,
  EmailService,
  EventPersistence,
  MembershipPersistence,
  ProjectPersistence,
  rootLogger,
  TaskQueue,
  UserPersistence,
} from "@sendra/lib";
import { CampaignSchema, CampaignSchemas, EmailSchema, type Project } from "@sendra/shared";
import type { AppType } from "../../app";
import { HttpException, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
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
      emails: EmailSchema.optional(),
    }),
    createSchema: CampaignSchemas.create,
    updateSchema: CampaignSchemas.update,
    embeddable: ["emails"],
    listQuerySchema: z.never(),
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

      if (live) {
        if (campaign.recipients.length === 0) {
          throw new HttpException(400, "No recipients provided");
        }

        logger.info({ campaign: campaign.id, recipients: campaign.recipients.length }, "Sending campaign");

        // Update campaign status
        await campaignPersistence.put({
          ...campaign,
          status: "DELIVERED",
        });

        // Create events in DynamoDB
        const eventNames = [
          `${campaign.subject
            .toLowerCase()
            .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
            .replace(/ /g, "-")}-campaign-delivered`,
          `${campaign.subject
            .toLowerCase()
            .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
            .replace(/ /g, "-")}-campaign-opened`,
        ];

        const eventPersistence = new EventPersistence(projectId);
        for (const eventName of eventNames) {
          const event = {
            project: projectId,
            name: eventName,
            campaign: campaign.id,
          };
          await eventPersistence.create(event);
        }

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
        await Promise.all(
          tasks.map(async (taskData) => {
            const createdEmail = await emailPersistence.create({
              messageId: "",
              subject: campaign.subject,
              body: campaign.body,
              source: campaign.id,
              sourceType: "CAMPAIGN",
              email: await contactPersistence.get(taskData.contactId).then((c) => c?.email ?? ""),
              contact: taskData.contactId,
              sendType: "MARKETING",
              status: "QUEUED",
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
          }),
        );
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
        await EmailService.send({
          from: {
            name: project.from ?? project.name,
            email: project.verified && project.email ? project.email : process.env.DEFAULT_EMAIL as string, // TODO: Add env variable to configure default email
          },
          to: users.map((m) => m.email),
          content: {
            subject: `[Campaign Test] ${campaign.subject}`,
            html: EmailService.compile({
              content: campaign.body,
              footer: {
                unsubscribe: false,
              },
              contact: {
                email: "",
                id: "",
              },
              project: {
                name: project.name,
              },
            }),
          },
        });
      }
      return c.json({}, 202);
    },
  );
};
