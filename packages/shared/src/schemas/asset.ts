import { z } from "@hono/zod-openapi";
import { ProjectEntitySchema } from "./common";

export const ASSET_TYPES = ["IMAGE", "ATTACHMENT"] as const;

export const AssetSchema = ProjectEntitySchema.omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name can't be empty").max(255, "Name needs to be less than 255 characters"),
  size: z.number().int().positive("Size must be positive"),
  mimeType: z.string().min(1, "MIME type can't be empty"),
  url: z.url("Must be a valid URL"),
  updatedAt: z.date().optional(),
});

export const AssetSchemas = {
  create: AssetSchema.omit({
    id: true,
    updatedAt: true,
    project: true,
  }),
  update: AssetSchema.omit({
    updatedAt: true,
    project: true,
  })
    .partial()
    .extend({
      id: z.string(),
    }),
  uploadUrl: z.object({
    name: z.string().min(1, "File name can't be empty"),
    size: z.number().int().positive("File size must be positive"),
    mimeType: z.string().min(1, "MIME type can't be empty"),
  }),
};
