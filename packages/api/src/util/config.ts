import type { Context } from "hono";
import { z } from "zod";

const appConfigSchema = z.object({
  APP_URL: z.url().optional(),
});

export const getAppUrl = (c: Context) => {
  const { APP_URL } = appConfigSchema.parse(process.env);
  if (APP_URL) {
    return APP_URL;
  }
  const forwardedHost = c.req.header("x-forwarded-host");
  const forwardedProtocol = c.req.header("x-forwarded-proto");
  const forwardedPort = c.req.header("x-forwarded-port");
  if (forwardedProtocol === "https" && forwardedPort === "443" && forwardedHost?.endsWith("cloudfront.net")) {
    return `https://${forwardedHost}`;
  }
  return "http://localhost:3000";
};
