import { z } from "@hono/zod-openapi";
import { id, ProjectEntitySchema } from "./common";

export const ActionSchema = ProjectEntitySchema.extend({
  name: z.string().min(1, "Name needs to be at least 1 character long"),
  runOnce: z.boolean().default(false),
  delay: z.number().int("Delay needs to be a whole number").nonnegative("Delay needs to be a positive number"),
  template: id,
  events: z.array(id).min(1, "Select at least one event"),
  notevents: z.array(id).optional().default([]),
});

export const ActionSchemas = {
  create: ActionSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
  update: ActionSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
};
