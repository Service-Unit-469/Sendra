import { createRoute, z } from "@hono/zod-openapi";
import { ProjectPersistence, rootLogger } from "@sendra/lib";
import { IdentitySchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { Conflict, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectAdmin, isAuthenticatedProjectMember } from "../../middleware/auth";
import { getIdentityVerificationAttributes, verifyIdentity } from "../../util/ses";

const logger = rootLogger.child({
  module: "Identity",
});

export const registerProjectIdentityRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/projects/:projectId/identity",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ verified: z.boolean(), tokens: z.array(z.string()) }),
            },
          },
          description: "Get identity verification tokens",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        404: getProblemResponseSchema(404),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectMember],
      hide: true,
    }),
    async (c) => {
      const projectId = c.req.param("projectId");

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);

      if (!project) {
        throw new NotFound("project");
      }

      if (!project.email) {
        return c.json({ verified: false, tokens: [] }, 200);
      }

      const attributes = await getIdentityVerificationAttributes(project.email);

      if (attributes.status === "Success" && !project.verified) {
        logger.info({ projectId: project.id, email: project.email }, "Project verified");
        // Update project verification status in DynamoDB
        const updatedProject = {
          ...project,
          verified: true,
          updatedAt: new Date().toISOString(),
        };
        await projectPersistence.put(updatedProject);
      }

      return c.json({ verified: true, tokens: attributes.tokens ?? [] }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/projects/:projectId/identity",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: IdentitySchemas.create,
            },
          },
        },
      },
      body: {
        content: {
          "application/json": {
            schema: IdentitySchemas.create,
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ tokens: z.array(z.string()) }),
            },
          },
          description: "Create identity verification tokens",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
        409: getProblemResponseSchema(409),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const { email } = IdentitySchemas.create.parse(await c.req.json());
      const projectId = c.req.param("projectId");

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);

      if (!project) {
        throw new NotFound("project");
      }

      // Check if domain is already attached to another project
      const domain = email.split("@")[1];

      // Get all projects and check for domain conflicts

      const allProjects = await projectPersistence.listAll();
      const existingProject = allProjects.find((p) => p.email?.split("@")[1] === domain);

      if (existingProject) {
        throw new Conflict("Domain already attached to another project");
      }

      const tokens = await verifyIdentity(email);

      // Update project with email and verification status
      const updatedProject = {
        ...project,
        email,
        verified: false,
      };
      await projectPersistence.put(updatedProject);

      return c.json({ success: true, tokens: tokens ?? [] }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/projects/:projectId/identity",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          description: "Project identity reset",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
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

      // Reset project email and verification status in DynamoDB
      const updatedProject = {
        ...project,
        email: undefined,
        verified: false,
      };
      await projectPersistence.put(updatedProject);

      c.status(200);
      return c.body(null);
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/projects/:projectId/identity/update",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: IdentitySchemas.update,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean() }),
            },
          },
          description: "Update project identity",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { from } = IdentitySchemas.update.parse(body);
      const projectId = c.req.param("projectId");

      const _userId = c.get("auth").sub;

      const projectPersistence = new ProjectPersistence();
      let project = await projectPersistence.get(projectId);

      if (!project) {
        throw new NotFound("project");
      }

      // Update project from field
      project = await projectPersistence.put({
        ...project,
        from,
      });

      return c.json({ success: true, data: project }, 200);
    },
  );
};
