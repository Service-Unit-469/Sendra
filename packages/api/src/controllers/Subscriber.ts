import { createRoute, z } from "@hono/zod-openapi";
import { ContactPersistence, ProjectPersistence } from "@sendra/lib";
import { type Contact, SubscriberSchema, SubscriberUpdateSchema } from "@sendra/shared";
import type { AppType } from "../app";
import { NotFound } from "../exceptions";
import { getProblemResponseSchema } from "../exceptions/responses";

async function toSubscriptions(contacts: Contact[]) {
  const projectPersistence = new ProjectPersistence();
  const projects = await projectPersistence.batchGet(contacts.map((contact) => contact.project));
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    subscribed: contacts.find((contact) => contact.project === project.id)?.subscribed ?? false,
  }));
}

export const registerSubscriberRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/subscriber",
      request: {
        query: z.object({
          email: z.string().email(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: SubscriberSchema,
            },
          },
          description: "Subscriber",
        },
        400: getProblemResponseSchema(400),
        404: getProblemResponseSchema(404),
      },
    }),
    async (c) => {
      const { email } = c.req.query();

      const contacts = await ContactPersistence.getByEmailFromAllProjects(email);

      if (contacts.length === 0) {
        throw new NotFound("Contact");
      }

      const subscriptions = await toSubscriptions(contacts);

      return c.json({ email, subscriptions }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/subscriber",
      request: {
        body: {
          content: {
            "application/json": {
              schema: SubscriberUpdateSchema,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: SubscriberSchema,
            },
          },
          description: "The updated subscriber",
        },
        400: getProblemResponseSchema(400),
        404: getProblemResponseSchema(404),
      },
    }),
    async (c) => {
      const body = await c.req.json();
      const { email, subscriptions } = SubscriberUpdateSchema.parse(body);

      const contacts = await ContactPersistence.getByEmailFromAllProjects(email);

      await Promise.all(
        contacts.map(async (contact) => {
          if (subscriptions.find((subscription) => subscription.id === contact.project)?.subscribed !== contact.subscribed) {
            const contactPersistence = new ContactPersistence(contact.project);
            const updatedContact = {
              ...contact,
              subscribed: subscriptions.find((subscription) => subscription.id === contact.project)?.subscribed ?? false,
            };
            await contactPersistence.put(updatedContact);
          }
        }),
      );

      const newSubscriptions = await toSubscriptions(contacts);
      return c.json({ email, subscriptions: newSubscriptions }, 200);
    },
  );
};
