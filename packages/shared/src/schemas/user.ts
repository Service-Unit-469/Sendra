import { z } from "@hono/zod-openapi";
import { BaseSchema, email } from "./common";

export const password = z.string().min(6, "Password needs to be at least 6 characters long");

export const UserSchema = BaseSchema.extend({
  enabled: z.boolean().default(false),
  code: z.string().optional(),
  email,
  password: z.string().optional(),
});

export const UserSchemas = {
  credentials: z.object({ email, password }),
  get: UserSchema.omit({ password: true, code: true }),
  requestReset: UserSchema.pick({ email: true }),
  reset: z.object({ email, code: z.string(), password }),
  verify: z.object({ email, code: z.string() }),
};
