import { z } from "@hono/zod-openapi";
import { email, id, ProjectEntitySchema, SEND_TYPES } from "./common";

export const EmailStatusSchema = z.enum(["QUEUED", "SENT", "REJECTED", "DELIVERED", "OPENED", "COMPLAINT", "BOUNCED"]);

export const EmailSchema = ProjectEntitySchema.extend({
  messageId: z.string().optional(),
  source: id.optional(),
  sourceType: z.enum(["ACTION", "CAMPAIGN"]).optional(),
  contact: id,
  email,
  subject: z.string(),
  body: z.object({
    html: z.string(),
    plainText: z.string().optional(),
  }),
  sendType: z.enum(SEND_TYPES).default(SEND_TYPES[0]),
  status: EmailStatusSchema,
});
