import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../src/app";

describe("Health Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /health", () => {
    test("should return success status", async () => {
      const response = await app.request("/api/v1/health", {
        method: "GET",
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ success: true });

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });
  });
});
