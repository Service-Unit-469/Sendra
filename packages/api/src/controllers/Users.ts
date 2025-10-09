import { createRoute } from "@hono/zod-openapi";
import { UserPersistence } from "@sendra/lib";
import { UserSchemas } from "@sendra/shared";
import type { AppType } from "../app";
import { NotAuthenticated } from "../exceptions";
import { isAuthenticatedUser } from "../middleware/auth";

export function registerUserRoutes(app: AppType) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/@me",
      request: {},
      responses: {
        200: {
          content: {
            "application/json": {
              schema: UserSchemas.get,
            },
          },
          description: "Retrieve the user",
        },
      },
      middleware: [isAuthenticatedUser],
    }),

    async (c) => {
      const auth = c.get("auth");

      const userPersistence = new UserPersistence();
      const me = await userPersistence.get(auth.sub);

      if (!me) {
        throw new NotAuthenticated();
      }

      return c.json(UserSchemas.get.parse(me));
    },
  );
}
