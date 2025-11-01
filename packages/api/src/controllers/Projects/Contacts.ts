import { createRoute, z } from "@hono/zod-openapi";
import { ContactPersistence, ContactService } from "@sendra/lib";
import { ContactSchema, ContactSchemas, EmailSchema, EventSchema } from "@sendra/shared";
import type { AppType } from "../../app";
import { HttpException, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";
import { registerProjectEntityCrudRoutes } from "./ProjectEntity";

export const registerContactsRoutes = (app: AppType) => {
  registerProjectEntityCrudRoutes(app, {
    entityPath: "contacts",
    entityName: "Contact",
    getSchema: ContactSchema.extend({
      _embed: z
        .object({
          emails: EmailSchema.optional(),
          events: EventSchema.optional(),
        })
        .optional(),
    }),
    createSchema: ContactSchemas.create,
    updateSchema: ContactSchemas.update,
    embeddable: ["emails", "events"],
    listQuerySchema: z.enum(["email"]),
    getPersistence: (projectId: string) => new ContactPersistence(projectId),
    preCreateEntity: async (projectId, contact) => {
      const contactPersistence = new ContactPersistence(projectId);
      const existingContact = await contactPersistence.getByEmail(contact.email);

      if (existingContact) {
        throw new HttpException(409, "Contact already exists");
      }
      return contact;
    },
  });

  app.openapi(
    createRoute({
      id: "subscribe-contact",
      method: "post",
      path: "/projects/:projectId/contacts/:contactId/subscribe",
      request: {
        params: z.object({
          projectId: z.string(),
          contactId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: ContactSchema,
            },
          },
          description: "Subscribe contact",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, contactId } = c.req.param();
      const contactPersistence = new ContactPersistence(projectId);
      const contact = await contactPersistence.get(contactId);

      if (!contact) {
        throw new NotFound("contact");
      }

      const updatedContact = await ContactService.updateContact({
        oldContact: contact,
        newContact: { ...contact, subscribed: true },
        contactPersistence,
      });

      return c.json(updatedContact, 200);
    },
  );

  app.openapi(
    createRoute({
      id: "unsubscribe-contact",
      method: "post",
      path: "/projects/:projectId/contacts/:contactId/unsubscribe",
      request: {
        params: z.object({
          projectId: z.string(),
          contactId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: ContactSchema,
            },
          },
          description: "Unsubscribe contact",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, contactId } = c.req.param();
      const contactPersistence = new ContactPersistence(projectId);
      const contact = await contactPersistence.get(contactId);

      if (!contact) {
        throw new NotFound("contact");
      }

      const updatedContact = { ...contact, subscribed: false };
      await contactPersistence.put(updatedContact);

      return c.json(updatedContact, 200);
    },
  );
};
