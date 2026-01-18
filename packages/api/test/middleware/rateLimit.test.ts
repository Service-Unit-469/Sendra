import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../src/app";

describe("Rate Limit Middleware", () => {
  beforeAll(() => startupDynamoDB());

  afterAll(() => stopDynamoDB());

  describe("X-RateLimit headers", () => {
    test("should set rate limit headers on successful requests", async () => {
      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `192.168.1.1-${Date.now()}`,
          "user-agent": "test-agent",
          "accept-language": "en-US",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      // Should have rate limit headers regardless of auth result
      expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy();
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();

      const remaining = parseInt(response.headers.get("X-RateLimit-Remaining") || "0", 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(5);
    });

    test("should set correct limit header based on endpoint", async () => {
      // Test signup endpoint which has different limits
      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `192.168.1.2-${Date.now()}`,
          "user-agent": "test-agent",
          "accept-language": "en-US",
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "password123",
        }),
      });

      // Signup has limit of 3 per hour
      expect(response.headers.get("X-RateLimit-Limit")).toBe("3");
    });
  });

  describe("rate limit enforcement", () => {
    test("should allow requests within limit", async () => {
      const uniqueIp = `192.168.1.100-${Date.now()}`;
      const headers = {
        "Content-Type": "application/json",
        "x-forwarded-for": uniqueIp,
        "user-agent": "test-agent",
        "accept-language": "en-US",
      };

      // Make 4 login attempts (under limit of 5)
      for (let i = 0; i < 4; i++) {
        const response = await app.request("/api/v1/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: "test@example.com",
            password: "wrongpassword",
          }),
        });

        // Should not be rate limited (might be 401 for wrong password, but not 429)
        expect(response.status).not.toBe(429);
      }
    });

    test("should return 429 when rate limit is exceeded", async () => {
      const uniqueIp = `192.168.1.200-${Date.now()}`;
      const headers = {
        "Content-Type": "application/json",
        "x-forwarded-for": uniqueIp,
        "user-agent": "test-agent",
        "accept-language": "en-US",
      };

      // Make 5 login attempts (at the limit)
      for (let i = 0; i < 5; i++) {
        await app.request("/api/v1/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: "test@example.com",
            password: "wrongpassword",
          }),
        });
      }

      // 6th request should be rate limited
      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.title).toContain("Too Many Requests");
    });

    test("should include Retry-After header when rate limited", async () => {
      const uniqueIp = `192.168.1.300-${Date.now()}`;
      const headers = {
        "Content-Type": "application/json",
        "x-forwarded-for": uniqueIp,
        "user-agent": "test-agent",
        "accept-language": "en-US",
      };

      // Exceed the limit
      for (let i = 0; i < 5; i++) {
        await app.request("/api/v1/auth/login", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: "test@example.com",
            password: "wrongpassword",
          }),
        });
      }

      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(429);
      const retryAfter = response.headers.get("Retry-After");
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter || "0", 10)).toBeGreaterThan(0);
    });

    test("should track different IPs independently", async () => {
      const ip1 = `192.168.1.400-${Date.now()}`;
      const ip2 = `192.168.1.500-${Date.now()}`;

      // IP1 exceeds limit
      for (let i = 0; i < 5; i++) {
        await app.request("/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip1,
            "user-agent": "test-agent",
            "accept-language": "en-US",
          },
          body: JSON.stringify({
            email: "test@example.com",
            password: "wrongpassword",
          }),
        });
      }

      const response1 = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip1,
          "user-agent": "test-agent",
          "accept-language": "en-US",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });
      expect(response1.status).toBe(429);

      // IP2 should still be able to make requests
      const response2 = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip2,
          "user-agent": "test-agent",
          "accept-language": "en-US",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });
      expect(response2.status).not.toBe(429);
    });

    test("should handle x-forwarded-for with multiple IPs", async () => {
      // x-forwarded-for can contain multiple IPs (proxy chain)
      // Should use the first one
      const uniqueId = Date.now();
      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `192.168.1.1, 10.0.0.1, 172.16.0.1-${uniqueId}`,
          "user-agent": "test-agent",
          "accept-language": "en-US",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      // Should work (not rate limited on first request)
      expect(response.status).not.toBe(429);
      expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy();
    });
  });

  describe("endpoint-specific limits", () => {
    test("should apply signup limit (3 per hour)", async () => {
      const uniqueIp = `192.168.2.100-${Date.now()}`;
      const headers = {
        "Content-Type": "application/json",
        "x-forwarded-for": uniqueIp,
        "user-agent": "test-agent",
        "accept-language": "en-US",
      };

      // Make 3 signup attempts (at the limit)
      for (let i = 0; i < 3; i++) {
        const response = await app.request("/api/v1/auth/signup", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: `test-${Date.now()}-${i}@example.com`,
            password: "password123",
          }),
        });
        // First might succeed, others might fail for duplicate email, but shouldn't be 429
        expect(response.status).not.toBe(429);
      }

      // 4th request should be rate limited
      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "password123",
        }),
      });

      expect(response.status).toBe(429);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("3");
    });

    test("should apply different limits to different endpoints", async () => {
      const uniqueIp = `192.168.2.200-${Date.now()}`;
      const baseHeaders = {
        "Content-Type": "application/json",
        "x-forwarded-for": uniqueIp,
        "user-agent": "test-agent",
        "accept-language": "en-US",
      };

      // Exceed login limit (5)
      for (let i = 0; i < 5; i++) {
        await app.request("/api/v1/auth/login", {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify({
            email: "test@example.com",
            password: "wrongpassword",
          }),
        });
      }

      // Login should be rate limited
      const loginResponse = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });
      expect(loginResponse.status).toBe(429);

      // But signup should still work (different endpoint, different limit)
      const signupResponse = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "password123",
        }),
      });
      expect(signupResponse.status).not.toBe(429);
    });
  });
});
