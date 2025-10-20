import z from "zod";
import { id, ProjectEntitySchema, SEND_TYPES } from "./common";

export const SmsStatusSchema = z.enum(["QUEUED", "SENT", "REJECTED", "DELIVERED", "OPENED", "COMPLAINT", "BOUNCED"]);

export const PoolArnSchema = z.string().regex(/^arn:aws:sms-voice:.*:.*:pool\/.*$/, "Invalid pool ARN");
export const ConfigurationSetArnSchema = z.string().regex(/^arn:aws:sms-voice:.*:.*:configuration-set\/.*$/, "Invalid configuration set ARN");

export const SmsSchema = ProjectEntitySchema.extend({
  messageId: z.string().optional(),
  source: id.optional(),
  sourceType: z.enum(["ACTION", "CAMPAIGN"]).optional(),
  contact: id,
  phone: z.string().min(10, "Phone number can't be empty"),
  body: z.string().min(1, "Body can't be empty").max(160, "Body can't be more than 160 characters long"),
  sendType: z.enum(SEND_TYPES).default(SEND_TYPES[0]),
  status: SmsStatusSchema,
});

export const SmsSchemas = {
  create: SmsSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
  }),

  update: SmsSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
  }),

  send: SmsSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
    messageId: true,
    source: true,
    sourceType: true,
    sendType: true,
    status: true,
  }),

  updateConfig: z.object({
    enabled: z.boolean(),
    configurationSetArn: ConfigurationSetArnSchema.optional(),
    poolArn: PoolArnSchema.optional(),
    phoneKey: z.string().min(1, "Phone key can't be empty").optional(),
  }),
};
