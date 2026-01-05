import {
  EmailPersistence,
  MembershipPersistence,
  ProjectPersistence,
  UserPersistence
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import { createTestContact, createTestSetup } from "../../utils/test-helpers";

describe("Emails Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  // Helper function to create a test email
  const createTestEmail = async (projectId: string, contactId: string, messageId?: string) => {
    const emailPersistence = new EmailPersistence(projectId);
    return await emailPersistence.create({
      project: projectId,
      contact: contactId,
      messageId: messageId || `test-message-${Date.now()}@example.com`,
      subject: "Test Email Subject",
      body: {
        html: "<p>Test email body</p>",
        plainText: "Test email body",
      },
      email: "recipient@example.com",
      status: "SENT",
      sendType: "TRANSACTIONAL",
    });
  };

  describe("GET /projects/{projectId}/emails", () => {
    test("should list emails with pagination", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      // Create multiple emails
      await createTestEmail(project.id, contact.id);
      await createTestEmail(project.id, contact.id);
      await createTestEmail(project.id, contact.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails?limit=2`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("hasMore");
      expect(data.items).toBeInstanceOf(Array);
      expect(data.items.length).toBeLessThanOrEqual(2);
      
      // Verify email structure
      if (data.items.length > 0) {
        expect(data.items[0]).toMatchObject({
          id: expect.any(String),
          project: project.id,
          messageId: expect.any(String),
          subject: expect.any(String),
          body: expect.any(Object),
          status: expect.any(String),
        });
      }
    });

    test("should list all emails without pagination", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      // Create test emails
      await createTestEmail(project.id, contact.id);
      await createTestEmail(project.id, contact.id);

      const response = await app.request(`/api/v1/projects/${project.id}/emails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toBeInstanceOf(Array);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
    });

    test("should support pagination with cursor", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      // Create multiple emails
      for (let i = 0; i < 5; i++) {
        await createTestEmail(project.id, contact.id);
      }

      // Get first page
      const firstResponse = await app.request(
        `/api/v1/projects/${project.id}/emails?limit=2`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      
      if (firstData.hasMore && firstData.cursor) {
        // Get second page using cursor
        const secondResponse = await app.request(
          `/api/v1/projects/${project.id}/emails?limit=2&cursor=${firstData.cursor}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        expect(secondResponse.status).toBe(200);
        const secondData = await secondResponse.json();
        expect(secondData.items).toBeInstanceOf(Array);
        
        // Verify different items in second page
        const firstIds = firstData.items.map((e: any) => e.id);
        const secondIds = secondData.items.map((e: any) => e.id);
        expect(firstIds).not.toEqual(secondIds);
      }
    });

    test("should filter emails by messageId", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const specificMessageId = `specific-message-${Date.now()}@example.com`;
      await createTestEmail(project.id, contact.id, specificMessageId);
      await createTestEmail(project.id, contact.id); // Different messageId

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails?filter=messageId&value=${encodeURIComponent(specificMessageId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toBeInstanceOf(Array);
      
      // All returned emails should have the specific messageId
      for (const email of data.items) {
        expect(email.messageId).toBe(specificMessageId);
      }
    });

    test("should return empty result when no emails exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/emails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toEqual([]);
      expect(data.count).toBe(0);
      expect(data.hasMore).toBe(false);
    });

    test("should return 400 when limit exceeds maximum", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails?limit=101`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Limit must be less than 100");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/emails`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/non-existent-project/emails", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /projects/{projectId}/emails/all", () => {
    test("should list all emails without pagination", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      // Create test emails
      const email1 = await createTestEmail(project.id, contact.id);
      await createTestEmail(project.id, contact.id);

      const response = await app.request(`/api/v1/projects/${project.id}/emails/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      // Verify structure of email objects
      const foundEmail = data.find((e: any) => e.id === email1.id);
      expect(foundEmail).toMatchObject({
        id: email1.id,
        messageId: email1.messageId,
        subject: email1.subject,
        project: project.id,
      });
    });

    test("should filter all emails by messageId", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const specificMessageId = `filter-all-${Date.now()}@example.com`;
      await createTestEmail(project.id, contact.id, specificMessageId);
      await createTestEmail(project.id, contact.id, specificMessageId);
      await createTestEmail(project.id, contact.id); // Different messageId

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails/all?filter=messageId&value=${encodeURIComponent(specificMessageId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      // All returned emails should have the specific messageId
      for (const email of data) {
        expect(email.messageId).toBe(specificMessageId);
      }
    });

    test("should return empty array when no emails exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/emails/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data).toHaveLength(0);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/emails/all`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/emails/:emailId", () => {
    test("should retrieve a specific email by ID", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const email = await createTestEmail(project.id, contact.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails/${email.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: email.id,
        messageId: email.messageId,
        subject: email.subject,
        body: email.body,
        email: email.email,
        status: email.status,
        sendType: email.sendType,
        project: project.id,
        contact: contact.id,
      });
    });

    test("should include all email fields", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const email = await createTestEmail(project.id, contact.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails/${email.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("project");
      expect(data).toHaveProperty("contact");
      expect(data).toHaveProperty("messageId");
      expect(data).toHaveProperty("subject");
      expect(data).toHaveProperty("body");
      expect(data).toHaveProperty("email");
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("sendType");
      expect(data).toHaveProperty("createdAt");
      expect(data).toHaveProperty("updatedAt");
    });

    test("should return 404 when email does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails/non-existent-id`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("email");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const email = await createTestEmail(project.id, contact.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails/${email.id}`,
        {
          method: "GET",
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Authentication with Secret Key", () => {
    test("should allow email listing with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      await createTestEmail(project.id, contact.id);

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/emails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toBeInstanceOf(Array);
    });

    test("should allow email retrieval with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const email = await createTestEmail(project.id, contact.id);

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/emails/${email.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(email.id);
    });

    test("should allow listing all emails with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      await createTestEmail(project.id, contact.id);

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/emails/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
    });

    test("should allow filtering with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const messageId = `secret-filter-${Date.now()}@example.com`;
      await createTestEmail(project.id, contact.id, messageId);

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails?filter=messageId&value=${encodeURIComponent(messageId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toBeInstanceOf(Array);
    });
  });

  describe("Authorization Tests", () => {
    test("should not allow non-member to access emails", async () => {
      const { project } = await createTestSetup();
      
      // Create a different user who is not a member
      const userPersistence = new UserPersistence();
      const nonMemberUser = await userPersistence.create({
        email: `nonmember-${Date.now()}@example.com`,
        password: "hashedpassword",
        enabled: true,
      });

      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: nonMemberUser.id,
      });

      const nonMemberToken = AuthService.createUserToken(nonMemberUser.id, nonMemberUser.email, memberships);

      const response = await app.request(`/api/v1/projects/${project.id}/emails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${nonMemberToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should not allow wrong project secret key", async () => {
      const { project } = await createTestSetup();
      
      // Create another project
      const projectPersistence = new ProjectPersistence();
      const otherProject = await projectPersistence.create({
        name: "Other Project",
        url: "https://other.example.com",
        public: "other-public",
        secret: "other-secret",
        eventTypes: [],
        colors: [],
      });

      // Try to use other project's secret key
      const wrongSecretToken = AuthService.createProjectToken(
        otherProject.secret,
        "secret",
        otherProject.id
      );

      const response = await app.request(`/api/v1/projects/${project.id}/emails`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${wrongSecretToken}`,
        },
      });

      // Invalid JWT signature returns 401 instead of 404
      expect(response.status).toBe(401);
    });
  });

  describe("Email Status and Types", () => {
    test("should list emails with different statuses", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);
      
      // Create emails with different statuses
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        messageId: `sent-${Date.now()}@example.com`,
        subject: "Sent Email",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        email: "recipient@example.com",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        messageId: `bounced-${Date.now()}@example.com`,
        subject: "Bounced Email",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        email: "recipient@example.com",
        status: "BOUNCED",
        sendType: "TRANSACTIONAL",
      });

      const response = await app.request(`/api/v1/projects/${project.id}/emails/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      const sentEmail = data.find((e: any) => e.status === "SENT");
      const bouncedEmail = data.find((e: any) => e.status === "BOUNCED");
      
      expect(sentEmail).toBeDefined();
      expect(bouncedEmail).toBeDefined();
    });

    test("should list emails with different send types", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);
      
      // Create emails with different send types
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        messageId: `transactional-${Date.now()}@example.com`,
        subject: "Transactional Email",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        email: "recipient@example.com",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        messageId: `marketing-${Date.now()}@example.com`,
        subject: "Marketing Email",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        email: "recipient@example.com",
        status: "SENT",
        sendType: "MARKETING",
      });

      const response = await app.request(`/api/v1/projects/${project.id}/emails/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      const transactionalEmail = data.find((e: any) => e.sendType === "TRANSACTIONAL");
      const marketingEmail = data.find((e: any) => e.sendType === "MARKETING");
      
      expect(transactionalEmail).toBeDefined();
      expect(marketingEmail).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    test("should handle messageId with special characters", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const specialMessageId = `test+special_chars-${Date.now()}@example.com`;
      await createTestEmail(project.id, contact.id, specialMessageId);

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails?filter=messageId&value=${encodeURIComponent(specialMessageId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toBeInstanceOf(Array);
      
      if (data.items.length > 0) {
        expect(data.items[0].messageId).toBe(specialMessageId);
      }
    });

    test("should handle large email body content", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);
      const largeBody = "<p>" + "Lorem ipsum dolor sit amet. ".repeat(100) + "</p>";
      
      const email = await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        messageId: `large-body-${Date.now()}@example.com`,
        subject: "Email with Large Body",
        body: {
          html: largeBody,
          plainText: "Lorem ipsum dolor sit amet. ".repeat(100),
        },
        email: "recipient@example.com",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails/${email.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.body).toMatchObject({
        html: largeBody,
        plainText: expect.any(String),
      });
    });

    test("should handle empty filter results gracefully", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/api/v1/projects/${project.id}/emails?filter=messageId&value=non-existent-message-id`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toEqual([]);
      expect(data.count).toBe(0);
    });
  });
});

