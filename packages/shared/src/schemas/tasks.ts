import { z } from "@hono/zod-openapi";
import { id } from "./common";

export const baseTaskSchema = z.object({
  type: z.string(),
  delaySeconds: z.number().optional(),
  payload: z.record(z.string(), z.any()),
});

export const BatchDeleteRelatedPayloadSchema = z.object({
  type: z.enum(["PROJECT", "USER"]),
  id,
});

export const BatchDeleteRelatedSchema = baseTaskSchema.extend({
  type: z.literal("batchDeleteRelated"),
  payload: BatchDeleteRelatedPayloadSchema,
});

export const QueueCampaignTaskSchema = baseTaskSchema.extend({
  type: z.literal("queueCampaign"),
  payload: z.object({
    campaign: id,
    delay: z.number().optional(),
    project: id,
  }),
});

export const SendEmailTaskSchema = baseTaskSchema.extend({
  type: z.literal("sendEmail"),
  payload: z.object({
    email: id.optional(),
    action: id.optional(),
    campaign: id.optional(),
    contact: id,
    project: id,
  }),
});

export const TaskSchema = z.discriminatedUnion("type", [BatchDeleteRelatedSchema, QueueCampaignTaskSchema, SendEmailTaskSchema]);
