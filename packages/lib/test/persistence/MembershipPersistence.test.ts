import type { Membership } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { MembershipPersistence } from "../../src/persistence/MembershipPersistence";

const TEST_PROJECT_ID_1 = "test-project-123";
const TEST_PROJECT_ID_2 = "test-project-456";
const TEST_USER_ID_1 = "test-user-123";
const TEST_USER_ID_2 = "test-user-456";

describe("MembershipPersistence", () => {
  let persistence: MembershipPersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();

    persistence = new MembershipPersistence();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("getIndexInfo", () => {
    it("should return correct index info for user key", () => {
      const indexInfo = persistence.getIndexInfo("user");

      expect(indexInfo).toEqual({
        type: "local",
        indexName: "ATTR_1",
        rangeKey: "i_attr1",
      });
    });

    it("should return correct index info for project key", () => {
      const indexInfo = persistence.getIndexInfo("project");

      expect(indexInfo).toEqual({
        type: "local",
        indexName: "ATTR_2",
        rangeKey: "i_attr2",
      });
    });

    it("should return correct index info for email key", () => {
      const indexInfo = persistence.getIndexInfo("email");

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
    it("should project membership attributes to index fields", () => {
      const membership: Membership = {
        id: "test-id",
        project: TEST_PROJECT_ID_1,
        user: TEST_USER_ID_1,
        email: "user@example.com",
        role: "ADMIN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const projected = persistence.projectItem(membership);

      expect(projected.i_attr1).toBe(TEST_USER_ID_1);
      expect(projected.i_attr2).toBe(TEST_PROJECT_ID_1);
      expect(projected.i_attr3).toBe("user@example.com");
    });
  });

  describe("getProjectMemberships", () => {
    it("should retrieve all memberships for a project", async () => {
      // Create memberships for project 1
      await persistence.create({
        project: TEST_PROJECT_ID_1,
        user: TEST_USER_ID_1,
        email: "user1@example.com",
        role: "ADMIN",
      });

      await persistence.create({
        project: TEST_PROJECT_ID_1,
        user: TEST_USER_ID_2,
        email: "user2@example.com",
        role: "MEMBER",
      });

      // Create membership for project 2
      await persistence.create({
        project: TEST_PROJECT_ID_2,
        user: TEST_USER_ID_1,
        email: "user1@example.com",
        role: "MEMBER",
      });

      const memberships = await persistence.getProjectMemberships(
        TEST_PROJECT_ID_1
      );

      expect(memberships.length).toBe(2);
      expect(memberships.every((m) => m.project === TEST_PROJECT_ID_1)).toBe(
        true
      );
    });

    it("should return empty array for project with no memberships", async () => {
      const memberships = await persistence.getProjectMemberships(
        "nonexistent-project"
      );

      expect(memberships).toEqual([]);
    });
  });

  describe("getUserMemberships", () => {
    it("should retrieve all memberships for a user", async () => {
      const userId = "user-with-multiple-projects";

      // Create memberships for user
      await persistence.create({
        project: "project-a",
        user: userId,
        email: "user@example.com",
        role: "ADMIN",
      });

      await persistence.create({
        project: "project-b",
        user: userId,
        email: "user@example.com",
        role: "MEMBER",
      });

      // Create membership for another user
      await persistence.create({
        project: "project-c",
        user: "another-user",
        email: "another@example.com",
        role: "MEMBER",
      });

      const memberships = await persistence.getUserMemberships(userId);

      expect(memberships.length).toBe(2);
      expect(memberships.every((m) => m.user === userId)).toBe(true);
    });

    it("should return empty array for user with no memberships", async () => {
      const memberships = await persistence.getUserMemberships(
        "nonexistent-user"
      );

      expect(memberships).toEqual([]);
    });
  });

  describe("isMember", () => {
    it("should return true for user who is a member of project", async () => {
      const projectId = "membership-test-project";
      const userId = "membership-test-user";

      await persistence.create({
        project: projectId,
        user: userId,
        email: "member@example.com",
        role: "MEMBER",
      });

      const result = await persistence.isMember(projectId, userId);

      expect(result).toBe(true);
    });

    it("should return false for user who is not a member of project", async () => {
      const result = await persistence.isMember(
        "project-123",
        "non-member-user"
      );

      expect(result).toBe(false);
    });

    it("should return true for admin users", async () => {
      const projectId = "admin-test-project";
      const userId = "admin-test-user";

      await persistence.create({
        project: projectId,
        user: userId,
        email: "admin@example.com",
        role: "ADMIN",
      });

      const result = await persistence.isMember(projectId, userId);

      expect(result).toBe(true);
    });
  });

  describe("isAdmin", () => {
    it("should return true for user who is an admin of project", async () => {
      const projectId = "admin-check-project";
      const userId = "admin-check-user";

      await persistence.create({
        project: projectId,
        user: userId,
        email: "admin@example.com",
        role: "ADMIN",
      });

      const result = await persistence.isAdmin(projectId, userId);

      expect(result).toBe(true);
    });

    it("should return false for user who is a member but not admin", async () => {
      const projectId = "member-check-project";
      const userId = "member-check-user";

      await persistence.create({
        project: projectId,
        user: userId,
        email: "member@example.com",
        role: "MEMBER",
      });

      const result = await persistence.isAdmin(projectId, userId);

      expect(result).toBe(false);
    });

    it("should return false for user who is not a member of project", async () => {
      const result = await persistence.isAdmin("project-789", "non-admin-user");

      expect(result).toBe(false);
    });
  });

  describe("findBy", () => {
    it("should find memberships by user", async () => {
      const userId = "findby-user-test";

      await persistence.create({
        project: "project-x",
        user: userId,
        email: "user@example.com",
        role: "MEMBER",
      });

      const result = await persistence.findBy({
        key: "user",
        value: userId,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].user).toBe(userId);
    });

    it("should find memberships by project", async () => {
      const projectId = "findby-project-test";

      await persistence.create({
        project: projectId,
        user: "user-1",
        email: "user1@example.com",
        role: "ADMIN",
      });

      const result = await persistence.findBy({
        key: "project",
        value: projectId,
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].project).toBe(projectId);
    });

    it("should find memberships by email", async () => {
      const email = "findby@example.com";

      await persistence.create({
        project: "project-y",
        user: "user-y",
        email,
        role: "MEMBER",
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
    it("should return memberships without embed when no embed requested", async () => {
      const memberships: Membership[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID_1,
          user: TEST_USER_ID_1,
          email: "embed@example.com",
          role: "MEMBER",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = await persistence.embed(memberships);

      expect(result).toEqual(memberships);
    });

    it("should throw error when embed is requested", async () => {
      const memberships: Membership[] = [
        {
          id: "embed-test-2",
          project: TEST_PROJECT_ID_1,
          user: TEST_USER_ID_1,
          email: "embed@example.com",
          role: "ADMIN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await expect(persistence.embed(memberships, ["actions"])).rejects.toThrow(
        "This persistence does not support embed"
      );
    });
  });
});
