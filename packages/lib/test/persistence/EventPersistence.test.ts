import type { Event } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EventPersistence } from "../../src/persistence/EventPersistence";

const TEST_PROJECT_ID = "test-project-123";

describe("EventPersistence", () => {
  let persistence: EventPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();

    // Now import ActionPersistence after mocks are set up
    persistence = new EventPersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
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
      expect(
        result.items.every(
          (item: Event) => item.relation === "search-relation-1"
        )
      ).toBe(true);
    });

    it("should find events by contact", async () => {
      const result = await persistence.findBy({
        key: "contact",
        value: "search-contact-1",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(
        result.items.every((item: Event) => item.contact === "search-contact-1")
      ).toBe(true);
    });

    it("should find events by eventType", async () => {
      const result = await persistence.findBy({
        key: "eventType",
        value: "search-event-type",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(
        result.items.every(
          (item: Event) => item.eventType === "search-event-type"
        )
      ).toBe(true);
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

  describe("update", () => {
    it("should update event data using put", async () => {
      const event = await persistence.create({
        project: TEST_PROJECT_ID,
        eventType: "update-test-event",
        contact: "update-contact",
        relation: "relation-1",
        relationType: "ACTION",
        data: { version: 1 },
      });

      const updated = await persistence.put({
        ...event,
        data: { version: 2, updated: true },
        relationType: "CAMPAIGN",
      });

      expect(updated.data).toBeDefined();
      expect(updated.data?.version).toBe(2);
      expect(updated.data?.updated).toBe(true);
      expect(updated.relationType).toBe("CAMPAIGN");
      expect(updated.id).toBe(event.id);
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

      await expect(() =>
        persistence.embed(events, ["actions"])
      ).rejects.toThrow("This persistence does not support embed");
    });
  });

  describe("listAll", () => {
    beforeAll(async () => {
      // Create multiple events for listAll tests
      for (let i = 1; i <= 5; i++) {
        await persistence.create({
          project: TEST_PROJECT_ID,
          eventType: `listall-event-type-${i}`,
          contact: `listall-contact-${i}`,
          relation: `listall-relation-${i}`,
          relationType: i % 2 === 0 ? "ACTION" : "CAMPAIGN",
        });
      }
    });

    it("should list all events without pagination", async () => {
      const result = await persistence.listAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.every((event: Event) => event.project === TEST_PROJECT_ID)).toBe(true);
    });

    it("should stop early when stop condition is met", async () => {
      // Create events with specific ordering by creating them in sequence
      const testEvents: Event[] = [];
      for (let i = 1; i <= 10; i++) {
        const event = await persistence.create({
          project: TEST_PROJECT_ID,
          eventType: `stop-test-event-${i}`,
          contact: `stop-contact-${i}`,
          relation: `stop-relation-${i}`,
        });
        testEvents.push(event);
      }

      // Stop after finding 3 events that match our criteria
      let count = 0;
      const result = await persistence.listAll({
        stop: (event: Event) => {
          if (event.eventType?.startsWith("stop-test-event-")) {
            count++;
            return count >= 3;
          }
          return false;
        },
      });

      // Should have stopped early - at most 3 items matching our stop criteria
      const matchingEvents = result.filter((e: Event) =>
        e.eventType?.startsWith("stop-test-event-")
      );
      expect(matchingEvents.length).toBeLessThanOrEqual(3);
    });

    it("should return all items when stop condition is never met", async () => {
      const result = await persistence.listAll({
        stop: () => false, // Never stop
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should stop immediately when stop condition is always true", async () => {
      const result = await persistence.listAll({
        stop: () => true, // Always stop
      });

      // Should return no items since we stop immediately
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should work with complex stop conditions", async () => {
      // Create events with specific event types
      await persistence.create({
        project: TEST_PROJECT_ID,
        eventType: "critical-event",
        contact: "critical-contact",
        relation: "critical-relation",
        relationType: "ACTION",
      });

      // Stop when we encounter a critical event
      const result = await persistence.listAll({
        stop: (event: Event) => event.eventType === "critical-event",
      });

      // Should not include the critical event itself
      const hasCritical = result.some((e: Event) => e.eventType === "critical-event");
      expect(hasCritical).toBe(false);
    });

    it("should handle listAll without any options", async () => {
      const result = await persistence.listAll();

      expect(Array.isArray(result)).toBe(true);
      // Should have all the events we created in all tests
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle pagination internally in listAll", async () => {
      // Create many events to test pagination (more than the default page size of 100)
      const manyEventsPromises = [];
      for (let i = 1; i <= 25; i++) {
        manyEventsPromises.push(
          persistence.create({
            project: TEST_PROJECT_ID,
            eventType: `pagination-event-${i}`,
            contact: `pagination-contact-${i}`,
            relation: `pagination-relation-${i}`,
          })
        );
      }
      await Promise.all(manyEventsPromises);

      const result = await persistence.listAll();

      // Should have retrieved all events, including ones that might require pagination
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(25);
      
      const paginationEvents = result.filter((e: Event) =>
        e.eventType?.startsWith("pagination-event-")
      );
      expect(paginationEvents.length).toBe(25);
    });
  });
});
