import { z } from "@hono/zod-openapi";
import { BaseSchema, email, id } from "./common";

export const IdentitySchema = z.object({
  identityType: z.enum(["email", "domain"]).default("email"),
  identity: z.string(),
  mailFromDomain: z.string().optional(),
  verified: z.boolean().default(false),
});

export const SmsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  phoneField: z.string().optional(),
  groupSize: z.number().int().positive("Group size must be a positive number").default(20),
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
  sms: SmsConfigSchema.optional(),
  url: z.url(),
  colors: z.array(z.string()).default([]),
  contactDataSchema: z.string().optional(),
});

export const ProjectKeysSchema = z.object({
  secret: z.string(),
  public: z.string(),
});

export const PublicProjectSchema = ProjectSchema.omit({
  identity: true,
  public: true,
  secret: true,
  sms: true,
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
    contactDataSchema: true,
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
