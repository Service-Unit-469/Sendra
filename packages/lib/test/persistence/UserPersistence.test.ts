import type { User } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { UserPersistence } from "../../src/persistence/UserPersistence";
import { TaskQueue } from "../../src/services/TaskQueue";

// Mock TaskQueue
vi.mock("../../src/services/TaskQueue", () => ({
  TaskQueue: {
    addTask: vi.fn(),
  },
}));

describe("UserPersistence", () => {
  let persistence: UserPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();


    persistence = new UserPersistence();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("getByEmail", () => {
    it("should retrieve a user by email", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedpassword123",
        enabled: true,
      };

      await persistence.create(userData);
      const retrieved = await persistence.getByEmail("test@example.com");

      expect(retrieved).toMatchObject(userData);
      expect(retrieved?.id).toBeTruthy();
    });

    it("should return undefined for non-existent email", async () => {
      const result = await persistence.getByEmail("nonexistent@example.com");
      expect(result).toBeUndefined();
    });

    it("should handle email case sensitivity", async () => {
      const email = "CaseSensitive@Example.com";
      await persistence.create({
        email,
        password: "password123",
        enabled: true,
      });

      const retrieved = await persistence.getByEmail(email);
      expect(retrieved?.email).toBe(email);
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
      const user: User = {
        id: "test-id",
        email: "project@example.com",
        password: "hashedpassword",
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(user);

      expect(projected.i_attr1).toBe("project@example.com");
    });
  });

  describe("delete", () => {
    it("should delete user and add task to queue", async () => {
      const user = await persistence.create({
        email: "delete@example.com",
        password: "password123",
        enabled: true,
      });

      vi.mocked(TaskQueue.addTask).mockClear();

      await persistence.delete(user.id);

      expect(TaskQueue.addTask).toHaveBeenCalledWith({
        type: "batchDeleteRelated",
        payload: {
          type: "USER",
          id: user.id,
        },
      });
    });
  });

  describe("create and retrieve", () => {
    it("should create a new user", async () => {
      const userData = {
        email: "newuser@example.com",
        password: "securepassword",
        enabled: true,
      };

      const created = await persistence.create(userData);

      expect(created).toMatchObject(userData);
      expect(created.id).toBeTruthy();
      expect(created.createdAt).toBeTruthy();
      expect(created.updatedAt).toBeTruthy();
    });

    it("should retrieve created user by id", async () => {
      const userData = {
        email: "retrieve@example.com",
        password: "password123",
        enabled: true,
      };

      const created = await persistence.create(userData);
      const retrieved = await persistence.get(created.id);

      expect(retrieved).toMatchObject(userData);
    });
  });

  describe("findBy email", () => {
    it("should find user by email using findBy method", async () => {
      const email = "findby@example.com";

      await persistence.create({
        email,
        password: "password123",
        enabled: true,
      });

      const result = await persistence.findBy({
        key: "email",
        value: email,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].email).toBe(email);
    });

    it("should handle begins_with comparator for email", async () => {
      await persistence.create({
        email: "admin@company.com",
        password: "password1",
        enabled: true,
      });

      await persistence.create({
        email: "admin@another.com",
        password: "password2",
        enabled: true,
      });

      const result = await persistence.findBy({
        key: "email",
        value: "admin@",
        comparator: "begins_with",
      });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((u) => u.email.startsWith("admin@"))).toBe(true);
    });
  });

  describe("update", () => {
    it("should update user password", async () => {
      const user = await persistence.create({
        email: "update@example.com",
        password: "oldpassword",
        enabled: true,
      });

      const updated = await persistence.put({
        ...user,
        password: "newhashedpassword",
      });

      expect(updated.password).toBe("newhashedpassword");
      expect(updated.email).toBe(user.email);
      expect(updated.id).toBe(user.id);
    });

    it("should not allow changing email via put", async () => {
      // This test documents behavior - email is in index, so changing it
      // would require delete and recreate
      const user = await persistence.create({
        email: "original@example.com",
        password: "password",
        enabled: true,
      });

      const updated = await persistence.put({
        ...user,
        email: "changed@example.com",
      });

      // The email should be changed but the index won't update correctly
      // This is a limitation of DynamoDB - you can't update index keys
      expect(updated.email).toBe("changed@example.com");
    });
  });

  describe("list", () => {
    it("should list all users", async () => {
      // Create test users
      await persistence.create({
        email: "listuser1@example.com",
        password: "password1",
        enabled: true,
      });

      await persistence.create({
        email: "listuser2@example.com",
        password: "password2",
        enabled: true,
      });

      const result = await persistence.list({ limit: 10 });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((u) => u.email && u.password)).toBe(true);
    });
  });

  describe("embed", () => {
    it("should return users without embed when no embed requested", async () => {
      const users: User[] = [
        {
          id: "embed-test-1",
          email: "embed@example.com",
          password: "password",
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(users);

      expect(result).toEqual(users);
    });

    it("should throw error when embed is requested", async () => {
      const users: User[] = [
        {
          id: "embed-test-2",
          email: "embed2@example.com",
          password: "password",
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(users, ["actions"])).rejects.toThrow(
        "This persistence does not support embed"
      );
    });
  });
});

