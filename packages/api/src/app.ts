import { randomUUID } from "node:crypto";
import { OpenAPIHono } from "@hono/zod-openapi";
import { getEmailConfig, getRequestCapacityUsed, rootLogger, setRequestCapacityUsed, setRequestInfo, withMetrics } from "@sendra/lib";
import { Unit } from "aws-embedded-metrics";
import type { Context, Next } from "hono";
import { handle } from "hono/aws-lambda";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { createMiddleware } from "hono/factory";
import { pinoLogger } from "hono-pino";
import { registerAuthRoutes } from "./controllers/Auth";
import { registerHealthRoutes } from "./controllers/Health";
import { registerProjectRoutes } from "./controllers/Projects";
import { registerMembershipsRoutes } from "./controllers/Projects/Members";
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
  rootLogger.error({ err: error, message: error.message }, "Error handling request");
  return sendProblem(c, error);
});
app.use(
  "*",
  createMiddleware((c: Context, next: Next) => {
    const requestId = c.req.header("x-request-id") ?? randomUUID();
    const correlationId = c.req.header("x-correlation-id") ?? randomUUID();
    return new Promise<void>((resolve) =>
      setRequestInfo({ requestId, correlationId }, async () => {
        await next();
        resolve();
      }),
    );
  }),
);

app.use("*", (c: Context, next: Next) => {
  const promise = new Promise<void>((resolve) =>
    setRequestCapacityUsed({ used: 0 }, async () =>
      withMetrics(
        async (metricsLogger) => {
          metricsLogger.setProperty("Method", c.req.method);
          metricsLogger.setProperty("Path", c.req.path);

          await next();
          const { used } = getRequestCapacityUsed();
          metricsLogger.putMetric("CapacityUsed", used, Unit.Count);
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

// Allow OPTIONS requests for all routes since we are using API Gateway to handle CORS
app.options("*", (c) => c.body(null));

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
  servers: [
    {
      url: `${getEmailConfig().appUrl}/api/v1`,
    },
  ],
});

export const handler = handle(app);
