import { MembershipPersistence, ProjectPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import { createTestSetup } from "../../utils/test-helpers";

describe("SMS Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /projects/{projectId}/sms", () => {
    test("should return default SMS config when not configured", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        enabled: false,
        groupSize: 20,
      });
    });

    test("should return configured SMS config", async () => {
      const { project, token } = await createTestSetup();

      // Set up SMS config
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...project,
        sms: {
          enabled: true,
          phoneField: "phone",
          groupSize: 50,
        },
      });

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        enabled: true,
        phoneField: "phone",
        groupSize: 50,
      });
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/api/v1/projects/non-existent-id/sms", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("Project not found");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when using secret key (not supported)", async () => {
      const { project } = await createTestSetup();
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "SECRET",
        project.id,
      );

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /projects/{projectId}/sms", () => {
    test("should successfully update SMS config", async () => {
      const { project, token } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        phoneField: "mobile",
        groupSize: 30,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        enabled: true,
        phoneField: "mobile",
        groupSize: 30,
      });

      // Verify it was saved
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.sms).toMatchObject({
        enabled: true,
        phoneField: "mobile",
        groupSize: 30,
      });
    });

    test("should update SMS config with minimal fields", async () => {
      const { project, token } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        groupSize: 25,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        enabled: true,
        groupSize: 25,
      });
    });

    test("should disable SMS when enabled is false", async () => {
      const { project, token } = await createTestSetup();

      // First enable SMS
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...project,
        sms: {
          enabled: true,
          phoneField: "phone",
          groupSize: 30,
        },
      });

      // Then disable it
      const smsPayload = {
        enabled: false,
        groupSize: 20,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enabled).toBe(false);
    });

    test("should return 400 when groupSize is not positive", async () => {
      const { project, token } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        groupSize: 0,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when groupSize is negative", async () => {
      const { project, token } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        groupSize: -1,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when groupSize is not an integer", async () => {
      const { project, token } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        groupSize: 20.5,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        groupSize: 20,
      };

      const response = await app.request("/api/v1/projects/non-existent-id/sms", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("Project not found");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const smsPayload = {
        enabled: true,
        groupSize: 20,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return client error when user is not an admin", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      // Make other user a member but not admin
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: otherUserSetup.user.email,
        user: otherUserSetup.user.id,
        project: project.id,
        role: "MEMBER",
      });

      const smsPayload = {
        enabled: true,
        groupSize: 20,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test("should return 401 when using secret key (not supported)", async () => {
      const { project } = await createTestSetup();
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "SECRET",
        project.id,
      );

      const smsPayload = {
        enabled: true,
        groupSize: 25,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/sms`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${secretToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(smsPayload),
      });

      expect(response.status).toBe(401);
    });
  });
});

