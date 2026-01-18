import { MembershipPersistence, UserPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { Auth, AuthService } from "../../src/services/AuthService";
import { ses } from "../../src/services/SystemEmailService";
import { createHash } from "../../src/util/hash";
import { OpenAPIHono } from "@hono/zod-openapi";

let app: OpenAPIHono<{
  Variables: {
    auth: Auth;
  };
}>;

describe("Auth Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
    process.env.RATE_LIMIT_ENABLED = "false";

    vi.spyOn(ses, "sendEmail").mockImplementation(async () => ({
      MessageId: "test-message-id",
      $metadata: {},
    }));

    app = await import("../../src/app").then(m => m.app);
  });

  afterAll(async () => {
    await stopDynamoDB();
    vi.restoreAllMocks();
    delete process.env.RATE_LIMIT_ENABLED;
  });

  beforeEach(() => vi.clearAllMocks());

  describe("POST /auth/signup", () => {

    test("should successfully create a new user account", async () => {
      const testEmail = "newuser@example.com";
      const testPassword = "password123";

      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        email: testEmail,
        enabled: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Ensure password and code are not returned
      expect(data).not.toHaveProperty("password");
      expect(data).not.toHaveProperty("code");

      expect(response.headers.get("content-type")).toContain("application/json");

      // Verify email was sent via SES
      expect(ses.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: [testEmail],
          },
          Message: expect.objectContaining({
            Subject: expect.objectContaining({
              Data: expect.stringContaining("Verify your email"),
            }),
          }),
        })
      );
    });

    test("should return 409 when email already exists", async () => {
      const testEmail = "existing@example.com";
      const testPassword = "password123";

      // Create an existing user
      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash(testPassword),
        enabled: false,
      });

      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(409);
    });

    test("should return 400 when password is too short", async () => {
      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "short",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when email is invalid", async () => {
      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "invalid-email",
          password: "password123",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when email or password is missing", async () => {
      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when signups are disabled and user has memberships", async () => {
      process.env.DISABLE_SIGNUPS = "true";
      const testEmail = "invited@example.com";
      const testPassword = "password123";

      // Create a membership for the email (simulating an invitation)
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: testEmail,
        user: "NEW_USER",
        project: "test-project-id",
        role: "MEMBER",
      });

      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toBe("Signups are currently disabled");
    });

    test("should allow signup when signups are disabled but user has no memberships", async () => {
      process.env.DISABLE_SIGNUPS = "true";
      const testEmail = "public@example.com";
      const testPassword = "password123";

      const response = await app.request("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        email: testEmail,
        enabled: false,
      });
    });
  });

  describe("POST /auth/login", () => {
    test("should successfully login with valid credentials", async () => {
      const testEmail = "loginuser@example.com";
      const testPassword = "password123";

      // Create an enabled user
      const userPersistence = new UserPersistence();
      const user = await userPersistence.create({
        email: testEmail,
        password: await createHash(testPassword),
        enabled: true,
      });

      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        id: user.id,
        email: testEmail,
        token: expect.any(String),
      });
      expect(data.token.length).toBeGreaterThan(0);

      expect(response.headers.get("content-type")).toContain("application/json");
    });

    test("should return 401 when user does not exist", async () => {
      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "password123",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 when password is incorrect", async () => {
      const testEmail = "loginuser2@example.com";
      const testPassword = "password123";

      // Create an enabled user
      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash(testPassword),
        enabled: true,
      });

      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("should return 403 when user is not enabled", async () => {
      const testEmail = "disableduser@example.com";
      const testPassword = "password123";

      // Create a disabled user
      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash(testPassword),
        enabled: false,
      });

      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(403);
    });

    test("should return 403 when user has no password", async () => {
      const testEmail = "nopassword@example.com";

      // Create a user without password
      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        enabled: true,
      });

      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: "anypassword",
        }),
      });

      expect(response.status).toBe(403);
    });

    test("should return 400 when email or password is missing", async () => {
      const response = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/verify", () => {
    test("should successfully verify user email with valid code", async () => {
      const testEmail = "verify@example.com";
      const testPassword = "password123";

      // Create user and get code
      const code = AuthService["createCode"](testEmail);
      const userPersistence = new UserPersistence();
      const user = await userPersistence.create({
        email: testEmail,
        password: await createHash(testPassword),
        enabled: false,
        code,
      });

      const response = await app.request("/api/v1/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        user: {
          id: user.id,
          email: testEmail,
          enabled: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Verify user is now enabled
      const verifiedUser = await userPersistence.get(user.id);
      expect(verifiedUser?.enabled).toBe(true);
      expect(verifiedUser?.code).toBeUndefined();
    });

    test("should return 401 when code is invalid", async () => {
      const testEmail = "verify2@example.com";

      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash("password123"),
        enabled: false,
        code: "valid-code",
      });

      const response = await app.request("/api/v1/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code: "invalid-code",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when user does not exist", async () => {
      const code = AuthService["createCode"]("nonexistent@example.com");

      const response = await app.request("/api/v1/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          code,
        }),
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when code email does not match", async () => {
      const testEmail = "verify3@example.com";
      const differentEmail = "different@example.com";
      const code = AuthService["createCode"](differentEmail);

      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash("password123"),
        enabled: false,
        code,
      });

      const response = await app.request("/api/v1/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /auth/request-reset", () => {
    test("should successfully send reset email for existing user", async () => {
      const testEmail = "reset@example.com";

      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash("password123"),
        enabled: true,
      });

      const response = await app.request("/api/v1/auth/request-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ success: true });

      // Verify email was sent via SES
      expect(ses.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          Destination: {
            ToAddresses: [testEmail],
          },
          Message: expect.objectContaining({
            Subject: expect.objectContaining({
              Data: expect.stringContaining("Reset your password"),
            }),
          }),
        })
      );

      // Verify code was saved to user
      const user = await userPersistence.getByEmail(testEmail);
      expect(user?.code).toBeDefined();
    });

    test("should return success even when user does not exist (security)", async () => {
      const response = await app.request("/api/v1/auth/request-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "nonexistent@example.com",
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ success: true });

      // Email should not be sent
      expect(ses.sendEmail).not.toHaveBeenCalled();
    });

    test("should return 400 when email is missing", async () => {
      const response = await app.request("/api/v1/auth/request-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /auth/reset", () => {
    test("should successfully reset password with valid code", async () => {
      const testEmail = "resetpass@example.com";
      const oldPassword = "oldpassword123";
      const newPassword = "newpassword123";

      // Create user with reset code
      const code = AuthService["createCode"](testEmail);
      const userPersistence = new UserPersistence();
      const user = await userPersistence.create({
        email: testEmail,
        password: await createHash(oldPassword),
        enabled: false,
        code,
      });

      const response = await app.request("/api/v1/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code,
          password: newPassword,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        user: {
          id: user.id,
          email: testEmail,
          enabled: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Verify user can login with new password
      const updatedUser = await userPersistence.get(user.id);
      expect(updatedUser?.enabled).toBe(true);
      expect(updatedUser?.code).toBeUndefined();

      // Try to login with new password
      const loginResponse = await app.request("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: newPassword,
        }),
      });

      expect(loginResponse.status).toBe(200);
    });

    test("should return 401 when code is invalid", async () => {
      const testEmail = "resetpass2@example.com";

      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash("password123"),
        enabled: true,
        code: "valid-code",
      });

      const response = await app.request("/api/v1/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code: "invalid-code",
          password: "newpassword123",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when user does not exist", async () => {
      const code = AuthService["createCode"]("nonexistent@example.com");

      const response = await app.request("/api/v1/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          code,
          password: "newpassword123",
        }),
      });

      expect(response.status).toBe(404);
    });

    test("should return 400 when password is too short", async () => {
      const testEmail = "resetpass3@example.com";
      const code = AuthService["createCode"](testEmail);

      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash("password123"),
        enabled: true,
        code,
      });

      const response = await app.request("/api/v1/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code,
          password: "short",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should return 401 when code email does not match", async () => {
      const testEmail = "resetpass4@example.com";
      const differentEmail = "different@example.com";
      const code = AuthService["createCode"](differentEmail);

      const userPersistence = new UserPersistence();
      await userPersistence.create({
        email: testEmail,
        password: await createHash("password123"),
        enabled: true,
        code,
      });

      const response = await app.request("/api/v1/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          code,
          password: "newpassword123",
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});

