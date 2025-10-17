import type { EventType } from "@sendra/shared";
import { getPersistenceConfig } from "../../src/services/AppConfig";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDynamoDB, initializeDynamoDB, stopDynamoDB } from "./utils/db";
import { EventTypePersistence } from "../../src/persistence/EventTypePersistence";
import { TaskQueue } from "../../src/services/TaskQueue";

const TEST_TABLE_NAME = "test-sendra-table";
const TEST_PROJECT_ID = "test-project-123";

// Mock TaskQueue
vi.mock("../../src/services/TaskQueue", () => ({
  TaskQueue: {
    addTask: vi.fn(),
  },
}));

describe("EventTypePersistence", () => {
  let persistence: EventTypePersistence;

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

    persistence = new EventTypePersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
    vi.unstubAllEnvs();
  });

  describe("getByName", () => {
    it("should retrieve an event type by name", async () => {
      const eventTypeData = {
        project: TEST_PROJECT_ID,
        name: "user.signup",
      };

      await persistence.create(eventTypeData);
      const retrieved = await persistence.getByName("user.signup");

      expect(retrieved).toMatchObject(eventTypeData);
      expect(retrieved?.id).toBeTruthy();
    });

    it("should return undefined for non-existent name", async () => {
      const result = await persistence.getByName("nonexistent.event");
      expect(result).toBeUndefined();
    });

    it("should only return event types from the same project", async () => {
      const name = "shared.event";
      const persistence2 = new EventTypePersistence("another-project");

      // Create event type in project 1
      await persistence.create({
        project: TEST_PROJECT_ID,
        name,
      });

      // Create event type in project 2
      await persistence2.create({
        project: "another-project",
        name,
      });

      // Query from project 1 should only return project 1 event type
      const result1 = await persistence.getByName(name);
      expect(result1?.project).toBe(TEST_PROJECT_ID);

      // Query from project 2 should only return project 2 event type
      const result2 = await persistence2.getByName(name);
      expect(result2?.project).toBe("another-project");
    });
  });

  describe("getIndexInfo", () => {
    it("should return correct index info for name key", () => {
      const indexInfo = persistence.getIndexInfo("name");

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
    it("should project name to i_attr1", () => {
      const eventType: EventType = {
        id: "test-id",
        project: TEST_PROJECT_ID,
        name: "order.completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(eventType);

      expect(projected.i_attr1).toBe("order.completed");
    });
  });

  describe("delete", () => {
    it("should delete event type and add task to queue", async () => {
      const eventType = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "event.to.delete",
      });

      vi.mocked(TaskQueue.addTask).mockClear();

      await persistence.delete(eventType.id);

      expect(TaskQueue.addTask).toHaveBeenCalledWith({
        type: "batchDeleteRelated",
        payload: {
          project: TEST_PROJECT_ID,
          type: "EVENT_TYPE",
          id: eventType.id,
        },
      });
    });
  });

  describe("findBy name", () => {
    it("should find event types by name using findBy method", async () => {
      const name = "findby.test.event";

      await persistence.create({
        project: TEST_PROJECT_ID,
        name,
      });

      const result = await persistence.findBy({
        key: "name",
        value: name,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe(name);
    });

    it("should handle begins_with comparator for name", async () => {
      await persistence.create({
        project: TEST_PROJECT_ID,
        name: "analytics.page.view",
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        name: "analytics.button.click",
      });

      const result = await persistence.findBy({
        key: "name",
        value: "analytics.",
        comparator: "begins_with",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((et) => et.name.startsWith("analytics."))).toBe(true);
    });
  });

  describe("embed", () => {
    it("should return event types without embed when no embed requested", async () => {
      const eventTypes: EventType[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          name: "embed.test",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(eventTypes);

      expect(result).toEqual(eventTypes);
    });
  });
});

