import { createRoute, z } from "@hono/zod-openapi";
import { GroupPersistence } from "@sendra/lib";
import { ContactSchema, GroupSchema, GroupSchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";
import { registerProjectEntityCrudRoutes } from "./ProjectEntity";

export const registerGroupsRoutes = (app: AppType) => {
  registerProjectEntityCrudRoutes(app, {
    entityPath: "groups",
    entityName: "Group",
    getSchema: GroupSchema,
    createSchema: GroupSchemas.create,
    updateSchema: GroupSchemas.update,
    embeddable: [],
    listQuerySchema: z.enum([]),
    getPersistence: (projectId: string) => new GroupPersistence(projectId),
  });

  app.openapi(
    createRoute({
      tags: ["Group", "Contact"],
      operationId: "get-group-contacts",
      method: "get",
      path: "/projects/{projectId}/groups/{groupId}/contacts",
      request: {
        params: z.object({
          projectId: z.string(),
          groupId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                contacts: z.array(ContactSchema),
              }),
            },
          },
          description: "Get group contacts",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, groupId } = c.req.valid("param");
      const groupPersistence = new GroupPersistence(projectId);
      const contacts = await groupPersistence.getContacts(groupId);
      return c.json({ contacts }, 200);
    },
  );
};
