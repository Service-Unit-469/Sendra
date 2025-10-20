import { createRoute, z } from "@hono/zod-openapi";
import { ActionsService, ContactPersistence, EmailPersistence, EmailService, EventPersistence, ProjectPersistence, rootLogger } from "@sendra/lib";
import { type Contact, type ContactSchemas, type Event, EventSchema, EventSchemas, id } from "@sendra/shared";
import type { AppType } from "../../app";
import { BadRequest, HttpException, NotAllowed, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";

import { BearerAuth, isAuthenticatedProjectMemberKey, isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";

const logger = rootLogger.child({
  module: "Events",
});

export const registerEventsRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      id: "list-all-event-types",
      method: "get",
      path: "/projects/:projectId/event-types/all",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        query: z.object({
          embed: z.enum(["events"]).optional(),
        }),
      },
      responses: {
        200: {
          description: "List all event types",
          content: {
            "application/json": {
              schema: z.object({
                eventTypes: z.array(
                  z.object({
                    name: z.string(),
                    _embed: z
                      .object({
                        events: z.array(EventSchema),
                      })
                      .optional(),
                  }),
                ),
              }),
            },
          },
        },
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }

      const eventTypes: { name: string; _embed?: { events: Event[] } }[] = project.eventTypes.map((eventType) => ({
        name: eventType,
      }));

      if (c.req.query("embed") === "events") {
        const eventPersistence = new EventPersistence(projectId);

        await Promise.all(
          eventTypes.map(async (eventType) => {
            const events = await eventPersistence.findAllBy({
              key: "eventType",
              value: eventType.name,
            });
            eventType._embed = { events: events as unknown as Event[] };
          }),
        );
      }
      return c.json({ eventTypes }, 200);
    },
  );

  app.openapi(
    createRoute({
      id: "list-events",
      method: "get",
      path: "/projects/:projectId/events",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          description: "List events",
        },
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const eventPersistence = new EventPersistence(projectId);
      const events = await eventPersistence.listAll();
      return c.json(events, 200);
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
          description: "Track an event",
          content: {
            "application/json": {
              schema: z.object({
                success: z.boolean(),
                contact: id,
                eventType: z.string(),
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
        logger.warn({ projectId, body }, "Tried tracking an event with invalid data");
        throw new BadRequest(result.error.issues[0].message);
      }

      const { event: name, email, data, subscribed, transientData } = result.data;

      if (name === "subscribe" || name === "unsubscribe") {
        throw new NotAllowed("subscribe & unsubscribe are reserved event names.");
      }

      if (!project.eventTypes.includes(name)) {
        logger.info({ projectId, eventType: name }, "Adding event type to project");
        project.eventTypes.push(name);
        await projectPersistence.put(project);
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
      const event = await eventPersistence.create({
        eventType: name,
        contact: contact.id as string,
        project: projectId,
        data: { ...dataToUpdate, ...(transientData ?? {}) },
      });

      await ActionsService.trigger({
        eventType: name,
        contact: contact as Contact,
        project,
      });

      rootLogger.info(
        {
          project: project.name,
          event: name,
          contact: contact.email,
        },
        "Triggered event",
      );

      return c.json(
        {
          success: true,
          contact: contact.id as string,
          eventType: name,
          event: event.id,
          timestamp: new Date().toISOString(),
        },
        200,
      );
    },
  );
};
