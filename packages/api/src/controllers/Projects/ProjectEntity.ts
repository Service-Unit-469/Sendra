import { createRoute, z } from "@hono/zod-openapi";
import { type BaseItem, type BasePersistence, type Embeddable, ProjectPersistence, type QueryResult } from "@sendra/lib";
import type { EmbeddedObject } from "lib/dist/persistence/BasePersistence";
import type { AppType } from "../../app";
import { BadRequest, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { isAuthenticatedProjectMemberOrSecretKey } from "../../middleware/auth";

export type ProjectEntityCreate<T extends BaseItem> = Omit<T, "id" | "type" | "createdAt" | "updatedAt" | "project">;
export type ProjectEntityUpdate<T extends BaseItem> = Omit<T, "type" | "createdAt" | "updatedAt" | "project">;

export type ProjectEntityConfig<T extends BaseItem> = {
  entityPath: string;
  entityName: string;
  getSchema: z.ZodSchema<T>;
  createSchema: z.ZodType<ProjectEntityCreate<T>>;
  updateSchema: z.ZodType<ProjectEntityUpdate<T>>;
  listQuerySchema: z.ZodType<string>;
  embeddable: Embeddable[];
  getPersistence: (projectId: string) => BasePersistence<T>;
  preCreateEntity?: (projectId: string, entity: ProjectEntityCreate<T>) => Promise<ProjectEntityCreate<T>>;
  preUpdateEntity?: (projectId: string, entity: ProjectEntityUpdate<T>) => Promise<ProjectEntityUpdate<T>>;
  preDeleteEntity?: (projectId: string, entityId: string) => Promise<void>;
};

export const registerProjectEntityReadRoutes = <T extends BaseItem>(
  app: AppType,
  config: Omit<ProjectEntityConfig<T>, "preCreateEntity" | "preUpdateEntity" | "preDeleteEntity" | "createSchema" | "updateSchema">,
) => {
  app.openapi(
    createRoute({
      id: `list-${config.entityPath}`,
      method: "get",
      path: `/projects/:projectId/${config.entityPath}`,
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        query: z.object({
          limit: z.number().optional(),
          cursor: z.string().optional(),
          filter: config.listQuerySchema?.optional(),
          value: z.string().optional(),
          embed: z.union([z.array(z.enum(config.embeddable)), z.enum(config.embeddable)]).optional(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                count: z.number(),
                hasMore: z.boolean(),
                cursor: z.string().optional(),
                items: z.array(config.getSchema),
              }),
            },
          },
          description: `Get a ${config.entityName}`,
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const project = await new ProjectPersistence().get(projectId);
      if (!project) {
        throw new NotFound("project");
      }

      let actualLimit = 100;
      const { embed } = c.req.queries();
      const { limit, cursor, filter, value } = c.req.query();
      if (limit) {
        const parsedLimit = Number.parseInt(limit, 10);
        if (parsedLimit > 100) {
          throw new BadRequest("Limit must be less than 100");
        }
        actualLimit = parsedLimit;
      }

      const persistence = config.getPersistence(projectId);

      let entities: QueryResult<EmbeddedObject<T>>;
      if (filter && value) {
        entities = await persistence.findBy({
          key: config.listQuerySchema.parse(filter),
          value: value,
          limit: actualLimit,
          cursor: cursor,
          embed: embed as Embeddable[] | undefined,
        });
      } else {
        entities = await persistence.list({
          limit: actualLimit,
          cursor: cursor,
          embed: embed as Embeddable[] | undefined,
        });
      }

      return c.json(
        {
          count: entities.count,
          hasMore: entities.hasMore,
          items: entities.items,
          cursor: entities.cursor,
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      id: `list-all-${config.entityPath}`,
      method: "get",
      path: `/projects/:projectId/${config.entityPath}/all`,
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        query: z.object({
          filter: config.listQuerySchema.optional(),
          value: z.string().optional(),
          embed: z.union([z.array(z.enum(config.embeddable)), z.enum(config.embeddable)]).optional(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.array(config.getSchema),
            },
          },
          description: `Get all ${config.entityName}`,
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const { embed } = c.req.queries();
      const { filter, value } = c.req.query();
      const project = await new ProjectPersistence().get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      const persistence = config.getPersistence(projectId);
      let entities: T[];
      if (filter && value) {
        entities = await persistence.findAllBy({
          key: config.listQuerySchema.parse(filter),
          value: value,
          embed: embed as Embeddable[] | undefined,
        });
      } else {
        entities = await persistence.listAll({ embed: embed as Embeddable[] | undefined });
      }

      return c.json(entities, 200);
    },
  );

  app.openapi(
    createRoute({
      id: `get-${config.entityPath}-by-id`,
      method: "get",
      path: `/projects/:projectId/${config.entityPath}/:entityId`,
      request: {
        params: z.object({
          projectId: z.string(),
          entityId: z.string(),
        }),
        query: z.object({
          embed: z.union([z.array(z.enum(config.embeddable)), z.enum(config.embeddable)]).optional(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: config.getSchema,
            },
          },
          description: `Get a ${config.entityName}`,
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, entityId } = c.req.param();
      const { embed } = c.req.queries();
      const project = await new ProjectPersistence().get(projectId);
      if (!project) {
        throw new NotFound("project");
      }

      const persistence = config.getPersistence(projectId);
      const entity = await persistence.get(entityId, {
        embed: embed as Embeddable[] | undefined,
      });
      if (!entity) {
        throw new NotFound(config.entityName);
      }

      // @ts-ignore
      return c.json(entity, 200);
    },
  );
};

export const registerProjectEntityCrudRoutes = <T extends BaseItem>(app: AppType, config: ProjectEntityConfig<T>) => {
  registerProjectEntityReadRoutes(app, config);

  app.openapi(
    createRoute({
      id: `create-${config.entityPath}`,
      method: "post",
      path: `/projects/:projectId/${config.entityPath}`,
      request: {
        body: {
          content: {
            "application/json": {
              schema: config.createSchema,
            },
          },
        },
      },
      responses: {
        201: {
          content: {
            "application/json": {
              schema: config.getSchema,
            },
          },
          description: `Create a ${config.entityName}`,
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const project = await new ProjectPersistence().get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      let toCreate = config.createSchema.parse(await c.req.json());
      if (config.preCreateEntity) {
        toCreate = await config.preCreateEntity(projectId, toCreate);
      }
      const persistence = config.getPersistence(projectId);
      const entity = await persistence.create({
        ...toCreate,
        project: projectId,
      } as Omit<T, "id" | "createdAt" | "updatedAt">);
      // @ts-ignore
      return c.json(entity, 201);
    },
  );

  app.openapi(
    createRoute({
      id: `update-${config.entityPath}-by-id`,
      method: "put",
      path: `/projects/:projectId/${config.entityPath}/:entityId`,
      request: {
        params: z.object({
          projectId: z.string(),
          entityId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: config.updateSchema,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: config.getSchema,
            },
          },
          description: `Update a ${config.entityName}`,
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, entityId } = c.req.param();

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }

      let toUpdate = config.updateSchema.parse(await c.req.json());
      if (toUpdate.id !== entityId) {
        throw new BadRequest("ID mismatch");
      }
      if (config.preUpdateEntity) {
        toUpdate = await config.preUpdateEntity(projectId, toUpdate);
      }
      const persistence = config.getPersistence(projectId);
      const originalEntity = await persistence.get(entityId);
      if (!originalEntity) {
        throw new NotFound(config.entityName);
      }
      const entity = await persistence.put({
        project: project.id,
        ...originalEntity,
        ...toUpdate,
      });
      const parsedEntity = config.getSchema.parse(entity);
      return c.json(parsedEntity, 200);
    },
  );

  app.openapi(
    createRoute({
      id: `delete-${config.entityPath}-by-id`,
      method: "delete",
      path: `/projects/:projectId/${config.entityPath}/:entityId`,
      request: {
        params: z.object({
          projectId: z.string(),
          entityId: z.string(),
        }),
      },
      responses: {
        200: {
          description: `Delete a ${config.entityName}`,
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId, entityId } = c.req.param();
      if (config.preDeleteEntity) {
        await config.preDeleteEntity(projectId, entityId);
      }

      const persistence = config.getPersistence(projectId);
      await persistence.delete(entityId);
      return c.body(null, 200);
    },
  );
};
