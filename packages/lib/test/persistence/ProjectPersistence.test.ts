import type { Project } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ProjectPersistence } from "../../src/persistence/ProjectPersistence";
import { TaskQueue } from "../../src/services/TaskQueue";


// Mock TaskQueue
vi.mock("../../src/services/TaskQueue", () => ({
  TaskQueue: {
    addTask: vi.fn(),
  },
}));

describe("ProjectPersistence", () => {
  let persistence: ProjectPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();


    persistence = new ProjectPersistence();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("getIndexInfo", () => {
    it("should throw error for any key", () => {
      // @ts-expect-error - we expect this to throw
      expect(() => persistence.getIndexInfo("anyKey")).toThrow(
        "No indexes implemented for ProjectPersistence"
      );
    });
  });

  describe("projectItem", () => {
    it("should return item unchanged", () => {
      const project: Project = {
        id: "test-id",
        name: "Test Project",
        secret: "secret-123",
        public: "public-123",
        url: "https://test.example.com",
        eventTypes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(project);

      expect(projected).toEqual(project);
      expect(projected.i_attr1).toBeUndefined();
      expect(projected.i_attr2).toBeUndefined();
    });
  });

  describe("delete", () => {
    it("should delete project and add task to queue", async () => {
      const project = await persistence.create({
        name: "Project to Delete",
        secret: "secret-delete-1",
        public: "public-delete-1",
        url: "https://delete1.example.com",
        eventTypes: [],
      });

      vi.mocked(TaskQueue.addTask).mockClear();

      await persistence.delete(project.id);

      expect(TaskQueue.addTask).toHaveBeenCalledWith({
        type: "batchDeleteRelated",
        payload: {
          type: "PROJECT",
          id: project.id,
        },
      });
    });

    it("should handle deletion of projects with all fields", async () => {
      const project = await persistence.create({
        name: "Full Project to Delete",
        secret: "secret-delete-2",
        public: "public-delete-2",
        url: "https://delete2.example.com",
        email: "contact@example.com",
        from: "noreply@example.com",
        eventTypes: [],
      });

      vi.mocked(TaskQueue.addTask).mockClear();

      await persistence.delete(project.id);

      expect(TaskQueue.addTask).toHaveBeenCalledWith({
        type: "batchDeleteRelated",
        payload: {
          type: "PROJECT",
          id: project.id,
        },
      });
    });
  });

  describe("create and retrieve", () => {
    it("should create a new project with all fields", async () => {
      const projectData = {
        name: "New Project",
        secret: "secret-key-123",
        public: "public-key-123",
        url: "https://example.com",
        eventTypes: [],
      };

      const created = await persistence.create(projectData);

      expect(created).toMatchObject(projectData);
      expect(created.id).toBeTruthy();
      expect(created.createdAt).toBeTruthy();
      expect(created.updatedAt).toBeTruthy();
    });

    it("should retrieve created project", async () => {
      const projectData = {
        name: "Retrievable Project",
        secret: "secret-key-456",
        public: "public-key-456",
        url: "https://retrievable.example.com",
        eventTypes: [],
      };

      const created = await persistence.create(projectData);
      const retrieved = await persistence.get(created.id);

      expect(retrieved).toMatchObject(projectData);
    });
  });

  describe("list and listAll", () => {
    it("should list all projects", async () => {
      // Create test projects
      await persistence.create({
        name: "List Test Project 1",
        secret: "secret-list-1",
        public: "public-list-1",
        url: "https://list1.example.com",
        eventTypes: [],
      });

      await persistence.create({
        name: "List Test Project 2",
        secret: "secret-list-2",
        public: "public-list-2",
        url: "https://list2.example.com",
        eventTypes: [],
      });

      const result = await persistence.list({ limit: 10 });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((p) => p.name && p.url)).toBe(true);
    });
  });

  describe("update", () => {
    it("should update project fields", async () => {
      const project = await persistence.create({
        name: "Original Name",
        secret: "secret-update",
        public: "public-update",
        url: "https://original.example.com",
        eventTypes: [],
      });

      const updated = await persistence.put({
        ...project,
        name: "Updated Name",
        url: "https://updated.example.com",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.url).toBe("https://updated.example.com");
      expect(updated.id).toBe(project.id);
    });
  });

  describe("embed", () => {
    it("should return projects without embed when no embed requested", async () => {
      const projects: Project[] = [
        {
          id: "embed-test-1",
          name: "Embed Test Project",
          secret: "secret-embed-1",
          public: "public-embed-1",
          url: "https://embed1.example.com",
          eventTypes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(projects);

      expect(result).toEqual(projects);
    });

    it("should throw error when embed is requested", async () => {
      const projects: Project[] = [
        {
          id: "embed-test-2",
          name: "Embed Test Project 2",
          secret: "secret-embed-2",
          public: "public-embed-2",
          url: "https://embed2.example.com",
          eventTypes: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(projects, ["actions"])).rejects.toThrow(
        "This persistence does not support embed"
      );
    });
  });
});
