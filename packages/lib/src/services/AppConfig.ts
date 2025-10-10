import { z } from "zod";

const TTLSchema = z.union([z.number(), z.string().regex(/^\d+ (Y|W|D|H|M|s|Ms)$/)]);

const AuthConfigSchema = z
  .object({
    AUTH_ISSUER: z.string().default("sendra"),
    AUTH_TTL_SECRET: TTLSchema.default("90 D"),
    AUTH_TTL_PUBLIC: TTLSchema.default("265 D"),
    AUTH_TTL_USER: TTLSchema.default("2 H"),
    DISABLE_SIGNUPS: z.enum(["true", "false"]).default("false"),
  })
  .transform((env) => ({
    issuer: env.AUTH_ISSUER,
    ttl: {
      secret: env.AUTH_TTL_SECRET,
      public: env.AUTH_TTL_PUBLIC,
      user: env.AUTH_TTL_USER,
    },
    disableSignups: env.DISABLE_SIGNUPS === "true",
  }));
export const authConfig = AuthConfigSchema.parse(process.env);

const LogConfigSchema = z
  .object({
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    LOG_PRETTY: z.enum(["true", "false"]).default("false"),
  })
  .transform((env) => ({
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY === "true",
  }));
export const logConfig = LogConfigSchema.parse(process.env);

const EmailConfigSchema = z
  .object({
    APP_URL: z.url(),
    EMAIL_CONFIGURATION_SET_NAME: z.string(),
    DEFAULT_EMAIL: z.email(),
  })
  .transform((env) => ({
    appUrl: env.APP_URL,
    emailConfigurationSetName: env.EMAIL_CONFIGURATION_SET_NAME,
    defaultEmail: env.DEFAULT_EMAIL,
  }));

export const emailConfig = EmailConfigSchema.parse(process.env);
