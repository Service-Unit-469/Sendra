import z from "zod";
import { BaseSchema, email, id } from "./common";

export const IdentitySchema = z.object({
  identityType: z.enum(["email", "domain"]).default("email"),
  identity: z.string(),
  mailFromDomain: z.string().optional(),
  verified: z.boolean().default(false),
});

export const ProjectSchema = BaseSchema.extend({
  id,
  email: email.optional(),
  eventTypes: z.array(z.string()).default([]),
  from: z.string().optional(),
  identity: IdentitySchema.optional(),
  name: z.string().min(1, "Name can't be empty"),
  public: z.string(),
  secret: z.string(),
  url: z.url(),
  colors: z.array(z.string()).default([]),
});

export const ProjectKeysSchema = z.object({
  secret: z.string(),
  public: z.string(),
});

export const PublicProjectSchema = ProjectSchema.omit({
  secret: true,
  public: true,
  identity: true,
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
    colors: true,
  }),
  analytics: z.object({
    method: z.enum(["week", "month", "year"]).default("week"),
  }),
};

export const IdentitySchemas = {
  verify: IdentitySchema.omit({
    verified: true,
  }),
  update: z.object({
    from: z.string(),
    email,
  }),
};
