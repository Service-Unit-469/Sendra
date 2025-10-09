import { z } from "@hono/zod-openapi";

export const email = z.email();

export const id = z.string();

export const subscribed = z.boolean().optional();

export const UtilitySchemas = {
  id: z.object({
    id,
  }),
  email: z.object({
    email,
  }),
  pagination: z.object({
    cursor: z.string().optional(),
  }),
  projectId: z.object({
    projectId: id,
  }),
  projectAndId: z.object({
    projectId: id,
    id,
  }),
};

export const BaseSchema = z.object({
  id,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProjectEntitySchema = BaseSchema.extend({
  project: z.string(),
});

export const SEND_TYPES = ["MARKETING", "TRANSACTIONAL"] as const;

export const TEMPLATE_STYLES = ["SIMPLE", "HTML"] as const;

export const DataSchema = z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number(), z.boolean(), z.null()]));
