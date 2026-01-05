import { MembershipPersistence, UserPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../src/app";
import { AuthService } from "../../src/services/AuthService";

describe("Users Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /@me", () => {
    test("should return authenticated user data", async () => {
      // Create a test user
      const userPersistence = new UserPersistence();
      const testUser = await userPersistence.create({
        email: "test@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create user token
      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: testUser.id,
      });

      const token = AuthService.createUserToken(testUser.id, testUser.email, memberships);

      // Make request with authentication
      const response = await app.request("/api/v1/@me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        id: testUser.id,
        email: testUser.email,
        enabled: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Ensure password and code are not returned
      expect(data).not.toHaveProperty("password");
      expect(data).not.toHaveProperty("code");

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });

    test("should return 401 when no authentication is provided", async () => {
      const response = await app.request("/api/v1/@me", {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 when invalid token is provided", async () => {
      const response = await app.request("/api/v1/@me", {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 when user does not exist", async () => {
      // Create token for non-existent user
      const nonExistentUserId = "non-existent-user-id";
      const token = AuthService.createUserToken(
        nonExistentUserId,
        "nonexistent@example.com",
        []
      );

      const response = await app.request("/api/v1/@me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });
});

