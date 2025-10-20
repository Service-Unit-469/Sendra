import z from "zod";
import { BaseSchema, email, id } from "./common";
import { ConfigurationSetArnSchema, PoolArnSchema } from "./sms";

export const IdentitySchema = z.object({
  identityType: z.enum(["email", "domain"]).default("email"),
  identity: z.string(),
  mailFromDomain: z.string().optional(),
  verified: z.boolean().default(false),
});

export const DisabledSmsConfigSchema = z.object({
  enabled: z.literal(false),
});

export const EnabledSmsConfigSchema = z.object({
  enabled: z.literal(true),
  configurationSetArn: ConfigurationSetArnSchema,
  poolArn: PoolArnSchema,
  phoneKey: z.string().min(1, "Phone key can't be empty"),
});

export const SmsConfigSchema = z.discriminatedUnion("enabled", [DisabledSmsConfigSchema, EnabledSmsConfigSchema]);

export const ProjectSchema = BaseSchema.extend({
  id,
  email: email.optional(),
  eventTypes: z.array(z.string()).default([]),
  from: z.string().optional(),
  identity: IdentitySchema.optional(),
  name: z.string().min(1, "Name can't be empty"),
  public: z.string(),
  secret: z.string(),
  sms: SmsConfigSchema.optional().default({ enabled: false }),
  url: z.url(),
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
