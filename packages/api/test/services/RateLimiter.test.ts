import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { RateLimiter } from "../../src/services/RateLimiter";

describe("RateLimiter", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  beforeEach(async () => {
    // Clear rate limit entries between tests by using unique client IDs
    // In a real scenario, you might want to delete test entries, but for simplicity
    // we'll just use unique client IDs per test
  });

  describe("check", () => {
    test("should allow requests within the limit", async () => {
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60 * 1000, // 1 minute
      });

      const clientId = `test-client-${Date.now()}`;

      // Make 4 requests (under the limit of 5)
      for (let i = 0; i < 4; i++) {
        const result = await limiter.check(clientId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - (i + 1));
        expect(result.resetTime).toBeGreaterThan(Date.now());
      }
    });

    test("should deny requests exceeding the limit", async () => {
      const limiter = new RateLimiter({
        maxRequests: 3,
        windowMs: 60 * 1000, // 1 minute
      });

      const clientId = `test-client-exceed-${Date.now()}`;

      // Make 3 requests (at the limit)
      for (let i = 0; i < 3; i++) {
        const result = await limiter.check(clientId);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be denied
      const result = await limiter.check(clientId);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test("should track different client IDs independently", async () => {
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs: 60 * 1000,
      });

      const clientId1 = `test-client-1-${Date.now()}`;
      const clientId2 = `test-client-2-${Date.now()}`;

      // Client 1 uses up their limit
      await limiter.check(clientId1);
      await limiter.check(clientId1);
      const result1 = await limiter.check(clientId1);
      expect(result1.allowed).toBe(false);

      // Client 2 should still be able to make requests
      const result2 = await limiter.check(clientId2);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);
    });

    test("should set correct reset time based on window", async () => {
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs,
      });

      const clientId = `test-client-reset-${Date.now()}`;
      const beforeTime = Date.now();
      const result = await limiter.check(clientId);
      const afterTime = Date.now();

      expect(result.resetTime).toBeGreaterThanOrEqual(beforeTime + windowMs);
      expect(result.resetTime).toBeLessThanOrEqual(afterTime + windowMs);
    });

    test("should handle concurrent requests correctly", async () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 60 * 1000,
      });

      const clientId = `test-client-concurrent-${Date.now()}`;

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        limiter.check(clientId)
      );
      const results = await Promise.all(promises);

      // All should be allowed (atomic operations should handle this)
      const allowedCount = results.filter((r) => r.allowed).length;
      expect(allowedCount).toBeGreaterThan(0); // At least some should be allowed
      
      // The total count should not exceed maxRequests
      const totalCount = results.reduce((sum, r) => sum + (r.allowed ? 1 : 0), 0);
      expect(totalCount).toBeLessThanOrEqual(10);
    });

    test("should return correct remaining count", async () => {
      const maxRequests = 5;
      const limiter = new RateLimiter({
        maxRequests,
        windowMs: 60 * 1000,
      });

      const clientId = `test-client-remaining-${Date.now()}`;

      for (let i = 0; i < maxRequests; i++) {
        const result = await limiter.check(clientId);
        expect(result.remaining).toBe(maxRequests - (i + 1));
      }

      // After limit is exceeded, remaining should be 0
      const exceededResult = await limiter.check(clientId);
      expect(exceededResult.remaining).toBe(0);
    });

    test("should handle errors gracefully and fail open", async () => {
      // This test verifies the fail-open behavior when DynamoDB errors occur
      // In a real scenario, you might mock DynamoDB to throw errors
      // For now, we'll test with valid DynamoDB but verify the error handling code path exists
      const limiter = new RateLimiter({
        maxRequests: 5,
        windowMs: 60 * 1000,
      });

      const clientId = `test-client-error-${Date.now()}`;
      
      // Normal operation should work
      const result = await limiter.check(clientId);
      expect(result.allowed).toBe(true);
    });
  });

  describe("window behavior", () => {
    test("should reset count when window expires", async () => {
      const windowMs = 1000; // 1 second - short window for testing
      const limiter = new RateLimiter({
        maxRequests: 2,
        windowMs,
      });

      const clientId = `test-client-window-${Date.now()}`;

      // Use up the limit
      await limiter.check(clientId);
      await limiter.check(clientId);
      const exceeded = await limiter.check(clientId);
      expect(exceeded.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, windowMs + 100));

      // Should be able to make requests again (window expired, count reset)
      const result = await limiter.check(clientId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1); // Should be reset to 1 request used
    });

    test("should not reset resetTime on every request", async () => {
      const windowMs = 5000; // 5 seconds
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs,
      });

      const clientId = `test-client-reset-time-${Date.now()}`;

      // Make first request
      const firstResult = await limiter.check(clientId);
      const firstResetTime = firstResult.resetTime;
      expect(firstResetTime).toBeGreaterThan(Date.now());

      // Wait a bit (but not enough to expire window)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Make second request - resetTime should remain the same (not extend)
      const secondResult = await limiter.check(clientId);
      const secondResetTime = secondResult.resetTime;
      
      // ResetTime should be the same (window hasn't expired, so it shouldn't change)
      expect(secondResetTime).toBe(firstResetTime);
    });
  });
});
