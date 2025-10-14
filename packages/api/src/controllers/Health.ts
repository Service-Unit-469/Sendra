import { createRoute, z } from "@hono/zod-openapi";
import type { AppType } from "../app";

export const registerHealthRoutes = (app: AppType) => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/health",
      responses: {
        200: {
          content: {
            "application/json": {
              schema: z.object({ success: z.boolean() }),
            },
          },
          description: "Health check",
        },
      },
      hide: true,
    }),
    async (c) => {
      return c.json({ success: true }, 200);
    },
  );
};
