import type { Group } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ContactPersistence } from "../../src/persistence/ContactPersistence";
import { GroupPersistence } from "../../src/persistence/GroupPersistence";

const TEST_PROJECT_ID = "test-project-123";

describe("GroupPersistence", () => {
  let persistence: GroupPersistence;
  let contactPersistence: ContactPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();


    persistence = new GroupPersistence(TEST_PROJECT_ID);
    contactPersistence = new ContactPersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("getIndexInfo", () => {
    it("should throw error for any key", () => {
      expect(() => persistence.getIndexInfo("anyKey")).toThrow(
        "No index implemented for: anyKey"
      );
    });
  });

  describe("projectItem", () => {
    it("should return item unchanged", () => {
      const group: Group = {
        id: "test-id",
        project: TEST_PROJECT_ID,
        name: "Test Group",
        contacts: ["contact-1", "contact-2"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(group);

      expect(projected).toEqual(group);
      expect(projected.i_attr1).toBeUndefined();
      expect(projected.i_attr2).toBeUndefined();
    });
  });

  describe("getContacts", () => {
    it("should retrieve all contacts in a group", async () => {
      // Create contacts
      const contact1 = await contactPersistence.create({
        project: TEST_PROJECT_ID,
        email: "contact1@example.com",
        data: { name: "Contact 1" },
        subscribed: true,
      });

      const contact2 = await contactPersistence.create({
        project: TEST_PROJECT_ID,
        email: "contact2@example.com",
        data: { name: "Contact 2" },
        subscribed: true,
      });

      // Create group with contacts
      const group = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Test Group",
        contacts: [contact1.id, contact2.id],
      });

      // Get contacts from group
      const contacts = await persistence.getContacts(group.id);

      expect(contacts.length).toBe(2);
      const emails = contacts.map((c) => c.email).sort();
      expect(emails).toEqual(["contact1@example.com", "contact2@example.com"]);
    });

    it("should return empty array for group with no contacts", async () => {
      const group = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Empty Group",
        contacts: [],
      });

      const contacts = await persistence.getContacts(group.id);

      expect(contacts).toEqual([]);
    });

    it("should throw error for non-existent group", async () => {
      await expect(persistence.getContacts("non-existent-id")).rejects.toThrow(
        "Group not found"
      );
    });

    it("should handle groups with missing contacts", async () => {
      // Create group with contacts that don't exist
      const group = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Group with Missing Contacts",
        contacts: ["non-existent-1", "non-existent-2"],
      });

      const contacts = await persistence.getContacts(group.id);

      // batchGet should return empty array for non-existent contacts
      expect(contacts).toEqual([]);
    });

    it("should only return contacts that exist", async () => {
      // Create one contact
      const contact = await contactPersistence.create({
        project: TEST_PROJECT_ID,
        email: "exists@example.com",
        data: { name: "Exists" },
        subscribed: true,
      });

      // Create group with one existing and one non-existing contact
      const group = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Mixed Group",
        contacts: [contact.id, "non-existent-contact"],
      });

      const contacts = await persistence.getContacts(group.id);

      expect(contacts.length).toBe(1);
      expect(contacts[0].email).toBe("exists@example.com");
    });
  });

  describe("embed", () => {
    it("should return groups without embed when no embed requested", async () => {
      const groups: Group[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          name: "Embed Test",
          contacts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(groups);

      expect(result).toEqual(groups);
    });

    it("should throw error when embed is requested", async () => {
      const groups: Group[] = [
        {
          id: "embed-test-2",
          project: TEST_PROJECT_ID,
          name: "Embed Test 2",
          contacts: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(groups, ["actions"])).rejects.toThrow(
        "This persistence does not support embed"
      );
    });
  });
});
