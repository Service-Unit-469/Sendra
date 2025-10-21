import { createRoute, z } from "@hono/zod-openapi";
import {
  ContactPersistence,
  EmailPersistence,
  EmailService,
  ProjectPersistence,
  rootLogger,
} from "@sendra/lib";
import { EmailSchemas, EmailSchema, EventSchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { registerProjectEntityReadRoutes } from "./ProjectEntity";
import { HttpException } from "api/src/exceptions";
import {
  BearerAuth,
  isAuthenticatedProjectMemberKey,
} from "api/src/middleware/auth";

const logger = rootLogger.child({
  module: "Emails",
});

export const registerEmailsRoutes = (app: AppType) => {
  registerProjectEntityReadRoutes(app, {
    entityPath: "emails",
    entityName: "Email",
    embeddable: [],
    getSchema: EmailSchema,
    listQuerySchema: z.enum(["messageId", "source"]),
    getPersistence: (projectId: string) => new EmailPersistence(projectId),
  });

  app.openapi(
    createRoute({
      id: "send-email",
      method: "post",
      path: "/projects/:projectId/emails/send-transactional",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: EmailSchemas.send,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Send an email",
        },
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);

      if (!project) {
        throw new HttpException(401, "Incorrect Bearer token specified");
      }

      const json = await c.req.json();
      const result = EmailSchemas.send.safeParse(json);

      if (!result.success) {
        throw new HttpException(400, result.error.issues[0].message);
      }

      const {
        from,
        name,
        reply,
        to,
        subject,
        body,
        subscribed,
        headers,
        attachments,
      } = result.data;

      if (!project.email || !project.identity?.verified) {
        throw new HttpException(
          400,
          "Verify your domain before you start sending"
        );
      }

      if (from && from.split("@")[1] !== project.email?.split("@")[1]) {
        throw new HttpException(
          400,
          "Custom from address must be from a verified domain"
        );
      }

      const emails: {
        contact: {
          id: string;
          email: string;
        };
        email: string;
      }[] = [];

      const emailPersistence = new EmailPersistence(project.id);
      const contactPersistence = new ContactPersistence(project.id);
      for (const email of to) {
        let contact = await contactPersistence.getByEmail(email);

        if (!contact) {
          contact = await contactPersistence.create({
            email,
            subscribed: subscribed ?? false,
            project: project.id,
            data: {},
          });
        } else {
          if (subscribed && contact.subscribed !== subscribed) {
            contact = await contactPersistence.put({
              ...contact,
              subscribed,
            });
          }
        }
        const compiledSubject = EmailService.compileSubject(subject, {
          contact,
          project,
        });
        const compiledBody = EmailService.compileBody(body, {
          contact,
          project,
          email: {
            sendType: "TRANSACTIONAL",
            subject,
          },
        });

        const { messageId } = await EmailService.send({
          from: {
            name: name ?? project.from ?? project.name,
            email: from ?? project.email,
          },
          reply: reply ?? from ?? project.email,
          to: [email],
          headers,
          attachments,
          content: {
            subject: compiledSubject,
            html: compiledBody,
          },
        });

        // Create email record
        const createdEmail = await emailPersistence.create({
          project: project.id,
          messageId,
          subject: compiledSubject,
          email: contact.email,
          body: compiledBody,
          contact: contact.id,
          status: "SENT",
          sendType: "TRANSACTIONAL",
        });

        emails.push({
          contact: { id: contact.id, email: contact.email },
          email: createdEmail.id,
        });
      }

      logger.info(
        { to, project: project.name, count: to.length },
        "Sent transactional emails"
      );

      return c.json(
        { success: true, emails, timestamp: new Date().toISOString() },
        200
      );
    }
  );
};
