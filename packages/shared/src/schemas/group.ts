import { z } from "@hono/zod-openapi";
import { id, ProjectEntitySchema } from "./common";

export const GroupSchema = ProjectEntitySchema.extend({
  name: z.string().min(1, "Name can't be empty"),
  contacts: z.array(id),
});

export const GroupSchemas = {
  create: GroupSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
  update: GroupSchema.omit({
    createdAt: true,
    updatedAt: true,
    project: true,
  }),
};
