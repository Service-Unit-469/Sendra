import { randomUUID } from "node:crypto";
import { createRoute, z } from "@hono/zod-openapi";
import { MembershipPersistence, ProjectPersistence, UserPersistence } from "@sendra/lib";
import { MembershipSchema, ProjectSchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectAdmin, isAuthenticatedProjectMember, isAuthenticatedProjectMemberOrSecretKey, isAuthenticatedUser } from "../../middleware/auth";

export const registerProjectCrudRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/projects",
      request: {},
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.array(ProjectSchemas.get),
            },
          },
          description: "Retrieve the user",
        },
      },
      ...BearerAuth,
      middleware: [isAuthenticatedUser],
      hide: true,
    }),
    async (c) => {
      const auth = c.get("auth");

      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.getUserMemberships(auth.sub);

      const projectPersistence = new ProjectPersistence();
      const projects = await projectPersistence.batchGet(memberships.map((membership) => membership.project));

      return c.json(projects.map((project) => ProjectSchemas.get.parse(project)));
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/projects/:projectId",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                project: ProjectSchemas.get,
              }),
            },
          },
          description: "Get a project",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMemberOrSecretKey],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const project = await new ProjectPersistence().get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      return c.json({ project }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/projects/:projectId/members",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                members: z.array(MembershipSchema),
              }),
            },
          },
          description: "Get a project",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      middleware: [isAuthenticatedProjectMember],
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const membershipPersistence = new MembershipPersistence();
      const members = await membershipPersistence.findAllBy({
        key: "project",
        value: projectId,
      });
      return c.json({ members }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/projects",
      request: {
        body: {
          content: {
            "application/json": {
              schema: ProjectSchemas.create,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                project: ProjectSchemas.get,
              }),
            },
          },
          description: "Create a project",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedUser],
      hide: true,
    }),
    async (c) => {
      const { name, url } = ProjectSchemas.create.parse(await c.req.json());
      const { sub: userId } = c.get("auth");

      const userPersistence = new UserPersistence();
      const user = await userPersistence.get(userId);
      if (!user) {
        throw new NotFound("user");
      }
      const project = await new ProjectPersistence().create({
        name,
        url,
        verified: false,
        secret: randomUUID(),
        public: randomUUID(),
      });
      await new MembershipPersistence().create({
        email: user.email,
        user: userId,
        project: project.id,
        role: "ADMIN",
      });
      return c.json({ project: ProjectSchemas.get.parse(project) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/projects/:projectId",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: ProjectSchemas.update,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                project: ProjectSchemas.get,
              }),
            },
          },
          description: "Update a project",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const projectId = c.req.param("projectId");
      const { name, url } = ProjectSchemas.update.parse(await c.req.json());
      const projectPersistence = new ProjectPersistence();
      let project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      project = await projectPersistence.put({ ...project, name, url });
      return c.json({ project: ProjectSchemas.get.parse(project) }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/projects/:projectId",
      responses: {
        200: {
          description: "Delete a project",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
        403: getProblemResponseSchema(403),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const projectId = c.req.param("projectId");
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      await projectPersistence.delete(projectId);
      return c.body(null, 200);
    },
  );
};
