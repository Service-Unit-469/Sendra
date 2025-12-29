import {
  ActionsService,
  ContactPersistence,
  EmailPersistence,
  EmailService,
  EventPersistence,
  ProjectPersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import {
  createTestContact,
  createTestEvent,
  createTestSetup,
} from "../../utils/test-helpers";

// Mock the EmailService and ActionsService methods
vi.spyOn(EmailService, "send").mockResolvedValue({ messageId: "test-message-id" });
vi.spyOn(EmailService, "compileSubject").mockImplementation((subject: string) => subject);
vi.spyOn(EmailService, "compileBody").mockImplementation((body: string) => body);
vi.spyOn(ActionsService, "trigger").mockResolvedValue(undefined);

describe("Events Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /projects/{projectId}/event-types/all", () => {
    test("should successfully list all event types including OOTB events", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/event-types/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("eventTypes");
      expect(Array.isArray(data.eventTypes)).toBe(true);
      // Should include 8 OOTB events + 2 custom events ("user.signup" and "user.login")
      expect(data.eventTypes.length).toBe(10);
      expect(data.eventTypes[0]).toHaveProperty("name");
      // OOTB events come first
      expect(data.eventTypes[0].name).toBe("subscribe");
      // Custom events come after OOTB events
      expect(data.eventTypes.some((et: { name: string }) => et.name === "user.signup")).toBe(true);
    });

    test("should list event types with embedded events", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      await createTestEvent(project.id, contact.id);

      const response = await app.request(`/api/v1/projects/${project.id}/event-types/all?embed=events`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.eventTypes[0]).toHaveProperty("_embed");
      expect(data.eventTypes[0]._embed).toHaveProperty("events");
      expect(Array.isArray(data.eventTypes[0]._embed.events)).toBe(true);
    });

    test("should return OOTB events for project without custom event types", async () => {
      const { project, token } = await createTestSetup();
      
      // Update project to have no custom event types
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        eventTypes: [],
      });

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/event-types/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      // Should still have 8 OOTB events
      expect(data.eventTypes).toHaveLength(8);
      expect(data.eventTypes[0].name).toBe("subscribe");
      expect(data.eventTypes[1].name).toBe("unsubscribe");
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/non-existent-project/event-types/all", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when no authentication token provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/event-types/all`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 with invalid token", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/event-types/all`, {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      expect(response.status).toBe(401);
    });

    test("should allow access with project secret key", async () => {
      const { project } = await createTestSetup();
      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/event-types/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /projects/{projectId}/send", () => {
    test("should successfully send a transactional email", async () => {
      const { project } = await createTestSetup();
      
      // Set up project with verified domain
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Email Subject",
        body: {
          html: "<p>Test email body content</p>",
          plainText: "Test email body content",
        },
        subscribed: true,
      };

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        emails: expect.arrayContaining([
          expect.objectContaining({
            contact: expect.objectContaining({
              id: expect.any(String),
              email: "recipient@example.com",
            }),
            email: expect.any(String),
          }),
        ]),
        timestamp: expect.any(String),
      });
    });

    test("should send email to multiple recipients", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient1@example.com", "recipient2@example.com", "recipient3@example.com"],
        subject: "Multi-recipient Email",
        body: {
          html: "<p>Email for multiple recipients</p>",
          plainText: "Email for multiple recipients",
        },
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.emails).toHaveLength(3);
    });

    test("should create contact if it does not exist", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const newEmail = `newcontact-${Date.now()}@example.com`;
      const emailPayload = {
        to: [newEmail],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        subscribed: false,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);

      // Verify contact was created
      const contactPersistence = new ContactPersistence(updatedProject.id);
      const contact = await contactPersistence.getByEmail(newEmail);
      expect(contact).toBeDefined();
      expect(contact?.email).toBe(newEmail);
      expect(contact?.subscribed).toBe(false);
    });

    test("should update contact subscription status if changed", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      // Create contact with subscribed=false
      const contactPersistence = new ContactPersistence(updatedProject.id);
      const contact = await contactPersistence.create({
        project: updatedProject.id,
        email: "existing@example.com",
        subscribed: false,
        data: {},
      });

      const emailPayload = {
        to: ["existing@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);

      // Verify subscription was updated
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.subscribed).toBe(true);
    });

    test("should send email with custom from address from same domain", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "default@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        from: "custom@example.com",
        name: "Custom Name",
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);
    });

    test("should send email with reply-to address", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        reply: "reply@example.com",
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);
    });

    test("should send email with headers", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        headers: {
          "X-Custom-Header": "custom-value",
        },
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);
    });

    test("should send email with attachments", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        attachments: [
          {
            filename: "test.pdf",
            content: Buffer.from("test content").toString("base64"),
            contentType: "application/pdf",
          },
        ],
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);
    });

    test("should return 400 when project email is not verified", async () => {
      const { project } = await createTestSetup();

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain("Verify your domain");
    });

    test("should return 400 when custom from address is from different domain", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        from: "different@otherdomain.com",
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain("verified domain");
    });

    test("should return 400 with invalid payload", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const invalidPayload = {
        // Missing required 'to' field
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 401 when no authentication token provided", async () => {
      const { project } = await createTestSetup();

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        subscribed: true,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 with invalid project", async () => {
      const { project, token } = await createTestSetup();

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request("/projects/non-existent-project/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(404);
    });

    test("should create email record in database", async () => {
      const { project } = await createTestSetup();
      
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.put({
        ...project,
        email: "sender@example.com",
        identity: {
          identity: "sender@example.com",
          identityType: "email",
          verified: true,
        },
        from: "Test Sender",
      });

      const emailPayload = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(updatedProject.public, "public", updatedProject.id);

      const response = await app.request(`/api/v1/projects/${updatedProject.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const emailId = data.emails[0].email;

      // Verify email was created in database
      const emailPersistence = new EmailPersistence(updatedProject.id);
      const email = await emailPersistence.get(emailId);
      expect(email).toBeDefined();
      expect(email?.subject).toBe("Test Subject");
      expect(email?.status).toBe("SENT");
      expect(email?.sendType).toBe("TRANSACTIONAL");
    });
  });

  describe("POST /projects/{projectId}/track", () => {
    test("should successfully track a new event", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "button.clicked",
        email: "tracker@example.com",
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        contact: expect.any(String),
        eventType: "button.clicked",
        event: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    test("should create contact if it does not exist when tracking event", async () => {
      const { project, token } = await createTestSetup();

      const newEmail = `newtracker-${Date.now()}@example.com`;
      const eventPayload = {
        event: "user.registered",
        email: newEmail,
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify contact was created
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.getByEmail(newEmail);
      expect(contact).toBeDefined();
      expect(contact?.email).toBe(newEmail);
      expect(contact?.subscribed).toBe(true);
    });

    test("should track event for existing contact", async () => {
      const { project, token } = await createTestSetup();
      
      // Create existing contact
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "existing@example.com",
        subscribed: true,
        data: { firstName: "John" },
      });

      const eventPayload = {
        event: "page.viewed",
        email: "existing@example.com",
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contact).toBe(contact.id);
    });

    test("should update contact data when tracking event", async () => {
      const { project, token } = await createTestSetup();
      
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "updateme@example.com",
        subscribed: true,
        data: { firstName: "John" },
      });

      const eventPayload = {
        event: "profile.updated",
        email: "updateme@example.com",
        data: {
          firstName: "Jane",
          lastName: "Doe",
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify contact data was updated
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.data).toMatchObject({
        firstName: "Jane",
        lastName: "Doe",
      });
    });

    test("should merge contact data when tracking event", async () => {
      const { project, token } = await createTestSetup();
      
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "mergeme@example.com",
        subscribed: true,
        data: { 
          firstName: "John",
          age: 30,
        },
      });

      const eventPayload = {
        event: "data.updated",
        email: "mergeme@example.com",
        data: {
          lastName: "Doe",
          city: "New York",
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify contact data was merged
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.data).toMatchObject({
        firstName: "John",
        age: 30,
        lastName: "Doe",
        city: "New York",
      });
    });

    test("should merge array data properties when tracking event", async () => {
      const { project } = await createTestSetup();
      
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "arraymerge@example.com",
        subscribed: true,
        data: { 
          tags: ["tag1", "tag2"],
          interests: ["coding", "reading"],
        },
      });

      const eventPayload = {
        event: "tags.updated",
        email: "arraymerge@example.com",
        data: {
          tags: ["tag2", "tag3"], // tag2 already exists, tag3 is new
          interests: ["coding", "gaming"], // coding already exists, gaming is new
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify array data was merged correctly (no duplicates, new items added)
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.data.tags).toEqual(expect.arrayContaining(["tag1", "tag2", "tag3"]));
      expect(updatedContact?.data.tags).toHaveLength(3);
      expect(updatedContact?.data.interests).toEqual(expect.arrayContaining(["coding", "reading", "gaming"]));
      expect(updatedContact?.data.interests).toHaveLength(3);
    });

    test("should replace non-array value with array when tracking event", async () => {
      const { project } = await createTestSetup();
      
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "replacewitharray@example.com",
        subscribed: true,
        data: { 
          tags: "single-tag", // non-array value
        },
      });

      const eventPayload = {
        event: "tags.updated",
        email: "replacewitharray@example.com",
        data: {
          tags: ["tag1", "tag2"], // array value
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify non-array was replaced with array (no merging when types don't match)
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.data.tags).toEqual(["tag1", "tag2"]);
      expect(Array.isArray(updatedContact?.data.tags)).toBe(true);
    });

    test("should update contact subscription status when tracking event", async () => {
      const { project } = await createTestSetup();
      
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "subscriber@example.com",
        subscribed: false,
        data: {},
      });

      const eventPayload = {
        event: "newsletter.subscribed",
        email: "subscriber@example.com",
        subscribed: true,
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify subscription was updated
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.subscribed).toBe(true);
    });

    test("should handle transient data that is not persisted to contact", async () => {
      const { project, token } = await createTestSetup();
      
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "transient@example.com",
        subscribed: true,
        data: {},
      });

      const eventPayload = {
        event: "session.started",
        email: "transient@example.com",
        transientData: {
          sessionId: "abc123",
          timestamp: Date.now(),
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify transient data was NOT saved to contact
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.data).not.toHaveProperty("sessionId");
      expect(updatedContact?.data).not.toHaveProperty("timestamp");

      // Verify event was created with transient data
      const eventPersistence = new EventPersistence(project.id);
      const data = await response.json();
      const event = await eventPersistence.get(data.event);
      expect(event?.data).toHaveProperty("sessionId");
      expect(event?.data).toHaveProperty("timestamp");
    });

    test("should add new event type to project when tracking unknown event", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "new.custom.event",
        email: "tracker@example.com",
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify event type was added to project
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.eventTypes).toContain("new.custom.event");
    });

    test("should not duplicate event type if already exists", async () => {
      const { project, token } = await createTestSetup();

      // Track event twice
      const eventPayload = {
        event: "user.signup",
        email: "tracker@example.com",
      };

      await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${project.public}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${project.public}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      // Verify event type appears only once
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      const signupCount = updatedProject?.eventTypes.filter(et => et === "user.signup").length;
      expect(signupCount).toBe(1);
    });

    test("should trigger actions after tracking event", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "purchase.completed",
        email: "buyer@example.com",
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);
      expect(ActionsService.trigger).toHaveBeenCalled();
    });

    test("should allow tracking OOTB event 'subscribe' and not add to project.eventTypes", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "subscribe",
        email: "user@example.com",
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eventType).toBe("subscribe");

      // Verify the event was not added to project.eventTypes
      const updatedProject = await new ProjectPersistence().get(project.id);
      expect(updatedProject?.eventTypes).not.toContain("subscribe");
    });

    test("should allow tracking OOTB event 'unsubscribe' and not add to project.eventTypes", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "unsubscribe",
        email: "user@example.com",
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.eventType).toBe("unsubscribe");

      // Verify the event was not added to project.eventTypes
      const updatedProject = await new ProjectPersistence().get(project.id);
      expect(updatedProject?.eventTypes).not.toContain("unsubscribe");
    });

    test("should return 400 with invalid payload", async () => {
      const { project, token } = await createTestSetup();

      const invalidPayload = {
        // Missing required 'event' field
        email: "user@example.com",
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when missing email field", async () => {
      const { project, token } = await createTestSetup();

      const invalidPayload = {
        event: "test.event",
        // Missing required 'email' field
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 404 when project does not exist", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "test.event",
        email: "user@example.com",
      };

      const response = await app.request("/projects/non-existent-project/track", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${project.public}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when no authentication token provided", async () => {
      const { project } = await createTestSetup();

      const eventPayload = {
        event: "test.event",
        email: "user@example.com",
      };

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 401 with invalid token", async () => {
      const { project } = await createTestSetup();

      const eventPayload = {
        event: "test.event",
        email: "user@example.com",
      };

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(401);
    });

    test("should create event record in database", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "database.test",
        email: "dbtest@example.com",
        data: {
          key: "value",
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const eventId = data.event;

      // Verify event was created in database
      const eventPersistence = new EventPersistence(project.id);
      const event = await eventPersistence.get(eventId);
      expect(event).toBeDefined();
      expect(event?.eventType).toBe("database.test");
      expect(event?.data).toMatchObject({ key: "value" });
    });

    test("should default subscribed to true when not provided", async () => {
      const { project, token } = await createTestSetup();

      const newEmail = `defaultsub-${Date.now()}@example.com`;
      const eventPayload = {
        event: "default.subscription",
        email: newEmail,
        // subscribed not provided
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      // Verify contact was created with subscribed=true
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.getByEmail(newEmail);
      expect(contact?.subscribed).toBe(true);
    });

    test("should handle tracking event with both data and transientData", async () => {
      const { project, token } = await createTestSetup();

      const eventPayload = {
        event: "complex.event",
        email: "complex@example.com",
        data: {
          persistentField: "saved",
        },
        transientData: {
          temporaryField: "not-saved-to-contact",
        },
      };

      const publicToken = AuthService.createProjectToken(project.public, "public", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/track`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      });

      expect(response.status).toBe(200);

      const responseData = await response.json();

      // Verify contact has persistent data but not transient
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.getByEmail("complex@example.com");
      expect(contact?.data).toHaveProperty("persistentField", "saved");
      expect(contact?.data).not.toHaveProperty("temporaryField");

      // Verify event has both persistent and transient data
      const eventPersistence = new EventPersistence(project.id);
      const event = await eventPersistence.get(responseData.event);
      expect(event?.data).toHaveProperty("persistentField", "saved");
      expect(event?.data).toHaveProperty("temporaryField", "not-saved-to-contact");
    });
  });
});

