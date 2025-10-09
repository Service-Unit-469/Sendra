import z from "zod";
import { BaseSchema, email, id } from "./common";

export const ProjectSchema = BaseSchema.extend({
  id,
  name: z.string().min(1, "Name can't be empty"),
  email: email.optional(),
  from: z.string().optional(),
  verified: z.boolean().default(false),
  secret: z.string(),
  public: z.string(),
  url: z.url(),
});

export const ProjectKeysSchema = z.object({
  secret: z.string(),
  public: z.string(),
});

export const PublicProjectSchema = ProjectSchema.omit({
  secret: true,
  public: true,
});

export const ProjectSchemas = {
  secret: z.object({
    secret: z.string(),
  }),
  get: PublicProjectSchema,
  create: PublicProjectSchema.pick({
    name: true,
    url: true,
  }),
  update: PublicProjectSchema.pick({
    name: true,
    url: true,
    id: true,
  }),
  analytics: z.object({
    method: z.enum(["week", "month", "year"]).default("week"),
  }),
};

export const IdentitySchemas = {
  create: z.object({
    email: email.refine(
      (e) => {
        return !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(e.split("@")[1]);
      },
      { message: "Please use your own domain" },
    ),
  }),
  update: z.object({
    from: z.string(),
  }),
};
