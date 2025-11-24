import { ProjectPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import { createTestSetup } from "../../utils/test-helpers";

describe("Keys Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /projects/{projectId}/keys", () => {
    test("should return project API keys", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("secret");
      expect(data).toHaveProperty("public");
      expect(typeof data.secret).toBe("string");
      expect(typeof data.public).toBe("string");

      // Verify the returned tokens have the correct prefixes and structure
      expect(data.secret).toMatch(/^s:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(data.public).toMatch(/^p:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    test("should return keys with correct prefixes", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify the secret token starts with "s:"
      expect(data.secret).toMatch(/^s:/);
      
      // Verify the public token starts with "p:"
      expect(data.public).toMatch(/^p:/);
      
      // Verify tokens are not empty after the prefix
      expect(data.secret.length).toBeGreaterThan(2);
      expect(data.public.length).toBeGreaterThan(2);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/non-existent-project-id/keys", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 404 when authenticated as different user without access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should work with valid Bearer token", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test("should return 401 when using secret API key token", async () => {
      const { project } = await createTestSetup();

      // Create a secret API key token
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 when using public API key token", async () => {
      const { project } = await createTestSetup();

      // Create a public API key token
      const publicToken = AuthService.createProjectToken(
        project.public,
        "public",
        project.id,
      );

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${publicToken}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /projects/{projectId}/keys", () => {
    test("should regenerate project API keys", async () => {
      const { project, token } = await createTestSetup();

      // Get original keys
      const originalResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const originalKeys = await originalResponse.json();

      // Regenerate keys
      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("secret");
      expect(data).toHaveProperty("public");

      // Verify new keys are different from original
      expect(data.secret).not.toBe(originalKeys.secret);
      expect(data.public).not.toBe(originalKeys.public);
    });

    test("should return valid JWT tokens after regeneration", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // Verify the tokens have the correct prefixes and structure
      expect(data.secret).toMatch(/^s:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(data.public).toMatch(/^p:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      
      // Verify tokens are not empty
      expect(data.secret.length).toBeGreaterThan(2);
      expect(data.public.length).toBeGreaterThan(2);
    });

    test("should persist regenerated keys in database", async () => {
      const { project, token } = await createTestSetup();

      // Regenerate keys
      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      const newKeys = await response.json();

      // Verify keys are persisted by fetching them again
      const verifyResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(verifyResponse.status).toBe(200);
      const fetchedKeys = await verifyResponse.json();

      // The JWT tokens should match
      expect(fetchedKeys.secret).toBe(newKeys.secret);
      expect(fetchedKeys.public).toBe(newKeys.public);
    });

    test("should update stored keys after regeneration", async () => {
      const { project, token } = await createTestSetup();

      // Get original keys
      const originalResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const originalKeys = await originalResponse.json();
      
      // Store original raw keys from database
      const originalSecretKey = project.secret;
      const originalPublicKey = project.public;

      // Regenerate keys
      await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Verify the project's stored keys have changed in the database
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      
      expect(updatedProject).toBeDefined();
      expect(updatedProject!.secret).not.toBe(originalSecretKey);
      expect(updatedProject!.public).not.toBe(originalPublicKey);
      
      // Verify the raw keys are UUIDs
      expect(updatedProject!.secret).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(updatedProject!.public).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/non-existent-project-id/keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 404 when authenticated as different user without access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should allow multiple regenerations", async () => {
      const { project, token } = await createTestSetup();

      // First regeneration
      const firstResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(firstResponse.status).toBe(200);
      const firstKeys = await firstResponse.json();

      // Second regeneration
      const secondResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      expect(secondResponse.status).toBe(200);
      const secondKeys = await secondResponse.json();

      // Keys should be different after each regeneration
      expect(secondKeys.secret).not.toBe(firstKeys.secret);
      expect(secondKeys.public).not.toBe(firstKeys.public);

      // Both sets of keys should have valid format
      expect(secondKeys.secret).toMatch(/^s:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(secondKeys.public).toMatch(/^p:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(firstKeys.secret).toMatch(/^s:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      expect(firstKeys.public).toMatch(/^p:[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    test("should work with valid Bearer token", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test("should return 401 when using secret API key token for regeneration", async () => {
      const { project } = await createTestSetup();

      // Create a secret API key token
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 when using public API key token for regeneration", async () => {
      const { project } = await createTestSetup();

      // Create a public API key token
      const publicToken = AuthService.createProjectToken(
        project.public,
        "public",
        project.id,
      );

      const response = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
        },
      });

      expect(response.status).toBe(401);
    });

    test("should not allow API keys to regenerate themselves", async () => {
      const { project } = await createTestSetup();

      // Try with secret token
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const secretResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(secretResponse.status).toBe(401);

      // Try with public token
      const publicToken = AuthService.createProjectToken(
        project.public,
        "public",
        project.id,
      );

      const publicResponse = await app.request(`/api/v1/projects/${project.id}/keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
        },
      });

      expect(publicResponse.status).toBe(401);

      // Verify keys were not changed by fetching them with a user token
      const { token: userToken } = await createTestSetup();
      const projectPersistence = new ProjectPersistence();
      const unchangedProject = await projectPersistence.get(project.id);

      expect(unchangedProject!.secret).toBe(project.secret);
      expect(unchangedProject!.public).toBe(project.public);
    });
  });
});

