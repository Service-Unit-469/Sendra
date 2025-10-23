import type { Action } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ActionPersistence } from "../../src/persistence/ActionPersistence";

const TEST_PROJECT_ID = "test-project-123";

describe("ActionPersistence", () => {
  let persistence: ActionPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();

    // Now import ActionPersistence after mocks are set up
    persistence = new ActionPersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("create", () => {
    it("should create a new action", async () => {
      const actionData = {
        project: TEST_PROJECT_ID,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: "template-123",
        events: ["event-1", "event-2"],
        notevents: [],
      };

      const result = await persistence.create(actionData);

      expect(result).toMatchObject({
        ...actionData,
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(result.id).toBeTruthy();
    });

    it("should create an action with notevents", async () => {
      const actionData = {
        project: TEST_PROJECT_ID,
        name: "Test Action with Not Events",
        runOnce: true,
        delay: 3600,
        template: "template-456",
        events: ["event-1"],
        notevents: ["event-3", "event-4"],
      };

      const result = await persistence.create(actionData);

      expect(result).toMatchObject(actionData);
      expect(result.notevents).toEqual(["event-3", "event-4"]);
    });
  });

  describe("get", () => {
    it("should retrieve an action by id", async () => {
      const actionData = {
        project: TEST_PROJECT_ID,
        name: "Retrievable Action",
        runOnce: false,
        delay: 0,
        template: "template-789",
        events: ["event-5"],
        notevents: [],
      };

      const created = await persistence.create(actionData);
      const retrieved = await persistence.get(created.id);

      expect(retrieved).toMatchObject(created);
    });

    it("should return undefined for non-existent action", async () => {
      const result = await persistence.get("non-existent-id");
      expect(result).toBeUndefined();
    });
  });

  describe("put", () => {
    it("should update an existing action", async () => {
      const actionData = {
        project: TEST_PROJECT_ID,
        name: "Original Name",
        runOnce: false,
        delay: 0,
        template: "template-update",
        events: ["event-6"],
        notevents: [],
      };

      const created = await persistence.create(actionData);

      const updated = await persistence.put({
        ...created,
        name: "Updated Name",
        delay: 7200,
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.delay).toBe(7200);
      expect(updated.id).toBe(created.id);
    });
  });

  describe("delete", () => {
    it("should delete an action", async () => {
      const actionData = {
        project: TEST_PROJECT_ID,
        name: "Deletable Action",
        runOnce: false,
        delay: 0,
        template: "template-delete",
        events: ["event-7"],
        notevents: [],
      };

      const created = await persistence.create(actionData);
      await persistence.delete(created.id);

      const retrieved = await persistence.get(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list all actions for a project", async () => {
      // Create multiple actions
      const actions = await Promise.all([
        persistence.create({
          project: TEST_PROJECT_ID,
          name: "Action 1",
          runOnce: false,
          delay: 0,
          template: "template-list-1",
          events: ["event-8"],
          notevents: [],
        }),
        persistence.create({
          project: TEST_PROJECT_ID,
          name: "Action 2",
          runOnce: true,
          delay: 1000,
          template: "template-list-2",
          events: ["event-9"],
          notevents: [],
        }),
      ]);

      const result = await persistence.list();

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.count).toBeGreaterThanOrEqual(2);
    });

    it("should respect limit parameter", async () => {
      const result = await persistence.list({ limit: 1 });

      expect(result.items.length).toBeLessThanOrEqual(1);
      if (result.items.length === 1) {
        expect(result.hasMore).toBe(true);
        expect(result.cursor).toBeTruthy();
      }
    });
  });

  describe("listAll", () => {
    it("should list all actions without pagination", async () => {
      const result = await persistence.listAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("findBy", () => {
    it("should find actions by template", async () => {
      const templateId = "template-findby-123";

      // Create an action with specific template
      await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Findable Action",
        runOnce: false,
        delay: 0,
        template: templateId,
        events: ["event-10"],
        notevents: [],
      });

      const result = await persistence.findBy({
        key: "template",
        value: templateId,
      });

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(
        result.items.every((item: Action) => item.template === templateId)
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
  });

  describe("batchGet", () => {
    it("should retrieve multiple actions by ids", async () => {
      const actions = await Promise.all([
        persistence.create({
          project: TEST_PROJECT_ID,
          name: "Batch Action 1",
          runOnce: false,
          delay: 0,
          template: "template-batch-1",
          events: ["event-11"],
          notevents: [],
        }),
        persistence.create({
          project: TEST_PROJECT_ID,
          name: "Batch Action 2",
          runOnce: false,
          delay: 0,
          template: "template-batch-2",
          events: ["event-12"],
          notevents: [],
        }),
      ]);

      const ids = actions.map((a) => a.id);
      const result = await persistence.batchGet([...ids]); // Pass a copy since batchGet mutates the array

      expect(result.length).toBe(2);
      expect(result.map((r: Action) => r.id).sort()).toEqual(ids.sort());
    });

    it("should return empty array for empty ids list", async () => {
      const result = await persistence.batchGet([]);
      expect(result).toEqual([]);
    });
  });

  describe("batchDelete", () => {
    it("should delete multiple actions", async () => {
      const actions = await Promise.all([
        persistence.create({
          project: TEST_PROJECT_ID,
          name: "Batch Delete 1",
          runOnce: false,
          delay: 0,
          template: "template-batchdel-1",
          events: ["event-13"],
          notevents: [],
        }),
        persistence.create({
          project: TEST_PROJECT_ID,
          name: "Batch Delete 2",
          runOnce: false,
          delay: 0,
          template: "template-batchdel-2",
          events: ["event-14"],
          notevents: [],
        }),
      ]);

      const ids = actions.map((a) => a.id);
      await persistence.batchDelete(ids);

      const retrieved = await persistence.batchGet(ids);
      expect(retrieved.length).toBe(0);
    });
  });

  describe("getRelated", () => {
    it("should find actions with shared events", async () => {
      const sharedEventId = "shared-event-123";

      const action1 = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Action with Shared Event",
        runOnce: false,
        delay: 0,
        template: "template-related-1",
        events: [sharedEventId, "event-15"],
        notevents: [],
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Related Action",
        runOnce: false,
        delay: 0,
        template: "template-related-2",
        events: [sharedEventId, "event-16"],
        notevents: [],
      });

      const related = await persistence.getRelated(action1.id);

      expect(related.length).toBeGreaterThanOrEqual(1);
      expect(related.every((r: Action) => r.id !== action1.id)).toBe(true);
      expect(
        related.some((r: Action) => r.events.includes(sharedEventId))
      ).toBe(true);
    });

    it("should find actions with shared template", async () => {
      const sharedTemplateId = "shared-template-456";

      const action1 = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Action with Shared Template",
        runOnce: false,
        delay: 0,
        template: sharedTemplateId,
        events: ["event-17"],
        notevents: [],
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Related Action by Template",
        runOnce: false,
        delay: 0,
        template: sharedTemplateId,
        events: ["event-18"],
        notevents: [],
      });

      const related = await persistence.getRelated(action1.id);

      expect(related.length).toBeGreaterThanOrEqual(1);
      expect(related.some((r: Action) => r.template === sharedTemplateId)).toBe(
        true
      );
    });

    it("should find actions with shared notevents", async () => {
      const sharedNoteventId = "shared-notevent-789";

      const action1 = await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Action with Shared Notevent",
        runOnce: false,
        delay: 0,
        template: "template-notevent-1",
        events: ["event-19"],
        notevents: [sharedNoteventId],
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        name: "Related Action by Notevent",
        runOnce: false,
        delay: 0,
        template: "template-notevent-2",
        events: ["event-20"],
        notevents: [sharedNoteventId],
      });

      const related = await persistence.getRelated(action1.id);

      expect(related.length).toBeGreaterThanOrEqual(1);
      expect(
        related.some((r: Action) => r.notevents.includes(sharedNoteventId))
      ).toBe(true);
    });

    it("should return empty array for non-existent action", async () => {
      const related = await persistence.getRelated("non-existent-id");
      expect(related).toEqual([]);
    });
  });

  describe("projectItem", () => {
    it("should project template to i_attr1", () => {
      const action: Action = {
        id: "test-id",
        project: TEST_PROJECT_ID,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: "template-project",
        events: ["event-21"],
        notevents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(action);

      expect(projected.i_attr1).toBe("template-project");
    });
  });

  describe("getIndexInfo", () => {
    it("should return correct index info for template key", () => {
      const indexInfo = persistence.getIndexInfo("template");

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

  describe("embed", () => {
    it("should return actions without embed when no embed requested", async () => {
      const actions: Action[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          name: "Embed Test Action",
          runOnce: false,
          delay: 0,
          template: "template-embed",
          events: ["event-22"],
          notevents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(actions);

      expect(result).toEqual(actions);
    });
  });
});
