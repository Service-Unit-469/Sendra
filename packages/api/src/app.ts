import { randomUUID } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { rootLogger, setRequestInfo, withMetrics } from "@sendra/lib";
import { Unit } from "aws-embedded-metrics";
import type { Context, Next } from "hono";
import { handle } from "hono/aws-lambda";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { pinoLogger } from "hono-pino";
import { registerAuthRoutes } from "./controllers/Auth";
import { registerHealthRoutes } from "./controllers/Health";
import { registerMembershipsRoutes } from "./controllers/Memberships";
import { registerProjectRoutes } from "./controllers/Projects";
import { registerSubscriberRoutes } from "./controllers/Subscriber";
import { registerUserRoutes } from "./controllers/Users";
import { sendProblem } from "./exceptions/responses";
import { errorWrapper } from "./middleware/error";
import type { Auth } from "./services/AuthService";

export type AppType = OpenAPIHono<{
  Variables: {
    auth: Auth;
  };
}>;

export const app = new OpenAPIHono<{
  Variables: {
    auth: Auth;
  };
}>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return sendProblem(c, result.error, 400);
    }
  },
}).basePath("/api/v1");

app.onError((error, c) => {
  rootLogger.error({ error, message: error.message }, "Error handling request");
  return sendProblem(c, error);
});
app.use(
  "*",
  createMiddleware((c: Context, next: Next) => {
    const requestId = c.req.header("x-request-id") ?? randomUUID();
    const correlationId = c.req.header("x-correlation-id") ?? randomUUID();
    const promise = new Promise<void>((resolve) =>
      setRequestInfo({ requestId, correlationId }, async () => {
        await next();
        resolve();
      }),
    );
    return promise;
  }),
);
app.use("*", (c: Context, next: Next) => {
  const promise = new Promise<void>((resolve) =>
    withMetrics(
      async (metricsLogger) => {
        metricsLogger.setProperty("Method", c.req.method);
        metricsLogger.setProperty("Path", c.req.path);
        await next();
        resolve();
        if (c.res.status >= 200 && c.res.status < 300) {
          metricsLogger.putMetric("ApiSuccess", 1, Unit.Count);
        } else {
          metricsLogger.putMetric("ApiStatusCode", c.res.status, Unit.Count);
          metricsLogger.putMetric("ApiError", 1, Unit.Count);
        }
      },
      {
        Operation: "ApiRequest",
        Method: c.req.method,
      },
    ),
  );
  return promise;
});
app.use(
  pinoLogger({
    pino: rootLogger.child({
      module: "api",
    }),
  }),
);
app.use(
  "*",
  bodyLimit({
    maxSize: 1024 * 1024 * 10,
  }),
);
app.use("*", compress());

app.use("*", errorWrapper);

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Correlation-Id"],
    credentials: true,
  }),
);

registerUserRoutes(app);
registerAuthRoutes(app);
registerHealthRoutes(app);
registerMembershipsRoutes(app);
registerProjectRoutes(app);
registerSubscriberRoutes(app);

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Sendra API",
  },
});

export const handler = handle(app);
