import type { Event } from "@sendra/shared";
import { getPersistenceConfig } from "../../src/services/AppConfig";
import { EventPersistence } from "../../src/persistence/EventPersistence";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDynamoDB, initializeDynamoDB, stopDynamoDB } from "./utils/db";

const TEST_TABLE_NAME = "test-sendra-table";
const TEST_PROJECT_ID = "test-project-123";

describe("EventPersistence", () => {
    let persistence: EventPersistence;

    beforeAll(async () => {
      // Start local DynamoDB
      const db = await getDynamoDB();
      const dbUrl = db.url;
  
      vi.stubEnv("PERSISTENCE_PROVIDER", "local");
      vi.stubEnv("TABLE_NAME", TEST_TABLE_NAME);
      vi.stubEnv("AWS_REGION", "us-east-1");
      vi.stubEnv("AWS_ACCESS_KEY_ID", "dummy");
      vi.stubEnv("AWS_SECRET_ACCESS_KEY", "dummy");
      vi.stubEnv("AWS_ENDPOINT", dbUrl);
  
      // Initialize table
      const { client } = getPersistenceConfig();
      await initializeDynamoDB(client, TEST_TABLE_NAME);
  
      // Now import ActionPersistence after mocks are set up
      persistence = new EventPersistence(TEST_PROJECT_ID);
    });
  
    afterAll(async () => {
      await stopDynamoDB();
      vi.unstubAllEnvs();
    });

  describe("getIndexInfo", () => {
    it("should return correct index info for relation key", () => {
      const indexInfo = persistence.getIndexInfo("relation");

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

    it("should return correct index info for eventType key", () => {
      const indexInfo = persistence.getIndexInfo("eventType");

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
    it("should project relation to i_attr1", () => {
      const event: Event = {
        id: "test-event-1",
        project: TEST_PROJECT_ID,
        eventType: "event-type-1",
        contact: "contact-1",
        relation: "relation-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(event);

      expect(projected.i_attr1).toBe("relation-1");
    });

    it("should project contact to i_attr2", () => {
      const event: Event = {
        id: "test-event-2",
        project: TEST_PROJECT_ID,
        eventType: "event-type-2",
        contact: "contact-2",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(event);

      expect(projected.i_attr2).toBe("contact-2");
    });

    it("should project eventType to i_attr3", () => {
      const event: Event = {
        id: "test-event-3",
        project: TEST_PROJECT_ID,
        eventType: "event-type-3",
        contact: "contact-3",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(event);

      expect(projected.i_attr3).toBe("event-type-3");
    });

    it("should handle optional relation field", () => {
      const event: Event = {
        id: "test-event-4",
        project: TEST_PROJECT_ID,
        eventType: "event-type-4",
        contact: "contact-4",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(event);

      expect(projected.i_attr1).toBeUndefined();
      expect(projected.i_attr2).toBe("contact-4");
      expect(projected.i_attr3).toBe("event-type-4");
    });

    it("should project all index attributes correctly", () => {
      const event: Event = {
        id: "test-event-5",
        project: TEST_PROJECT_ID,
        eventType: "event-type-5",
        contact: "contact-5",
        relation: "relation-5",
        relationType: "ACTION",
        email: "email-5",
        data: { key: "value" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(event);

      expect(projected).toMatchObject({
        ...event,
        i_attr1: "relation-5",
        i_attr2: "contact-5",
        i_attr3: "event-type-5",
      });
    });
  });

  describe("findBy with indexes", () => {
    beforeAll(async () => {
      // Create test events for findBy tests
      await persistence.create({
        project: TEST_PROJECT_ID,
        eventType: "search-event-type",
        contact: "search-contact-1",
        relation: "search-relation-1",
        relationType: "ACTION",
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        eventType: "search-event-type",
        contact: "search-contact-2",
        relation: "search-relation-1",
        relationType: "CAMPAIGN",
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        eventType: "other-event-type",
        contact: "search-contact-1",
        relation: "search-relation-2",
      });
    });

    it("should find events by relation", async () => {
      const result = await persistence.findBy({
        key: "relation",
        value: "search-relation-1",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((item: Event) => item.relation === "search-relation-1")).toBe(true);
    });

    it("should find events by contact", async () => {
      const result = await persistence.findBy({
        key: "contact",
        value: "search-contact-1",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((item: Event) => item.contact === "search-contact-1")).toBe(true);
    });

    it("should find events by eventType", async () => {
      const result = await persistence.findBy({
        key: "eventType",
        value: "search-event-type",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((item: Event) => item.eventType === "search-event-type")).toBe(true);
    });

    it("should throw error for unsupported index key", async () => {
      await expect(
        persistence.findBy({
          key: "unsupported-key",
          value: "some-value",
        })
      ).rejects.toThrow("No index implemented for: unsupported-key");
    });

    it("should respect limit parameter with findBy", async () => {
      const result = await persistence.findBy({
        key: "eventType",
        value: "search-event-type",
        limit: 1,
      });

      expect(result.items.length).toBeLessThanOrEqual(1);
      if (result.items.length === 1) {
        expect(result.hasMore).toBe(true);
        expect(result.cursor).toBeTruthy();
      }
    });
  });

  describe("embed", () => {
    it("should return events without embed when no embed requested", async () => {
      const events: Event[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          eventType: "embed-event-type",
          contact: "embed-contact",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(events);

      expect(result).toEqual(events);
    });

    it("should throw error when embed is requested", async () => {
      const events: Event[] = [
        {
          id: "embed-test-2",
          project: TEST_PROJECT_ID,
          eventType: "embed-event-type",
          contact: "embed-contact",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(() => persistence.embed(events, ["actions"])).rejects.toThrow(
        "This persistence does not support embed"
      );
    });
  });
});

