import { z } from "@hono/zod-openapi";
import { BodySchema, email, id, ProjectEntitySchema } from "./common";

/** Max queue error rows stored on the campaign (newest retained when exceeded). */
export const CAMPAIGN_QUEUE_ERROR_LOG_MAX = 50;

export const CampaignQueueErrorEntrySchema = z.object({
  contact: id,
  message: z.string().max(500),
});

export const CampaignStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  /** Count of recipients that failed during queue (missing contact, create, or enqueue). */
  errors: z.number().int().nonnegative(),
  /** Per-recipient failure messages; capped at CAMPAIGN_QUEUE_ERROR_LOG_MAX newest. */
  errorDetails: z.array(CampaignQueueErrorEntrySchema).default([]),
});

export const CampaignSchema = ProjectEntitySchema.extend({
  subject: z.string().min(1, "Subject needs to be at least 1 character long").max(70, "Subject needs to be less than 70 characters long"),

  email: email.optional().or(z.literal("")),
  from: z.string().optional(),
  recipients: z.array(id),
  groups: z.array(id).optional(),
  template: id,
  body: BodySchema,
  status: z.enum(["DRAFT", "DELIVERED"]).default("DRAFT"),
  stats: CampaignStatsSchema.default({ total: 0, sent: 0, delivered: 0, opened: 0, errors: 0, errorDetails: [] }),
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
    stats: true,
  }),
  update: CampaignSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
    stats: true,
  }),
};
