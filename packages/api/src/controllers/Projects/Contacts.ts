import { createRoute, z } from "@hono/zod-openapi";
import { ContactPersistence, ContactService, ProjectPersistence, rootLogger } from "@sendra/lib";
import { ContactSchema, ContactSchemas, EmailSchema, EventSchema } from "@sendra/shared";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { AppType } from "../../app";
import { HttpException, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";
import { registerProjectEntityCrudRoutes } from "./ProjectEntity";

const logger = rootLogger.child({
  module: "Contacts",
});

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function validateContactData(data: Record<string, unknown>, schemaString: string | undefined): void {
  if (!schemaString) {
    return; // No schema defined, skip validation
  }

  let schema: object;
  try {
    schema = JSON.parse(schemaString);
  } catch (error) {
    logger.warn({ err: error }, "Invalid contact data schema");
    throw new HttpException(500, "Internal server error: Invalid contact data schema", {
      schemaError: error,
    });
  }

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    logger.warn({ errors: validate.errors }, "Contact data validation failed");
    const errors = validate.errors?.map((err) => `${err.instancePath || "root"} ${err.message}`).join(", ") || "Validation failed";
    throw new HttpException(400, `Contact data validation failed: ${errors}`);
  }
}

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

      // Validate contact data against project schema if defined
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (project?.contactDataSchema) {
        validateContactData(contact.data || {}, project.contactDataSchema);
      }

      return contact;
    },
    preUpdateEntity: async (projectId, contact) => {
      // Validate contact data against project schema if defined
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (project?.contactDataSchema && contact.data) {
        validateContactData(contact.data, project.contactDataSchema);
      }
      return contact;
    },
  });

  app.openapi(
    createRoute({
      tags: ["Contact"],
      operationId: "subscribe-contact",
      method: "post",
      path: "/projects/{projectId}/contacts/{contactId}/subscribe",
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
      tags: ["Contact"],
      operationId: "unsubscribe-contact",
      method: "post",
      path: "/projects/{projectId}/contacts/{contactId}/unsubscribe",
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
