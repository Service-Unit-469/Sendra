import z from "zod";
import { email, id, ProjectEntitySchema, SEND_TYPES } from "./common";

export const EmailStatusSchema = z.enum(["QUEUED", "SENT", "REJECTED", "DELIVERED", "OPENED", "COMPLAINT", "BOUNCED"]);

export const EmailSchema = ProjectEntitySchema.extend({
  messageId: z.string(),
  source: id.optional(),
  sourceType: z.enum(["ACTION", "CAMPAIGN"]).optional(),
  contact: id,
  email,
  subject: z.string(),
  body: z.string(),
  sendType: z.enum(SEND_TYPES).default(SEND_TYPES[0]),
  status: EmailStatusSchema,
});
