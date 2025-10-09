import { createRoute, z } from "@hono/zod-openapi";
import { UserPersistence } from "@sendra/lib";
import { email, id, UserSchemas, UtilitySchemas } from "@sendra/shared";
import type { AppType } from "../app";
import { NotAllowed, NotFound } from "../exceptions";
import { getProblemResponseSchema, RedirectResponseSchema } from "../exceptions/responses";
import { AuthService } from "../services/AuthService";
import { createHash } from "../util/hash";

export const registerAuthRoutes = (app: AppType) => {
  // login
  app.openapi(
    createRoute({
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
        302: RedirectResponseSchema,
        401: getProblemResponseSchema(401),
      },
      middleware: [],
    }),
    async (c) => {
      const { email, id, token } = await AuthService.login(c);
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
    }),
    async (c) => {
      const user = await AuthService.signup(c);

      return c.json(UserSchemas.get.parse(user), 200);
    },
  );

  const resetSchema = UtilitySchemas.id.merge(UserSchemas.credentials.pick({ password: true }));
  app.openapi(
    createRoute({
      method: "post",
      path: "/auth/reset",
      request: {
        body: {
          content: {
            "application/json": {
              schema: resetSchema,
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
    }),
    async (c) => {
      const body = await c.req.json();
      const { id, password } = resetSchema.parse(body);
      const userPersistence = new UserPersistence();
      const user = await userPersistence.get(id);

      if (!user) {
        throw new NotFound("user");
      }

      if (user.password) {
        throw new NotAllowed();
      }

      const updatedUser = {
        ...user,
        password: await createHash(password),
      };
      await userPersistence.put(updatedUser);

      return c.json({ success: true }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/auth/logout",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean() }),
            },
          },
          description: "Logout the user",
        },
      },
    }),
    async (c) => {
      await AuthService.logout(c);
      return c.json({ success: true }, 200);
    },
  );
};
