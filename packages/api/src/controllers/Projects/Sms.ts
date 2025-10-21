import { createRoute, z } from "@hono/zod-openapi";
import { ProjectPersistence, SmsPersistence } from "@sendra/lib";
import {  SmsConfigSchema, SmsSchema } from "@sendra/shared";
import type { AppType } from "../../app";
import { registerProjectEntityReadRoutes } from "./ProjectEntity";
import { BearerAuth, isAuthenticatedProjectAdmin, isAuthenticatedProjectMemberOrSecretKey } from "api/src/middleware/auth";
import { NotFound } from "api/src/exceptions";
import { getProblemResponseSchema } from "api/src/exceptions/responses";

export const registerSmsRoutes = (app: AppType) => {
  registerProjectEntityReadRoutes(app, {
    entityPath: "sms",
    entityName: "Sms",
    embeddable: [],
    getSchema: SmsSchema,
    listQuerySchema: z.enum(["messageId", "source"]),
    getPersistence: (projectId: string) => new SmsPersistence(projectId),
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/projects/:projectId/sms-config",
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
          description: "Get SMS configuration",
        },
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      ...BearerAuth,
      middleware: [isAuthenticatedProjectAdmin],
      hide: true,
    }),
    async (c) => {
      const { projectId } = c.req.param();
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      return c.json(project.sms, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/projects/:projectId/sms-config",
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
          description: "Update SMS configuration",
          content: {
            "application/json": {
              schema: SmsConfigSchema,
            },
          },
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
      const { projectId } = c.req.param();
      const body = await c.req.json();
      const smsConfig = SmsConfigSchema.parse(body);
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.get(projectId);
      if (!project) {
        throw new NotFound("project");
      }
      const updatedProject = await projectPersistence.put({ ...project, sms: smsConfig });
      return c.json(updatedProject.sms, 200);
    },
  );
};
