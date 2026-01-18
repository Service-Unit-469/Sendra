import { createRoute, z } from "@hono/zod-openapi";
import { getRateLimitConfig } from "@sendra/lib";
import { email, id, UserSchemas } from "@sendra/shared";
import type { AppType } from "../app";
import { getProblemResponseSchema } from "../exceptions/responses";
import { createRateLimitMiddleware } from "../middleware/rateLimit";
import { AuthService } from "../services/AuthService";

export const registerAuthRoutes = (app: AppType) => {
  const authRateLimitConfig = getRateLimitConfig();

  const authRateLimit = {
    maxRequests: authRateLimitConfig.authMaxRequests,
    windowMs: authRateLimitConfig.authWindowMs,
  };
  const criticalRateLimit = {
    maxRequests: authRateLimitConfig.authCriticalMaxRequests,
    windowMs: authRateLimitConfig.authCriticalWindowMs,
  };

  // default: 5 requests per 15 minutes (prevents brute force attacks)
  const rateLimitLogin = createRateLimitMiddleware(authRateLimit, "auth:login");
  const rateLimitReset = createRateLimitMiddleware(authRateLimit, "auth:reset");
  const rateLimitVerify = createRateLimitMiddleware(authRateLimit, "auth:verify");

  // default: 3 requests per hour
  const rateLimitSignup = createRateLimitMiddleware(criticalRateLimit, "auth:signup");
  const rateLimitRequestReset = createRateLimitMiddleware(criticalRateLimit, "auth:request-reset");

  // login
  app.openapi(
    createRoute({
      operationId: "login",
      method: "post",
      path: "/auth/login",
      request: {
        body: {
          content: {
            "application/json": {
              schema: UserSchemas.credentials,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({
                id,
                email,
                token: z.string(),
              }),
            },
          },
          description: "Retrieve the user",
        },
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
      },
      middleware: [rateLimitLogin],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { email, password } = UserSchemas.credentials.parse(body);
      const { id, token } = await AuthService.login({ email, password });
      return c.json(
        {
          id,
          email,
          token,
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      operationId: "signup",
      method: "post",
      path: "/auth/signup",
      request: {
        body: {
          content: {
            "application/json": {
              schema: UserSchemas.credentials,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: UserSchemas.get,
            },
          },
          description: "Retrieve the user",
        },
        400: getProblemResponseSchema(400),
      },
      middleware: [rateLimitSignup],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { email, password } = UserSchemas.credentials.parse(body);
      const user = await AuthService.signup({ email, password });

      return c.json(UserSchemas.get.parse(user), 200);
    },
  );

  app.openapi(
    createRoute({
      operationId: "request-reset",
      method: "post",
      path: "/auth/request-reset",
      request: {
        body: {
          content: {
            "application/json": {
              schema: UserSchemas.requestReset,
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
          description: "Reset the user's password",
        },
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [rateLimitRequestReset],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { email } = UserSchemas.requestReset.parse(body);

      await AuthService.requestReset({ email });

      return c.json({ success: true }, 200);
    },
  );

  app.openapi(
    createRoute({
      operationId: "reset",
      method: "post",
      path: "/auth/reset",
      request: {
        body: {
          content: {
            "application/json": {
              schema: UserSchemas.reset,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean(), user: UserSchemas.get }),
            },
          },
          description: "Reset the user's password",
        },
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [rateLimitReset],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { email, code, password } = UserSchemas.reset.parse(body);
      const user = await AuthService.resetPassword({ email, code, password });

      return c.json({ success: true, user: UserSchemas.get.parse(user) }, 200);
    },
  );

  app.openapi(
    createRoute({
      operationId: "verify",
      method: "post",
      path: "/auth/verify",
      request: {
        body: {
          content: {
            "application/json": {
              schema: UserSchemas.verify,
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean(), user: UserSchemas.get }),
            },
          },
          description: "Verify the user's email",
        },
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
      },
      middleware: [rateLimitVerify],
      hide: true,
    }),
    async (c) => {
      const body = await c.req.json();
      const { email, code } = UserSchemas.verify.parse(body);

      const user = await AuthService.verifyUser({ email, code });

      return c.json({ success: true, user: UserSchemas.get.parse(user) }, 200);
    },
  );
};
