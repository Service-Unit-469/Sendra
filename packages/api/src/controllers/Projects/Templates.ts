import { z } from "@hono/zod-openapi";
import { ActionPersistence, TemplatePersistence } from "@sendra/lib";
import { ActionSchema, TemplateSchema, TemplateSchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { NotAllowed } from "../../exceptions";
import { registerProjectEntityCrudRoutes } from "./ProjectEntity";
import { validateEmail } from "./utils";

export const registerTemplatesRoutes = (app: AppType) => {
  registerProjectEntityCrudRoutes(app, {
    entityPath: "templates",
    entityName: "Template",
    getSchema: TemplateSchema.extend({
      _embed: z
        .object({
          actions: ActionSchema.optional(),
        })
        .optional(),
    }),
    createSchema: TemplateSchemas.create,
    updateSchema: TemplateSchemas.update,
    listQuerySchema: z.string(),
    embeddable: ["actions"],
    getPersistence: (projectId: string) => new TemplatePersistence(projectId),
    preCreateEntity: async (projectId, template) => {
      await validateEmail(projectId, template.email);
      return template;
    },
    preUpdateEntity: async (projectId, template) => {
      await validateEmail(projectId, template.email);
      return template;
    },
    preDeleteEntity: async (projectId, template) => {
      const actionPersistence = new ActionPersistence(projectId);

      const actions = await actionPersistence.findBy({
        key: "template",
        value: template,
      });
      if (actions.count && actions.count > 0) {
        throw new NotAllowed("This template is being used by an action. Unlink the action before deleting the template.");
      }
    },
  });
};
