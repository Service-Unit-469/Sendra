import { ContactPersistence, ProjectPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../src/app";

describe("Subscriber Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /subscriber", () => {
    test("should return subscriber data with subscriptions", async () => {
      // Create test projects
      const projectPersistence = new ProjectPersistence();
      const project1 = await projectPersistence.create({
        name: "Test Project 1",
        url: "https://test1.example.com",
        public: "test-public-1",
        secret: "test-secret-1",
        eventTypes: [],
      });
      const project2 = await projectPersistence.create({
        name: "Test Project 2",
        url: "https://test2.example.com",
        public: "test-public-2",
        secret: "test-secret-2",
        eventTypes: [],
      });

      // Create contacts for the same email across multiple projects
      const contactPersistence1 = new ContactPersistence(project1.id);
      const contactPersistence2 = new ContactPersistence(project2.id);

      const testEmail = "subscriber@example.com";
      await contactPersistence1.create({
        project: project1.id,
        email: testEmail,
        data: {},
        subscribed: true,
      });
      await contactPersistence2.create({
        project: project2.id,
        email: testEmail,
        data: {},
        subscribed: false,
      });

      // Make request
      const response = await app.request(
        `/api/v1/subscriber?email=${encodeURIComponent(testEmail)}`,
        {
          method: "GET",
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        email: testEmail,
        subscriptions: expect.arrayContaining([
          {
            id: project1.id,
            name: "Test Project 1",
            subscribed: true,
          },
          {
            id: project2.id,
            name: "Test Project 2",
            subscribed: false,
          },
        ]),
      });

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });

    test("should return 404 when email does not exist", async () => {
      const response = await app.request(
        "/api/v1/subscriber?email=nonexistent@example.com",
        {
          method: "GET",
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title");
      expect(data.title).toBe("Not Found");
      expect(data).toHaveProperty("detail");
      expect(data.detail).toContain("contact");
    });

    test("should return 400 when email parameter is missing", async () => {
      const response = await app.request("/api/v1/subscriber", {
        method: "GET",
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when email parameter is invalid", async () => {
      const response = await app.request("/api/v1/subscriber?email=invalid-email", {
        method: "GET",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /subscriber", () => {
    test("should update subscriber subscriptions", async () => {
      // Create test projects
      const projectPersistence = new ProjectPersistence();
      const project1 = await projectPersistence.create({
        name: "Update Test Project 1",
        url: "https://update-test1.example.com",
        public: "test-public-update-1",
        secret: "test-secret-update-1",
        eventTypes: [],
      });
      const project2 = await projectPersistence.create({
        name: "Update Test Project 2",
        url: "https://update-test2.example.com",
        public: "test-public-update-2",
        secret: "test-secret-update-2",
        eventTypes: [],
      });

      // Create contacts
      const contactPersistence1 = new ContactPersistence(project1.id);
      const contactPersistence2 = new ContactPersistence(project2.id);

      const testEmail = "update-subscriber@example.com";
      await contactPersistence1.create({
        project: project1.id,
        email: testEmail,
        data: {},
        subscribed: true,
      });
      await contactPersistence2.create({
        project: project2.id,
        email: testEmail,
        data: {},
        subscribed: true,
      });

      // Update subscriptions - unsubscribe from project1, keep project2 subscribed
      const updatePayload = {
        email: testEmail,
        subscriptions: [
          {
            id: project1.id,
            subscribed: false,
          },
          {
            id: project2.id,
            subscribed: true,
          },
        ],
      };

      const response = await app.request("/api/v1/subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        email: testEmail,
        subscriptions: expect.arrayContaining([
          {
            id: project1.id,
            name: "Update Test Project 1",
            subscribed: false,
          },
          {
            id: project2.id,
            name: "Update Test Project 2",
            subscribed: true,
          },
        ]),
      });

      // Verify the contacts were actually updated in the database
      const updatedContact1 = await contactPersistence1.getByEmail(testEmail);
      const updatedContact2 = await contactPersistence2.getByEmail(testEmail);

      expect(updatedContact1?.subscribed).toBe(false);
      expect(updatedContact2?.subscribed).toBe(true);

      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });

    test("should handle unsubscribing from all projects", async () => {
      // Create test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Unsubscribe Test Project",
        url: "https://unsubscribe-test.example.com",
        public: "test-public-unsub",
        secret: "test-secret-unsub",
        eventTypes: [],
      });

      // Create contact
      const contactPersistence = new ContactPersistence(project.id);
      const testEmail = "unsubscribe-all@example.com";
      await contactPersistence.create({
        project: project.id,
        email: testEmail,
        data: {},
        subscribed: true,
      });

      // Unsubscribe from all
      const updatePayload = {
        email: testEmail,
        subscriptions: [
          {
            id: project.id,
            subscribed: false,
          },
        ],
      };

      const response = await app.request("/api/v1/subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscriptions).toHaveLength(1);
      expect(data.subscriptions[0].subscribed).toBe(false);

      // Verify in database
      const updatedContact = await contactPersistence.getByEmail(testEmail);
      expect(updatedContact?.subscribed).toBe(false);
    });

    test("should handle subscribing to projects", async () => {
      // Create test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Subscribe Test Project",
        url: "https://subscribe-test.example.com",
        public: "test-public-sub",
        secret: "test-secret-sub",
        eventTypes: [],
      });

      // Create contact (initially unsubscribed)
      const contactPersistence = new ContactPersistence(project.id);
      const testEmail = "subscribe@example.com";
      await contactPersistence.create({
        project: project.id,
        email: testEmail,
        data: {},
        subscribed: false,
      });

      // Subscribe
      const updatePayload = {
        email: testEmail,
        subscriptions: [
          {
            id: project.id,
            subscribed: true,
          },
        ],
      };

      const response = await app.request("/api/v1/subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscriptions[0].subscribed).toBe(true);

      // Verify in database
      const updatedContact = await contactPersistence.getByEmail(testEmail);
      expect(updatedContact?.subscribed).toBe(true);
    });

    test("should return 400 when request body is invalid", async () => {
      const response = await app.request("/api/v1/subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing required fields
          invalidField: "value",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should handle no changes to subscription status", async () => {
      // Create test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "No Change Test Project",
        url: "https://nochange-test.example.com",
        public: "test-public-nochange",
        secret: "test-secret-nochange",
        eventTypes: [],
      });

      // Create contact
      const contactPersistence = new ContactPersistence(project.id);
      const testEmail = "nochange@example.com";
      await contactPersistence.create({
        project: project.id,
        email: testEmail,
        data: {},
        subscribed: true,
      });

      // Update with same subscription status
      const updatePayload = {
        email: testEmail,
        subscriptions: [
          {
            id: project.id,
            subscribed: true, // Same as current status
          },
        ],
      };

      const response = await app.request("/api/v1/subscriber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscriptions[0].subscribed).toBe(true);

      // Verify in database
      const contact = await contactPersistence.getByEmail(testEmail);
      expect(contact?.subscribed).toBe(true);
    });
  });
});

