import { randomUUID } from "node:crypto";
import { createRoute, z } from "@hono/zod-openapi";
import { ProjectPersistence } from "@sendra/lib";
import type { AppType } from "../../app";
import { NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectAdmin } from "../../middleware/auth";
import { AuthService } from "../../services/AuthService";

const keysResponse = z.object({
  secret: z.string(),
  public: z.string(),
});

export const registerProjectKeysRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      method: "post",
      path: "/projects/:projectId/keys",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: keysResponse,
            },
          },
          description: "Regenerate the project's API keys",
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

      const secretKey = randomUUID();
      const publicKey = randomUUID();

      // Update project keys
      await projectPersistence.put({
        ...project,
        secret: secretKey,
        public: publicKey,
      });

      const secret = AuthService.createProjectToken(secretKey, "secret", projectId);
      const publicToken = AuthService.createProjectToken(publicKey, "public", projectId);

      return c.json({ secret, public: publicToken }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/projects/:projectId/keys",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: keysResponse,
            },
          },
          description: "Get the project's API keys",
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

      const secret = AuthService.createProjectToken(project.secret, "secret", projectId);
      const publicToken = AuthService.createProjectToken(project.public, "public", projectId);

      return c.json({ secret, public: publicToken }, 200);
    },
  );
};
