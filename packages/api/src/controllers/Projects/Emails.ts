import { z } from "@hono/zod-openapi";
import { EmailPersistence } from "@service-unit-469/sendra-lib";
import { EmailSchema } from "@service-unit-469/sendra-shared";
import type { AppType } from "../../app";
import { registerProjectEntityReadRoutes } from "./ProjectEntity";

export const registerEmailsRoutes = (app: AppType) => {
  registerProjectEntityReadRoutes(app, {
    entityPath: "emails",
    entityName: "Email",
    embeddable: [],
    getSchema: EmailSchema,
    listQuerySchema: z.enum(["contact", "messageId", "source"]),
    getPersistence: (projectId: string) => new EmailPersistence(projectId),
  });
};
