import { createRoute, z } from "@hono/zod-openapi";
import { ActionPersistence, TemplatePersistence } from "@sendra/lib";
import { ActionSchema, ActionSchemas, EmailSchema, EventSchema } from "@sendra/shared";
import type { AppType } from "../../app";
import { NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";
import { registerProjectEntityCrudRoutes } from "./ProjectEntity";

export const registerActionsRoutes = (app: AppType) => {
  registerProjectEntityCrudRoutes(app, {
    entityPath: "actions",
    entityName: "Action",
    getSchema: ActionSchema.extend({
      _embed: z
        .object({
          emails: EmailSchema.optional(),
          events: EventSchema.optional(),
        })
        .optional(),
    }),
    createSchema: ActionSchemas.create,
    updateSchema: ActionSchemas.update,
    listQuerySchema: z.enum(["event", "template"]),
    embeddable: ["emails", "events"],
    getPersistence: (projectId: string) => new ActionPersistence(projectId),
    preCreateEntity: async (projectId, action) => {
      if (!action.template) {
        return action;
      }

      const templatePersistence = new TemplatePersistence(projectId);
      const template = await templatePersistence.get(action.template);

      if (!template || template.project !== projectId) {
        throw new NotFound("template");
      }
      return action;
    },
    preUpdateEntity: async (projectId, action) => {
      if (!action.template) {
        return action;
      }

      const templatePersistence = new TemplatePersistence(projectId);
      const template = await templatePersistence.get(action.template);

      if (!template || template.project !== projectId) {
        throw new NotFound("template");
      }
      return action;
    },
  });

  app.openapi(
    createRoute({
      id: "get-related-actions",
      method: "get",
      path: "/projects/:projectId/actions/:actionId/related",
      request: {
        params: z.object({
          projectId: z.string(),
          actionId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.array(ActionSchema),
            },
          },
          description: "Get related actions",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, actionId } = c.req.param();
      const actionPersistence = new ActionPersistence(projectId);
      const related = await actionPersistence.getRelated(actionId);
      return c.json(related, 200);
    },
  );
};
