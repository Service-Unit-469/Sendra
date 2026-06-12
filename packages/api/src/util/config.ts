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
  if (forwardedProtocol === "https" && forwardedPort === "443" && forwardedHost) {
    try {
      const parsedForwardedUrl = new URL(`https://${forwardedHost}`);
      const hostname = parsedForwardedUrl.hostname;
      if (hostname === "cloudfront.net" || hostname.endsWith(".cloudfront.net")) {
        return parsedForwardedUrl.origin;
      }
    } catch {
      // Ignore invalid forwarded host values and fall back to localhost.
    }
  }
  return "http://localhost:3000";
};
