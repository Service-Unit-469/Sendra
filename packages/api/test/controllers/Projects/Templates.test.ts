import {
  ActionPersistence,
  ProjectPersistence,
  TemplatePersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import {
  createTestContact,
  createTestEvent,
  createTestSetup,
  createTestTemplate,
} from "../../utils/test-helpers";

describe("Templates Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("POST /projects/{projectId}/templates", () => {
    test("should successfully create a new template", async () => {
      const { project, token } = await createTestSetup();

      const templatePayload = {
        subject: "Welcome Email",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Welcome to our service!</p>",
          plainText: "Welcome to our service!",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        subject: "Welcome Email",
        body: {
          data: expect.any(String),
          html: "<p>Welcome to our service!</p>",
          plainText: "Welcome to our service!",
        },
        templateType: "TRANSACTIONAL",
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should create template with custom email when domain is verified", async () => {
      const { project, token } = await createTestSetup();

      // Set up verified domain
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@verified-domain.com",
        identity: {
          identityType: "domain" as const,
          identity: "verified-domain.com",
          verified: true,
        },
      });

      const templatePayload = {
        subject: "Custom Email Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Template body</p>",
          plainText: "Template body",
        },
        templateType: "TRANSACTIONAL" as const,
        email: "custom@verified-domain.com",
      };

      const response = await app.request(
        `/projects/${updatedProject.id}/templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
        },
      );

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.email).toBe("custom@verified-domain.com");
    });

    test("should create marketing template", async () => {
      const { project, token } = await createTestSetup();

      const templatePayload = {
        subject: "Newsletter",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Check out our latest updates!</p>",
          plainText: "Check out our latest updates!",
        },
        templateType: "MARKETING" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.templateType).toBe("MARKETING");
    });

    test("should return 400 when subject is empty", async () => {
      const { project, token } = await createTestSetup();

      const templatePayload = {
        subject: "",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Body content</p>",
          plainText: "Body content",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(400);
    });

    test("should allow empty body content", async () => {
      const { project, token } = await createTestSetup();

      const templatePayload = {
        subject: "Test Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "",
          plainText: "",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(201);
    });

    test("should return 403 when custom email is provided without verified domain", async () => {
      const { project, token } = await createTestSetup();

      const templatePayload = {
        subject: "Custom Email Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Template body</p>",
          plainText: "Template body",
        },
        templateType: "TRANSACTIONAL" as const,
        email: "custom@unverified-domain.com",
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.detail).toContain("attach a domain");
    });

    test("should return 403 when custom email domain does not match project domain", async () => {
      const { project, token } = await createTestSetup();

      // Set up verified domain
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@verified-domain.com",
        identity: {
          identityType: "domain" as const,
          identity: "verified-domain.com",
          verified: true,
        },
      });

      const templatePayload = {
        subject: "Mismatched Domain Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Template body</p>",
          plainText: "Template body",
        },
        templateType: "TRANSACTIONAL" as const,
        email: "custom@different-domain.com",
      };

      const response = await app.request(
        `/projects/${updatedProject.id}/templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
        },
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.detail).toContain("same domain");
    });

    test("should work with API secret key authentication", async () => {
      const { project } = await createTestSetup();
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const templatePayload = {
        subject: "Secret Key Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Created with secret key</p>",
          plainText: "Created with secret key",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(201);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const templatePayload = {
        subject: "Unauthorized Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Body</p>",
          plainText: "Body",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const templatePayload = {
        subject: "Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Body</p>",
          plainText: "Body",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /projects/{projectId}/templates", () => {
    test("should return empty list when no templates exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        count: 0,
        hasMore: false,
        items: [],
      });
    });

    test("should return list of templates", async () => {
      const { project, token } = await createTestSetup();
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.count).toBeGreaterThanOrEqual(2);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
      expect(data.items[0]).toMatchObject({
        id: expect.any(String),
        subject: expect.any(String),
        body: expect.any(Object),
        templateType: expect.any(String),
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should respect limit parameter", async () => {
      const { project, token } = await createTestSetup();
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);

      const response = await app.request(
        `/projects/${project.id}/templates?limit=2`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    test("should return 400 when limit exceeds maximum", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates?limit=200`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("less than 100");
    });

    test("should support pagination with cursor", async () => {
      const { project, token } = await createTestSetup();
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);

      const firstResponse = await app.request(
        `/projects/${project.id}/templates?limit=1`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(firstResponse.status).toBe(200);

      const firstData = await firstResponse.json();
      expect(firstData.hasMore).toBe(true);
      expect(firstData.cursor).toBeDefined();

      const secondResponse = await app.request(
        `/projects/${project.id}/templates?limit=1&cursor=${firstData.cursor}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(secondResponse.status).toBe(200);

      const secondData = await secondResponse.json();
      expect(secondData.items[0].id).not.toBe(firstData.items[0].id);
    });

    test("should work with API secret key authentication", async () => {
      const { project } = await createTestSetup();
      await createTestTemplate(project.id);
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/templates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /projects/{projectId}/templates/all", () => {
    test("should return all templates without pagination", async () => {
      const { project, token } = await createTestSetup();
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);
      await createTestTemplate(project.id);

      const response = await app.request(
        `/projects/${project.id}/templates/all`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(3);
    });

    test("should return empty array when no templates exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/all`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/all`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/all`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("GET /projects/{projectId}/templates/:templateId", () => {
    test("should successfully get a template by ID", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: template.id,
        subject: template.subject,
        body: template.body,
        templateType: template.templateType,
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should support embedding actions", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      // Create an action linked to the template
      const actionPersistence = new ActionPersistence(project.id);
      await actionPersistence.create({
        project: project.id,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}?embed=actions`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data._embed).toBeDefined();
      expect(data._embed.actions).toBeDefined();
    });

    test("should return 404 when template does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/non-existent-id`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("template");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const otherUserSetup = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /projects/{projectId}/templates/:templateId", () => {
    test("should successfully update a template", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: template.id,
        subject: "Updated Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Updated {{body}} content</p>",
          plainText: "Updated {{body}} content",
        },
        templateType: "MARKETING" as const,
      };

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: template.id,
        subject: "Updated Subject",
        body: {
          data: expect.any(String),
          html: "<p>Updated {{body}} content</p>",
          plainText: "Updated {{body}} content",
        },
        templateType: "MARKETING",
      });
    });

    test("should update only subject", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: template.id,
        subject: "Only Subject Updated",
        body: template.body,
        templateType: template.templateType,
      };

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subject).toBe("Only Subject Updated");
      expect(data.body).toEqual(template.body);
    });

    test("should update custom email when domain is verified", async () => {
      const { project, token } = await createTestSetup();

      // Set up verified domain
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@verified-domain.com",
        identity: {
          identityType: "domain" as const,
          identity: "verified-domain.com",
          verified: true,
        },
      });

      const template = await createTestTemplate(updatedProject.id);

      const updatePayload = {
        id: template.id,
        subject: template.subject,
        body: template.body,
        templateType: template.templateType,
        email: "newemail@verified-domain.com",
      };

      const response = await app.request(
        `/projects/${updatedProject.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.email).toBe("newemail@verified-domain.com");
    });

    test("should return 400 when ID in body does not match URL parameter", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: "different-id",
        subject: "Updated Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Updated body</p>",
          plainText: "Updated body",
        },
        templateType: template.templateType,
      };

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("ID mismatch");
    });

    test("should return 404 when template does not exist", async () => {
      const { project, token } = await createTestSetup();

      const updatePayload = {
        id: "non-existent-id",
        subject: "Updated Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Updated {{body}}</p>",
          plainText: "Updated {{body}}",
        },
        templateType: "TRANSACTIONAL" as const,
      };

      const response = await app.request(
        `/projects/${project.id}/templates/non-existent-id`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("template");
    });

    test("should return 403 when updating email without verified domain", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: template.id,
        subject: template.subject,
        body: template.body,
        templateType: template.templateType,
        email: "custom@unverified-domain.com",
      };

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.detail).toContain("attach a domain");
    });

    test("should return 403 when updating email with mismatched domain", async () => {
      const { project, token } = await createTestSetup();

      // Set up verified domain
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@verified-domain.com",
        identity: {
          identityType: "domain" as const,
          identity: "verified-domain.com",
          verified: true,
        },
      });

      const template = await createTestTemplate(updatedProject.id);

      const updatePayload = {
        id: template.id,
        subject: template.subject,
        body: template.body,
        templateType: template.templateType,
        email: "custom@different-domain.com",
      };

      const response = await app.request(
        `/projects/${updatedProject.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.detail).toContain("same domain");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: template.id,
        subject: "Updated Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Updated body</p>",
          plainText: "Updated body",
        },
        templateType: template.templateType,
      };

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const otherUserSetup = await createTestSetup();

      const updatePayload = {
        id: template.id,
        subject: "Updated Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Updated body</p>",
          plainText: "Updated body",
        },
        templateType: template.templateType,
      };

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /projects/{projectId}/templates/:templateId", () => {
    test("should successfully delete a template", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      // Verify template was deleted
      const templatePersistence = new TemplatePersistence(project.id);
      const deletedTemplate = await templatePersistence.get(template.id);
      expect(deletedTemplate).toBeUndefined();
    });

    test("should return 403 when template is linked to an action", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      // Create an action that uses this template
      const actionPersistence = new ActionPersistence(project.id);
      await actionPersistence.create({
        project: project.id,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.detail).toContain("being used by an action");

      // Verify template was NOT deleted
      const templatePersistence = new TemplatePersistence(project.id);
      const stillExists = await templatePersistence.get(template.id);
      expect(stillExists).not.toBeNull();
    });

    test("should return 200 when template is not found (idempotent delete)", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/non-existent-id`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // DynamoDB delete is idempotent - returns 200 even if item doesn't exist
      expect(response.status).toBe(200);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(401);

      // Verify template was NOT deleted
      const templatePersistence = new TemplatePersistence(project.id);
      const stillExists = await templatePersistence.get(template.id);
      expect(stillExists).not.toBeNull();
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const otherUserSetup = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/templates/${template.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
          },
        },
      );

      expect(response.status).toBe(404);

      // Verify template was NOT deleted
      const templatePersistence = new TemplatePersistence(project.id);
      const stillExists = await templatePersistence.get(template.id);
      expect(stillExists).not.toBeNull();
    });
  });
});

