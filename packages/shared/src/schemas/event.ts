import z from "zod";
import {
  DataSchema,
  email,
  id,
  ProjectEntitySchema,
  subscribed,
} from "./common";

export const EventSchema = ProjectEntitySchema.extend({
  eventType: id,
  contact: id,
  relationType: z.enum(["ACTION", "CAMPAIGN"]).optional(),
  relation: id.optional(),
  email: id.optional(),
  data: DataSchema.optional(),
});

export const EventSchemas = {
  create: EventSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
  update: EventSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
  track: z.object({
    email,
    subscribed,
    event: z
      .string()
      .transform((n) => n.toLowerCase())
      .transform((n) => n.replace(/ /g, "-")),
    data: DataSchema.optional(),
    transientData: DataSchema.optional(),
  }),
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
        })
      )
      .max(5, "You can only include up to 5 attachments")
      .optional(),
  }),
};

export const EventTypeSchema = ProjectEntitySchema.extend({
  name: z.string().min(1, "Name needs to be at least 1 character long"),
});
