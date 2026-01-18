import { z } from "@hono/zod-openapi";
import { BaseSchema, email, id } from "./common";

export const MembershipRoleSchema = z.enum(["MEMBER", "ADMIN"]).default("MEMBER");

export const MembershipSchema = BaseSchema.extend({
  email,
  user: id,
  project: id,
  role: MembershipRoleSchema,
});

export const MembershipSchemas = {
  invite: z.object({
    email,
    role: MembershipRoleSchema,
  }),
  kick: z.object({
    email,
  }),
};
