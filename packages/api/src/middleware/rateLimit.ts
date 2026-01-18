import { getRateLimitConfig, rootLogger } from "@sendra/lib";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HttpException } from "../exceptions";
import { type RateLimitConfig, RateLimiter } from "../services/RateLimiter";

const logger = rootLogger.child({ module: "rateLimit" });

/**
 * Get client identifier for rate limiting
 */
function getClientId(c: Context): string {
  const ip = (c.req.header("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const acceptLanguage = c.req.header("accept-language") ?? "unknown";
  const userAgent = c.req.header("user-agent") ?? "unknown";
  return `${ip}:${acceptLanguage}:${userAgent}`;
}

/**
 * Create rate limit middleware for a specific endpoint
 */
export function createRateLimitMiddleware(config: RateLimitConfig, endpointName: string) {
  const { enabled } = getRateLimitConfig();

  const limiter = new RateLimiter(config);
  return createMiddleware(async (c: Context, next) => {
    if (enabled) {
      const clientId = getClientId(c);
      const key = `${endpointName}:${clientId}`;

      const result = await limiter.check(key);

      // Set rate limit headers (RFC 6585)
      c.header("X-RateLimit-Limit", config.maxRequests.toString());
      c.header("X-RateLimit-Remaining", result.remaining.toString());
      c.header("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString());
      c.header("Retry-After", Math.ceil((result.resetTime - Date.now()) / 1000).toString());

      if (!result.allowed) {
        logger.warn({ clientId, endpoint: endpointName, key }, "Rate limit exceeded");
        throw new HttpException(429, "Too many requests. Please try again later.", {
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
      }
    }

    await next();
  });
}
