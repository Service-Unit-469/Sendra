import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
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
export const getAuthConfig = () => AuthConfigSchema.parse(process.env);

const LogConfigSchema = z
  .object({
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    LOG_PRETTY: z.enum(["true", "false"]).default("false"),
  })
  .transform((env) => ({
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY === "true",
  }));
export const getLogConfig = () => LogConfigSchema.parse(process.env);

const EmailConfigSchema = z
  .object({
    ALLOW_DUPLICATE_PROJECT_IDENTITIES: z.enum(["true", "false"]).default("false"),
    APP_URL: z.url(),
    DEFAULT_EMAIL: z.email(),
    EMAIL_CONFIGURATION_SET_NAME: z.string(),
  })
  .transform((env) => ({
    allowDuplicateProjectIdentities: env.ALLOW_DUPLICATE_PROJECT_IDENTITIES === "true",
    appUrl: env.APP_URL,
    defaultEmail: env.DEFAULT_EMAIL,
    emailConfigurationSetName: env.EMAIL_CONFIGURATION_SET_NAME,
  }));

export const getEmailConfig = () => EmailConfigSchema.parse(process.env);

const PersistenceConfigSchema = z.object({
  TABLE_NAME: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_ENDPOINT: z.string().optional(),
  PERSISTENCE_PROVIDER: z.enum(["local", "sst"]).default("sst"),
});

export const getPersistenceConfig = () => {
  const config = PersistenceConfigSchema.parse(process.env);
  if (config.PERSISTENCE_PROVIDER === "local") {
    if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY || !config.TABLE_NAME) {
      throw new Error("TABLE_NAME,AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when PERSISTENCE_PROVIDER is local");
    }
    return {
      tableName: config.TABLE_NAME,
      client: new DynamoDBClient({
        region: config.AWS_REGION,
        endpoint: config.AWS_ENDPOINT,
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        },
      }),
    };
  }
  return {
    client: new DynamoDBClient(),
    tableName: Resource.SendraDatabase.name,
  };
};

const SmsConfigSchema = z.object({
  SMS_ENABLED: z.enum(["true", "false"]).default("false"),
}).transform((env) => ({
  enabled: env.SMS_ENABLED === "true",
}));

export const getSmsConfig = () => SmsConfigSchema.parse(process.env);