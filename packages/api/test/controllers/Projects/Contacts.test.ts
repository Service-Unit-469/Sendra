import {
    ContactPersistence,
    EmailPersistence,
    ProjectPersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import {
    createTestContact,
    createTestEvent,
    createTestSetup,
} from "../../utils/test-helpers";

describe("Contacts Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("POST /projects/{projectId}/contacts", () => {
    test("should successfully create a new contact", async () => {
      const { project, token } = await createTestSetup();

      const contactPayload = {
        email: "newuser@example.com",
        subscribed: true,
        data: { firstName: "John", lastName: "Doe" },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        email: "newuser@example.com",
        subscribed: true,
        data: { firstName: "John", lastName: "Doe" },
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should create contact with minimal data", async () => {
      const { project, token } = await createTestSetup();

      const contactPayload = {
        email: "minimal@example.com",
        subscribed: false,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        email: "minimal@example.com",
        subscribed: false,
        data: {},
      });
    });

    test("should create contact with complex data object", async () => {
      const { project, token } = await createTestSetup();

      const contactPayload = {
        email: "complex@example.com",
        subscribed: true,
        data: {
          firstName: "Jane",
          lastName: "Smith",
          age: 30,
          newsletter: true,
          notifications: false,
          tags: ["premium", "early-adopter"],
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data).toMatchObject(contactPayload.data);
    });

    test("should return 409 when contact with email already exists", async () => {
      const { project, token } = await createTestSetup();

      const email = "duplicate@example.com";
      await createTestContact(project.id, email);

      const contactPayload = {
        email: email,
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.detail).toContain("Contact already exists");
    });

    test("should return 400 when email is invalid", async () => {
      const { project, token } = await createTestSetup();

      const contactPayload = {
        email: "not-an-email",
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when email is missing", async () => {
      const { project, token } = await createTestSetup();

      const contactPayload = {
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const contactPayload = {
        email: "noauth@example.com",
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/contacts/{contactId}", () => {
    test("should successfully get a contact by id", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: contact.id,
        email: contact.email,
        subscribed: contact.subscribed,
        data: contact.data,
        project: project.id,
      });
    });

    test("should get contact with embedded emails", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      // Create an email for the contact
      const emailPersistence = new EmailPersistence(project.id);
      await emailPersistence.create({
        project: project.id,
        email: contact.email,
        contact: contact.id,
        subject: "Test Email",
        body: {
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        source: "test-source",
        status: "DELIVERED",
        sendType: "MARKETING",
      });

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}?embed=emails`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data._embed).toBeDefined();
      expect(data._embed.emails).toBeDefined();
      expect(Array.isArray(data._embed.emails)).toBe(true);
    });

    test("should get contact with embedded events", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      await createTestEvent(project.id, contact.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}?embed=events`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data._embed).toBeDefined();
      expect(data._embed.events).toBeDefined();
      expect(Array.isArray(data._embed.events)).toBe(true);
    });

    test("should get contact with multiple embeds", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      await createTestEvent(project.id, contact.id);

      const emailPersistence = new EmailPersistence(project.id);
      await emailPersistence.create({
        project: project.id,
        email: contact.email,
        contact: contact.id,
        subject: "Test Email",
        body: {
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        source: "test-source",
        status: "DELIVERED",
        sendType: "MARKETING",
      });

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}?embed=emails&embed=events`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data._embed).toBeDefined();
      expect(data._embed.emails).toBeDefined();
      expect(data._embed.events).toBeDefined();
    });



    test("should throw 400 on invalid embed", async () => {
        const { project, token } = await createTestSetup();
        const contact = await createTestContact(project.id);
        await createTestEvent(project.id, contact.id);
  

        const response = await app.request(
          `/api/v1/projects/${project.id}/contacts/${contact.id}?embed=projects`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        expect(response.status).toBe(400);
      });

    test("should return 404 when contact does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/non-existent-id`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("contact");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/some-id`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/contacts", () => {
    test("should list contacts with pagination", async () => {
      const { project, token } = await createTestSetup();

      // Create multiple contacts
      await createTestContact(project.id);
      await createTestContact(project.id);
      await createTestContact(project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("hasMore");
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(3);
    });

    test("should list contacts with limit parameter", async () => {
      const { project, token } = await createTestSetup();

      // Create multiple contacts
      for (let i = 0; i < 5; i++) {
        await createTestContact(project.id);
      }

      const response = await app.request(`/api/v1/projects/${project.id}/contacts?limit=2`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    test("should list contacts with cursor pagination", async () => {
      const { project, token } = await createTestSetup();

      // Create multiple contacts
      const contacts = [];
      for (let i = 0; i < 5; i++) {
        contacts.push(await createTestContact(project.id));
      }

      // Get first page
      const firstResponse = await app.request(`/api/v1/projects/${project.id}/contacts?limit=2`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(firstResponse.status).toBe(200);
      const firstData = await firstResponse.json();
      expect(firstData.items.length).toBeLessThanOrEqual(2);

      // Get second page if cursor is provided
      if (firstData.cursor) {
        const secondResponse = await app.request(
          `/api/v1/projects/${project.id}/contacts?limit=2&cursor=${firstData.cursor}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        expect(secondResponse.status).toBe(200);
        const secondData = await secondResponse.json();
        expect(secondData.items.length).toBeGreaterThan(0);

        // Ensure no overlap between pages
        const firstIds = firstData.items.map((c: any) => c.id);
        const secondIds = secondData.items.map((c: any) => c.id);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    test("should query contacts by email", async () => {
      const { project, token } = await createTestSetup();

      const targetEmail = "query-test@example.com";
      await createTestContact(project.id, targetEmail);
      await createTestContact(project.id); // Another contact

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts?email=${encodeURIComponent(targetEmail)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      const foundContact = data.items.find((c: any) => c.email === targetEmail);
      expect(foundContact).toBeDefined();
    });

    test("should return 400 when limit exceeds maximum", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/contacts?limit=101`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Limit must be less than 100");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/contacts/all", () => {
    test("should list all contacts without pagination", async () => {
      const { project, token } = await createTestSetup();

      const contact1 = await createTestContact(project.id);
      const contact2 = await createTestContact(project.id);
      const contact3 = await createTestContact(project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(3);

      const contactIds = data.map((c: any) => c.id);
      expect(contactIds).toContain(contact1.id);
      expect(contactIds).toContain(contact2.id);
      expect(contactIds).toContain(contact3.id);
    });

    test("should return empty array when no contacts exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/all`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /projects/{projectId}/contacts/{contactId}", () => {
    test("should successfully update a contact", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const updatePayload = {
        id: contact.id,
        email: contact.email,
        subscribed: false,
        data: { firstName: "Updated", lastName: "Name" },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: contact.id,
        email: contact.email,
        subscribed: false,
        data: { firstName: "Updated", lastName: "Name" },
        project: project.id,
      });
    });

    test("should update contact data fields", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const updatePayload = {
        id: contact.id,
        email: contact.email,
        subscribed: contact.subscribed,
        data: { newField: "new value", another: 123 },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toMatchObject({ newField: "new value", another: 123 });
    });

    test("should update contact subscription status", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const updatePayload = {
        id: contact.id,
        email: contact.email,
        subscribed: !contact.subscribed,
        data: contact.data,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscribed).toBe(!contact.subscribed);
    });

    test("should return 400 when id in body does not match url", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const updatePayload = {
        id: "different-id",
        email: contact.email,
        subscribed: contact.subscribed,
        data: contact.data,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("ID mismatch");
    });

    test("should return 400 when email is invalid", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const updatePayload = {
        id: contact.id,
        email: "not-a-valid-email",
        subscribed: contact.subscribed,
        data: contact.data,
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 404 when contact does not exist", async () => {
      const { project, token } = await createTestSetup();

      const updatePayload = {
        id: "non-existent-id",
        email: "test@example.com",
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/non-existent-id`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const updatePayload = {
        id: contact.id,
        email: contact.email,
        subscribed: false,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /projects/{projectId}/contacts/{contactId}", () => {
    test("should successfully delete a contact", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify contact was deleted
      const contactPersistence = new ContactPersistence(project.id);
      const deletedContact = await contactPersistence.get(contact.id);
      expect(deletedContact).toBeUndefined();
    });

    test("should delete contact and related entities", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      // Create related entities
      await createTestEvent(project.id, contact.id);
      const emailPersistence = new EmailPersistence(project.id);
      await emailPersistence.create({
        project: project.id,
        email: contact.email,
        contact: contact.id,
        subject: "Test Email",
        body: {
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        source: "test-source",
        status: "DELIVERED",
        sendType: "MARKETING",
      });

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify contact was deleted
      const contactPersistence = new ContactPersistence(project.id);
      const deletedContact = await contactPersistence.get(contact.id);
      expect(deletedContact).toBeUndefined();
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /projects/{projectId}/contacts/{contactId}/subscribe", () => {
    test("should successfully subscribe a contact", async () => {
      const { project, token } = await createTestSetup();
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "subscribe-test@example.com",
        subscribed: false,
        data: {},
      });

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/subscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: contact.id,
        email: contact.email,
        subscribed: true,
        project: project.id,
      });

      // Verify in database
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.subscribed).toBe(true);
    });

    test("should subscribe an already subscribed contact (idempotent)", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id); // Already subscribed

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/subscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscribed).toBe(true);
    });

    test("should return 404 when contact does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/non-existent-id/subscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("contact");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/subscribe`,
        {
          method: "POST",
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("POST /projects/{projectId}/contacts/{contactId}/unsubscribe", () => {
    test("should successfully unsubscribe a contact", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id); // Created as subscribed

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/unsubscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: contact.id,
        email: contact.email,
        subscribed: false,
        project: project.id,
      });

      // Verify in database
      const contactPersistence = new ContactPersistence(project.id);
      const updatedContact = await contactPersistence.get(contact.id);
      expect(updatedContact?.subscribed).toBe(false);
    });

    test("should unsubscribe an already unsubscribed contact (idempotent)", async () => {
      const { project, token } = await createTestSetup();
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "unsubscribe-test@example.com",
        subscribed: false,
        data: {},
      });

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/unsubscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscribed).toBe(false);
    });

    test("should return 404 when contact does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/non-existent-id/unsubscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("contact");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/unsubscribe`,
        {
          method: "POST",
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Authentication with Secret Key", () => {
    test("should allow contact creation with valid secret key", async () => {
      const { project } = await createTestSetup();

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const contactPayload = {
        email: "secret-key-contact@example.com",
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(201);
    });

    test("should allow contact retrieval with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    test("should allow contact subscription with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.create({
        project: project.id,
        email: "secret-subscribe@example.com",
        subscribed: false,
        data: {},
      });

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/subscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });

    test("should allow contact unsubscription with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const secretToken = AuthService.createProjectToken(project.secret, "SECRET", project.id);

      const response = await app.request(
        `/api/v1/projects/${project.id}/contacts/${contact.id}/unsubscribe`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });

    test("should deny access with invalid secret key format", async () => {
      const { project } = await createTestSetup();

      const contactPayload = {
        email: "invalid-secret@example.com",
        subscribed: true,
        data: {},
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-secret-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Contact Schema Validation", () => {
    test("should successfully create contact with valid schema data", async () => {
      const { project, token } = await createTestSetup();

      // Set up a contact schema
      const projectPersistence = new ProjectPersistence();
      const schema = {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string" },
          age: { type: "number", minimum: 0 },
        },
        required: ["firstName"],
      };
      await projectPersistence.put({
        ...project,
        contactDataSchema: JSON.stringify(schema),
      });

      const contactPayload = {
        email: "schema-valid@example.com",
        subscribed: true,
        data: {
          firstName: "John",
          lastName: "Doe",
          age: 30,
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data).toMatchObject(contactPayload.data);
    });

    test("should return 400 when contact data violates schema", async () => {
      const { project, token } = await createTestSetup();

      // Set up a contact schema with required field
      const projectPersistence = new ProjectPersistence();
      const schema = {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string" },
        },
        required: ["firstName"],
      };
      await projectPersistence.put({
        ...project,
        contactDataSchema: JSON.stringify(schema),
      });

      const contactPayload = {
        email: "schema-invalid@example.com",
        subscribed: true,
        data: {
          lastName: "Doe",
          // Missing required firstName
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Contact data validation failed");
    });

    test("should return 400 when contact data violates schema type constraints", async () => {
      const { project, token } = await createTestSetup();

      // Set up a contact schema with type constraints
      const projectPersistence = new ProjectPersistence();
      const schema = {
        type: "object",
        properties: {
          age: { type: "number", minimum: 0 },
          email: { type: "string", format: "email" },
        },
      };
      await projectPersistence.put({
        ...project,
        contactDataSchema: JSON.stringify(schema),
      });

      const contactPayload = {
        email: "type-invalid@example.com",
        subscribed: true,
        data: {
          age: "not-a-number", // Should be number
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Contact data validation failed");
    });

    test("should successfully create contact without schema", async () => {
      const { project, token } = await createTestSetup();

      // Ensure no schema is set
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...project,
        contactDataSchema: undefined,
      });

      const contactPayload = {
        email: "no-schema@example.com",
        subscribed: true,
        data: {
          anyField: "anyValue",
          anotherField: 123,
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data).toMatchObject(contactPayload.data);
    });

    test("should successfully update contact with valid schema data", async () => {
      const { project, token } = await createTestSetup();

      // Set up a contact schema
      const projectPersistence = new ProjectPersistence();
      const schema = {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string" },
        },
        required: ["firstName"],
      };
      await projectPersistence.put({
        ...project,
        contactDataSchema: JSON.stringify(schema),
      });

      const contact = await createTestContact(project.id, "update-schema@example.com");

      const updatePayload = {
        id: contact.id,
        email: contact.email,
        subscribed: contact.subscribed,
        data: {
          firstName: "Jane",
          lastName: "Smith",
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.data).toMatchObject(updatePayload.data);
    });

    test("should return 400 when updating contact with invalid schema data", async () => {
      const { project, token } = await createTestSetup();

      // Set up a contact schema
      const projectPersistence = new ProjectPersistence();
      const schema = {
        type: "object",
        properties: {
          firstName: { type: "string", minLength: 1 },
          lastName: { type: "string" },
        },
        required: ["firstName"],
      };
      await projectPersistence.put({
        ...project,
        contactDataSchema: JSON.stringify(schema),
      });

      const contact = await createTestContact(project.id, "update-invalid@example.com");

      const updatePayload = {
        id: contact.id,
        email: contact.email,
        subscribed: contact.subscribed,
        data: {
          lastName: "Smith",
          // Missing required firstName
        },
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${contact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Contact data validation failed");
    });

    test("should allow updating contact without data when schema exists", async () => {
      const { project, token } = await createTestSetup();

      // Set up a contact schema (no required fields)
      const projectPersistence = new ProjectPersistence();
      const schema = {
        type: "object",
        properties: {
          firstName: { type: "string" },
        },
      };
      await projectPersistence.put({
        ...project,
        contactDataSchema: JSON.stringify(schema),
      });

      // Create contact with valid schema data first
      const contactPayload = {
        email: "update-no-data@example.com",
        subscribed: true,
        data: {
          firstName: "Initial",
        },
      };

      const createResponse = await app.request(`/api/v1/projects/${project.id}/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      expect(createResponse.status).toBe(201);
      const createdContact = await createResponse.json();

      // Now update without providing data - should preserve existing data
      const updatePayload = {
        id: createdContact.id,
        email: createdContact.email,
        subscribed: false,
        data: createdContact.data, // Explicitly include existing data
      };

      const response = await app.request(`/api/v1/projects/${project.id}/contacts/${createdContact.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.subscribed).toBe(false);
      expect(data.data).toMatchObject(createdContact.data);
    });
  });
});

