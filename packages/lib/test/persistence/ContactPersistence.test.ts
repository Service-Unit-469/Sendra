import type { Contact } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ContactPersistence } from "../../src/persistence/ContactPersistence";

const TEST_PROJECT_ID = "test-project-123";
const TEST_PROJECT_ID_2 = "test-project-456";

describe("ContactPersistence", () => {
  let persistence: ContactPersistence;
  let persistence2: ContactPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();

    persistence = new ContactPersistence(TEST_PROJECT_ID);
    persistence2 = new ContactPersistence(TEST_PROJECT_ID_2);
  });

  afterAll(async () => {
    await stopDynamoDB();
    vi.unstubAllEnvs();
  });

  describe("getByEmail", () => {
    it("should retrieve a contact by email", async () => {
      const contactData = {
        project: TEST_PROJECT_ID,
        email: "test@example.com",
        data: { firstName: "John", lastName: "Doe" },
        subscribed: true,
      };

      await persistence.create(contactData);
      const retrieved = await persistence.getByEmail("test@example.com");

      expect(retrieved).toMatchObject(contactData);
      expect(retrieved?.id).toBeTruthy();
    });

    it("should return undefined for non-existent email", async () => {
      const result = await persistence.getByEmail("nonexistent@example.com");
      expect(result).toBeUndefined();
    });

    it("should only return contacts from the same project", async () => {
      const email = "cross-project@example.com";

      // Create contact in project 1
      await persistence.create({
        project: TEST_PROJECT_ID,
        email,
        data: { project: "1" },
        subscribed: true,
      });

      // Create contact in project 2
      await persistence2.create({
        project: TEST_PROJECT_ID_2,
        email,
        data: { project: "2" },
        subscribed: true,
      });

      // Query from project 1 should only return project 1 contact
      const result1 = await persistence.getByEmail(email);
      expect(result1?.project).toBe(TEST_PROJECT_ID);
      expect(result1?.data.project).toBe("1");

      // Query from project 2 should only return project 2 contact
      const result2 = await persistence2.getByEmail(email);
      expect(result2?.project).toBe(TEST_PROJECT_ID_2);
      expect(result2?.data.project).toBe("2");
    });
  });

  describe("getByEmailFromAllProjects", () => {
    it("should retrieve contacts by email from all projects", async () => {
      const email = "multi-project@example.com";

      // Create contacts in different projects with same email
      await persistence.create({
        project: TEST_PROJECT_ID,
        email,
        data: { source: "project1" },
        subscribed: true,
      });

      await persistence2.create({
        project: TEST_PROJECT_ID_2,
        email,
        data: { source: "project2" },
        subscribed: false,
      });

      // Import the class to use static method

      const results = await ContactPersistence.getByEmailFromAllProjects(email);

      expect(results.length).toBe(2);
      const projectIds = results.map((c: Contact) => c.project).sort();
      expect(projectIds).toEqual([TEST_PROJECT_ID, TEST_PROJECT_ID_2].sort());
    });

    it("should return empty array for non-existent email", async () => {
      const results =
        await ContactPersistence.getByEmailFromAllProjects(
          "nobody@example.com"
        );

      expect(results).toEqual([]);
    });

    it("should handle pagination when retrieving contacts from all projects", async () => {
      const email = "paginated@example.com";

      // Create 60 contacts across different projects with the same email
      // This will trigger pagination since DynamoDB page size is typically 50
      const contactPromises = [];
      for (let i = 0; i < 60; i++) {
        const projectId = `pagination-project-${i}`;
        const projectPersistence = new ContactPersistence(projectId);
        contactPromises.push(
          projectPersistence.create({
            project: projectId,
            email,
            data: { index: i },
            subscribed: true,
          })
        );
      }

      await Promise.all(contactPromises);

      const results = await ContactPersistence.getByEmailFromAllProjects(email);

      expect(results.length).toBe(60);
      expect(results.every((c: Contact) => c.email === email)).toBe(true);

      // Verify that all contacts have unique projects
      const projectIds = results.map((c: Contact) => c.project);
      const uniqueProjectIds = new Set(projectIds);
      expect(uniqueProjectIds.size).toBe(60);
    });
  });

  describe("getIndexInfo", () => {
    it("should return correct index info for email key", () => {
      const indexInfo = persistence.getIndexInfo("email");

      expect(indexInfo).toEqual({
        type: "local",
        indexName: "ATTR_1",
        rangeKey: "i_attr1",
      });
    });

    it("should throw error for unsupported key", () => {
      expect(() => persistence.getIndexInfo("unsupported")).toThrow(
        "No index implemented for: unsupported"
      );
    });
  });

  describe("projectItem", () => {
    it("should project email to i_attr1", () => {
      const contact: Contact = {
        id: "test-id",
        project: TEST_PROJECT_ID,
        email: "project@example.com",
        data: {},
        subscribed: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(contact);

      expect(projected.i_attr1).toBe("project@example.com");
    });
  });

  describe("contact data handling", () => {
    it("should handle complex data objects", async () => {
      const contactData = {
        project: TEST_PROJECT_ID,
        email: "complex@example.com",
        data: {
          firstName: "Jane",
          lastName: "Smith",
          age: 30,
          tags: ["vip", "enterprise"],
          isActive: true,
          metadata: null,
        },
        subscribed: true,
      };

      const created = await persistence.create(contactData);
      expect(created.data).toEqual(contactData.data);

      const retrieved = await persistence.getByEmail("complex@example.com");
      expect(retrieved?.data).toEqual(contactData.data);
    });

    it("should handle optional subscribed field", async () => {
      const contactData = {
        project: TEST_PROJECT_ID,
        email: "optional-sub@example.com",
        data: { name: "Test" },
      };

      const created = await persistence.create(contactData);
      expect(created.subscribed).toBeUndefined();

      const retrieved = await persistence.getByEmail(
        "optional-sub@example.com"
      );
      expect(retrieved?.subscribed).toBeUndefined();
    });

    it("should update contact data correctly", async () => {
      const contactData = {
        project: TEST_PROJECT_ID,
        email: "update@example.com",
        data: { version: 1 },
        subscribed: false,
      };

      const created = await persistence.create(contactData);

      const updated = await persistence.put({
        ...created,
        data: { version: 2, updated: true },
        subscribed: true,
      });

      expect(updated.data.version).toBe(2);
      expect(updated.data.updated).toBe(true);
      expect(updated.subscribed).toBe(true);
    });
  });

  describe("findBy email", () => {
    it("should find contacts by email using findBy method", async () => {
      const email = "findby@example.com";

      await persistence.create({
        project: TEST_PROJECT_ID,
        email,
        data: { test: true },
        subscribed: true,
      });

      const result = await persistence.findBy({
        key: "email",
        value: email,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].email).toBe(email);
    });
  });

  describe("embed", () => {
    it("should return contacts without embed when no embed requested", async () => {
      const contacts: Contact[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          email: "embed@example.com",
          data: {},
          subscribed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(contacts);

      expect(result).toEqual(contacts);
    });

    it("should throw error when attempting to embed templates", async () => {
      const contacts: Contact[] = [
        {
          id: "embed-test-2",
          project: TEST_PROJECT_ID,
          email: "embed-error@example.com",
          data: {},
          subscribed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(contacts, ["actions"])).rejects.toThrow(
        "Only emails, events are supported"
      );
    });

    it("should throw error when attempting to embed unsupported types", async () => {
      const contacts: Contact[] = [
        {
          id: "embed-test-3",
          project: TEST_PROJECT_ID,
          email: "embed-error-2@example.com",
          data: {},
          subscribed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(contacts, ["actions"])).rejects.toThrow(
        "Only emails, events are supported"
      );

      await expect(persistence.embed(contacts, ["actions"])).rejects.toThrow(
        "Only emails, events are supported"
      );
    });
  });
});
