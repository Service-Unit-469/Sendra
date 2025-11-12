import type { Email } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EmailPersistence } from "../../src/persistence/EmailPersistence";

const TEST_PROJECT_ID = "test-project-123";

describe("EmailPersistence", () => {
  let persistence: EmailPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();


    persistence = new EmailPersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("getByMessageId", () => {
    it("should retrieve an email by messageId", async () => {
      const emailData = {
        project: TEST_PROJECT_ID,
        contact: "contact-123",
        email: "test@example.com",  
        subject: "Test Email",
        body: {
          html: "<p>Test body</p>",
          plainText: "Test body",
        },
        sendType: "TRANSACTIONAL" as const,
        status: "DELIVERED" as const,
        source: "campaign-123",
        messageId: "unique-message-id-123",
      };

      await persistence.create(emailData);
      const retrieved = await EmailPersistence.getByMessageId("unique-message-id-123");

      expect(retrieved).toMatchObject(emailData);
      expect(retrieved?.id).toBeTruthy();
    });

    it("should return undefined for non-existent messageId", async () => {
      const result = await EmailPersistence.getByMessageId("nonexistent-message-id");
      expect(result).toBeUndefined();
    });

    it("should work across different projects", async () => {
      const messageId = "cross-project-message-id";
      const persistence2 = new EmailPersistence("another-project");

      await persistence2.create({
        project: "another-project",
        contact: "contact-456",
        email: "another@example.com",
        subject: "Another Project Email",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        sendType: "TRANSACTIONAL" as const,
        status: "SENT" as const,
        source: "campaign-456",
        messageId,
      });

      const retrieved = await EmailPersistence.getByMessageId(messageId);
      expect(retrieved?.project).toBe("another-project");
    });
  });

  describe("getIndexInfo", () => {
    it("should return correct index info for source key", () => {
      const indexInfo = persistence.getIndexInfo("source");

      expect(indexInfo).toEqual({
        type: "local",
        indexName: "ATTR_1",
        rangeKey: "i_attr1",
      });
    });

    it("should return correct index info for contact key", () => {
      const indexInfo = persistence.getIndexInfo("contact");

      expect(indexInfo).toEqual({
        type: "local",
        indexName: "ATTR_2",
        rangeKey: "i_attr2",
      });
    });

    it("should return correct index info for messageId key", () => {
      const indexInfo = persistence.getIndexInfo("messageId");

      expect(indexInfo).toEqual({
        type: "local",
        indexName: "ATTR_3",
        rangeKey: "i_attr3",
      });
    });

    it("should throw error for unsupported key", () => {
      expect(() => persistence.getIndexInfo("unsupported")).toThrow(
        "No index implemented for: unsupported"
      );
    });
  });

  describe("projectItem", () => {
    it("should project all email attributes to index fields", () => {
      const email: Email = {
        id: "test-id",
        project: TEST_PROJECT_ID,
        contact: "contact-id-123",
        email: "recipient@example.com",
        subject: "Test Subject",
        body: {
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        sendType: "MARKETING",
        status: "DELIVERED",
        source: "campaign-id-456",
        messageId: "message-id-789",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(email);

      expect(projected.i_attr1).toBe("campaign-id-456");
      expect(projected.i_attr2).toBe("contact-id-123");
      expect(projected.i_attr3).toBe("message-id-789");
    });
  });

  describe("findBy source", () => {
    it("should find emails by source using findBy method", async () => {
      const source = "campaign-findby-test";

      await persistence.create({
        project: TEST_PROJECT_ID,
        contact: "contact-1",
        email: "email1@example.com",
        subject: "Email 1",
        body: {
          html: "<p>Body 1</p>",
          plainText: "Body 1",
        },
        sendType: "MARKETING" as const,
        status: "SENT" as const,
        source,
        messageId: "msg-1",
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        contact: "contact-2",
        email: "email2@example.com",
        subject: "Email 2",
        body: {
          html: "<p>Body 2</p>",
          plainText: "Body 2",
        },
        sendType: "MARKETING" as const,
        status: "SENT" as const,
        source,
        messageId: "msg-2",
      });

      const result = await persistence.findBy({
        key: "source",
        value: source,
      });

      expect(result.items.length).toBe(2);
      expect(result.items.every((email) => email.source === source)).toBe(true);
    });
  });

  describe("findBy contact", () => {
    it("should find emails by contact using findBy method", async () => {
      const contactId = "contact-findby-test-123";

      await persistence.create({
        project: TEST_PROJECT_ID,
        contact: contactId,
        email: "contact@example.com",
        subject: "Email to Contact",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        sendType: "TRANSACTIONAL" as const,
        status: "DELIVERED" as const,
        source: "source-1",
        messageId: "msg-contact-1",
      });

      const result = await persistence.findBy({
        key: "contact",
        value: contactId,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].contact).toBe(contactId);
    });
  });

  describe("findBy messageId", () => {
    it("should find email by messageId using findBy method", async () => {
      const messageId = "unique-findby-message-id";

      await persistence.create({
        project: TEST_PROJECT_ID,
        contact: "contact-123",
        email: "messageid@example.com",
        subject: "Message ID Test",
        body: {
          html: "<p>Body</p>",
          plainText: "Body",
        },
        sendType: "MARKETING" as const,
        status: "OPENED" as const,
        source: "source-1",
        messageId,
      });

      const result = await persistence.findBy({
        key: "messageId",
        value: messageId,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].messageId).toBe(messageId);
    });
  });

  describe("update", () => {
    it("should update email status using put", async () => {
      const email = await persistence.create({
        project: TEST_PROJECT_ID,
        contact: "contact-update",
        email: "update@example.com",
        subject: "Test Email",
        body: {
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        sendType: "MARKETING" as const,
        status: "SENT" as const,
        source: "source-update",
        messageId: "msg-update-123",
      });

      const updated = await persistence.put({
        ...email,
        status: "DELIVERED" as const,
      });

      expect(updated.status).toBe("DELIVERED");
      expect(updated.id).toBe(email.id);
      expect(updated.messageId).toBe(email.messageId);
    });
  });

  describe("embed", () => {
    it("should return emails without embed when no embed requested", async () => {
      const emails: Email[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          contact: "contact-1",
          email: "embed1@example.com",
          subject: "Subject",
          body: {
            html: "<p>Body</p>",
            plainText: "Body",
          },
          sendType: "MARKETING",
          status: "DELIVERED",
          source: "source-1",
          messageId: "msg-embed-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(emails);

      expect(result).toEqual(emails);
    });

    it("should throw error when embed is requested", async () => {
      const emails: Email[] = [
        {
          id: "embed-test-2",
          project: TEST_PROJECT_ID,
          contact: "contact-2",
          email: "embed2@example.com",
          subject: "Subject",
          body: {
            html: "<p>Body</p>",
            plainText: "Body",
          },
          sendType: "TRANSACTIONAL",
          status: "SENT",
          source: "source-2",
          messageId: "msg-embed-2",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(emails, ["actions"])).rejects.toThrow(
        "This persistence does not support embed"
      );
    });
  });
});

