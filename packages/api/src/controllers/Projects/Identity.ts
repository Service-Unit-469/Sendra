import { VerificationStatus } from "@aws-sdk/client-ses";
import { createRoute, z } from "@hono/zod-openapi";
import { getEmailConfig, ProjectPersistence, rootLogger } from "@sendra/lib";
import { IdentitySchema, IdentitySchemas, ProjectSchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { Conflict, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectAdmin, isAuthenticatedProjectMember } from "../../middleware/auth";
import { getIdentityVerificationAttributes, verifyIdentity } from "../../services/SesService";

const logger = rootLogger.child({
  module: "Identity",
});

export const registerProjectIdentityRoutes = (app: AppType) => {
  const emailConfig = getEmailConfig();
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
              schema: z.object({
                identity: IdentitySchema.optional(),
                status: z.enum(["Pending", "Success", "Failed", "TemporaryFailure", "NotStarted"]),
                dkimTokens: z.array(z.string()).optional(),
                dkimEnabled: z.boolean().optional(),
              }),
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

      if (!project.identity) {
        logger.warn({ projectId: project.id }, "Project identity not found");
        return c.json({ identity: project.identity, status: VerificationStatus.NotStarted }, 200);
      }

      const attributes = await getIdentityVerificationAttributes(project.identity);

      if (attributes.status === VerificationStatus.Success && !project.identity.verified) {
        logger.info({ projectId: project.id, email: project.email }, "Project verified");
        // Update project verification status
        const updatedProject = {
          ...project,
          identity: { ...project.identity, verified: true },
        };
        await projectPersistence.put(updatedProject);
      }

      return c.json(
        {
          identity: project.identity,
          status: attributes.status,
          dkimTokens: attributes.dkimTokens,
          dkimEnabled: attributes.dkimEnabled,
        },
        200,
      );
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
              schema: IdentitySchemas.verify,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ dkimTokens: z.array(z.string()).optional() }),
            },
          },
          description: "Verify identity",
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
      const toVerify = IdentitySchemas.verify.parse(await c.req.json());
      const projectId = c.req.param("projectId");

      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);

      if (!project) {
        throw new NotFound("project");
      }

      // Check if domain is already attached to another project
      const domain = toVerify.identity.split("@")[1];

      // Get all projects and check for domain conflicts

      const allProjects = await projectPersistence.listAll();
      const existingProject = allProjects.filter((p) => p.identity).find((p) => p.identity?.identity === toVerify.identity || p.identity?.identity === domain);

      if (existingProject && !emailConfig.allowDuplicateProjectIdentities) {
        logger.warn({ requestingProject: project, existingProject }, "Domain already attached to another project");
        throw new Conflict("Domain already attached to another project");
      }

      const tokens = await verifyIdentity(toVerify);

      // Update project with email and verification status
      const updatedProject = {
        ...project,
        identity: { ...toVerify, verified: false },
      };
      await projectPersistence.put(updatedProject);

      return c.json({ dkimTokens: tokens }, 200);
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
      path: "/projects/:projectId/identity",
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
              schema: ProjectSchemas.get,
            },
          },
          description: "Update project sending information",
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
      const { from, email } = IdentitySchemas.update.parse(body);
      const projectId = c.req.param("projectId");

      const projectPersistence = new ProjectPersistence();
      let project = await projectPersistence.get(projectId);

      if (!project) {
        throw new NotFound("project");
      }

      // Update project from field
      project = await projectPersistence.put({
        ...project,
        from,
        email,
      });

      return c.json(ProjectSchemas.get.parse(project), 200);
    },
  );
};
