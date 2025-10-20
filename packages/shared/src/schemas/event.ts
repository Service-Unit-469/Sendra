import z from "zod";
import { DataSchema, email, id, ProjectEntitySchema, subscribed } from "./common";

export const EventSchema = ProjectEntitySchema.extend({
  eventType: z.string().min(1, "Event type can't be empty"),
  contact: id,
  relationType: z.enum(["ACTION", "CAMPAIGN"]).optional(),
  relation: id.optional(),
  email: id.optional(),
  data: z.record(z.string(), z.any()).optional(),
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
};
