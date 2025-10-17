import { createRoute, z } from "@hono/zod-openapi";
import { ActionsService, ContactPersistence, EmailPersistence, EmailService, EventPersistence, EventTypePersistence, ProjectPersistence, rootLogger } from "@sendra/lib";
import { type Contact, type ContactSchemas, EventSchema, EventSchemas, EventTypeSchema, id } from "@sendra/shared";
import type { AppType } from "../../app";
import { BadRequest, HttpException, NotAllowed, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";

import { BearerAuth, isAuthenticatedProjectMemberKey } from "../../middleware/auth";
import { registerProjectEntityReadRoutes } from "./ProjectEntity";

export const registerEventsRoutes = (app: AppType) => {
  registerProjectEntityReadRoutes(app, {
    entityPath: "event-types",
    entityName: "EventType",
    getSchema: EventTypeSchema.extend({
      _embed: z
        .object({
          events: EventSchema.optional(),
        })
        .optional(),
    }),
    embeddable: ["events"],
    listQuerySchema: z.string(),
    getPersistence: (projectId: string) => new EventTypePersistence(projectId),
  });

  app.openapi(
    createRoute({
      id: "delete-event-type",
      method: "delete",
      path: "/projects/:projectId/event-types/:eventTypeId",
      request: {
        params: z.object({
          projectId: z.string(),
          eventTypeId: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Delete an event",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberKey],
    }),
    async (c) => {
      const { projectId, eventTypeId } = c.req.param();
      await new EventTypePersistence(projectId).delete(eventTypeId);
      return c.body(null, 200);
    },
  );

  app.openapi(
    createRoute({
      id: "send-email",
      method: "post",
      path: "/projects/:projectId/send",
      request: {
        body: {
          content: {
            "application/json": {
              schema: EventSchemas.send,
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
      const result = EventSchemas.send.safeParse(json);

      if (!result.success) {
        throw new HttpException(400, result.error.issues[0].message);
      }

      const { from, name, reply, to, subject, body, subscribed, headers, attachments } = result.data;

      if (!project.email || !project.identity?.verified) {
        throw new HttpException(400, "Verify your domain before you start sending");
      }

      if (from && from.split("@")[1] !== project.email?.split("@")[1]) {
        throw new HttpException(400, "Custom from address must be from a verified domain");
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

      rootLogger.info({ to, project: project.name, count: to.length }, "Sent transactional emails");

      return c.json({ success: true, emails, timestamp: new Date().toISOString() }, 200);
    },
  );

  app.openapi(
    createRoute({
      id: "track-event",
      method: "post",
      path: "/projects/:projectId/track",
      request: {
        body: {
          content: {
            "application/json": {
              schema: EventSchemas.track,
            },
          },
        },
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Send an event",
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                contact: id,
                eventType: id,
                event: id,
                timestamp: z.string(),
              }),
            },
          },
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const body = await c.req.json();
      const result = EventSchemas.track.safeParse(body);

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }

      if (!result.success) {
        rootLogger.warn({ projectId, body }, "Tried tracking an event with invalid data");
        throw new BadRequest(result.error.issues[0].message);
      }

      const { event: name, email, data, subscribed, transientData } = result.data;

      if (name === "subscribe" || name === "unsubscribe") {
        throw new NotAllowed("subscribe & unsubscribe are reserved event names.");
      }

      const eventTypePersistence = new EventTypePersistence(projectId);
      let eventType = await eventTypePersistence.get(name);

      if (!eventType) {
        // Create eventType
        eventType = await eventTypePersistence.create({
          name,
          project: projectId,
        });
      }

      const contactPersistence = new ContactPersistence(projectId);
      let contact: (z.infer<typeof ContactSchemas.create> & { id?: string }) | undefined = await contactPersistence.getByEmail(email);

      if (!contact) {
        contact = {
          email,
          subscribed: subscribed ?? true,
          data: {},
        };
      } else {
        if (subscribed !== null && contact.subscribed !== subscribed) {
          contact = {
            ...contact,
            subscribed,
          };
        }
      }

      const dataToUpdate = contact.data ?? {};

      if (data) {
        const givenUserData = Object.entries(data);

        givenUserData.forEach(([key, value]) => {
          dataToUpdate[key] = value;
        });

        // Update contact data
        contact.data = dataToUpdate;
      }
      if (contact.id) {
        contact = await contactPersistence.put(contact as Contact);
      } else {
        contact = await contactPersistence.create({
          ...contact,
          project: projectId,
        });
      }

      // Create event
      const eventPersistence = new EventPersistence(projectId);
      await eventPersistence.create({
        eventType: eventType.id,
        contact: contact.id as string,
        project: projectId,
        data: { ...dataToUpdate, ...(transientData ?? {}) },
      });

      await ActionsService.trigger({
        eventType,
        contact: contact as Contact,
        project,
      });

      rootLogger.info(
        {
          project: project.name,
          event: eventType.name,
          contact: contact.email,
        },
        "Triggered event",
      );

      return c.json(
        {
          success: true,
          contact: contact.id as string,
          eventType: eventType.id as string,
          event: eventType.name as string,
          timestamp: new Date().toISOString(),
        },
        200,
      );
    },
  );
};
