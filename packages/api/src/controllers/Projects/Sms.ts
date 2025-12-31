import { createRoute, z } from "@hono/zod-openapi";
import { zValidator } from "@hono/zod-validator";
import { ProjectPersistence } from "@sendra/lib";
import { SmsConfigSchema } from "@sendra/shared";
import type { AppType } from "../../app";
import { BadRequest, NotFound } from "../../exceptions";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectAdmin, isAuthenticatedProjectMember } from "../../middleware/auth";

export const registerProjectSmsRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      tags: ["Project", "Sms"],
      operationId: "get-project-sms-config",
      method: "get",
      path: "/projects/{projectId}/sms",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: SmsConfigSchema,
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

      return c.json(project.sms ?? { enabled: false, groupSize: 20 }, 200);
    },
  );

  app.openapi(
    createRoute({
      tags: ["Project", "Sms"],
      operationId: "update-project-sms-config",
      method: "put",
      path: "/projects/{projectId}/sms",
      request: {
        params: z.object({
          projectId: z.string(),
        }),
        body: {
          content: {
            "application/json": {
              schema: SmsConfigSchema,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: SmsConfigSchema,
            },
          },
          description: "Update project SMS config",
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
        409: getProblemResponseSchema(409),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin, zValidator("json", SmsConfigSchema)],
      hide: true,
    }),
    async (c) => {
      const json = await c.req.json();
      const parsed = SmsConfigSchema.safeParse(json);
      if (!parsed.success) {
        throw new BadRequest(parsed.error.issues[0].message);
      }
      const { data: sms } = parsed;
      const projectId = c.req.param("projectId");
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      await projectPersistence.put({ ...project, sms });
      return c.json(SmsConfigSchema.parse(sms), 200);
    },
  );
};
