import { z } from "@hono/zod-openapi";
import { BodySchema, email, id, ProjectEntitySchema } from "./common";

export const CampaignSchema = ProjectEntitySchema.extend({
  subject: z.string().min(1, "Subject needs to be at least 1 character long").max(70, "Subject needs to be less than 70 characters long"),

  email: email.optional().or(z.literal("")),
  from: z.string().optional(),
  recipients: z.array(id),
  groups: z.array(id).optional(),
  template: id,
  body: BodySchema,
  status: z.enum(["DRAFT", "DELIVERED"]).default("DRAFT"),
});

export const CampaignSchemas = {
  send: z.object({
    live: z.boolean().default(false),
    delay: z.number().int("Delay needs to be a whole number").nonnegative("Delay needs to be a positive number"),
  }),
  create: CampaignSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
  update: CampaignSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
};
