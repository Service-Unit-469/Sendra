import z from "zod";
import { email, id, ProjectEntitySchema, SEND_TYPES, subscribed } from "./common";

export const EmailStatusSchema = z.enum(["QUEUED", "SENT", "REJECTED", "DELIVERED", "OPENED", "COMPLAINT", "BOUNCED"]);

export const EmailSchema = ProjectEntitySchema.extend({
  messageId: z.string().optional(),
  source: id.optional(),
  sourceType: z.enum(["ACTION", "CAMPAIGN"]).optional(),
  contact: id,
  email,
  subject: z.string(),
  body: z.string(),
  sendType: z.enum(SEND_TYPES).default(SEND_TYPES[0]),
  status: EmailStatusSchema,
});


export const EmailSchemas = {
  send: z.object({
    subscribed: subscribed,
    from: email.optional(),
    name: z.string().optional(),
    reply: email.optional(),
    to: z
      .array(email)
      .max(5, "You can only send transactional emails to 5 people at a time")
      .or(email.transform((e) => [e])),
    subject: z.string(),
    body: z.string(),
    headers: z.record(z.string(), z.string()).nullish(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          content: z.string(), // Base64 encoded content
          contentType: z.string(),
        }),
      )
      .max(5, "You can only include up to 5 attachments")
      .optional(),
  }),
};