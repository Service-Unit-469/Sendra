import { existsSync, readFileSync } from "fs";
import { Input } from "../.sst/platform/src/components/input";
import { z } from "zod";

export const TTLSchema = z.string().regex(/^\d+ (Y|W|D|H|M|s|Ms)$/);

export const EnvironmentSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_PRETTY: z.enum(["true", "false"]).default("false"),
  DEFAULT_EMAIL: z.email(),
  EMAIL_CONFIGURATION_SET_NAME: z.string(),
  APP_URL: z.url(),
  AUTH_ISSUER: z.string().default("sendra"),
  AUTH_TTL_SECRET: TTLSchema.default("90 D"),
  AUTH_TTL_PUBLIC: TTLSchema.default("265 D"),
  AUTH_TTL_USER: TTLSchema.default("2 H"),
  DISABLE_SIGNUPS: z.enum(["true", "false"]).default("false"),
});

export const getEnvironment = (name: string): Input<Record<string, Input<string>>> => {
  if(existsSync(`.env.${name}.json`)) {
    console.log(`[${name}] Using .env.${name}.json`);
    return EnvironmentSchema.parse(JSON.parse(readFileSync(`.env.${name}.json`, "utf8")));
  }
  console.log(`[${name}] Using .env.json`);
  return EnvironmentSchema.parse(JSON.parse(readFileSync(".env.json", "utf8")));
};
