import {
  ContactPersistence,
  GroupPersistence,
  MembershipPersistence,
  ProjectPersistence,
  UserPersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import { createTestContact, createTestSetup } from "../../utils/test-helpers";

describe("Groups Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  // Helper function to create a test group
  const createTestGroup = async (projectId: string) => {
    const groupPersistence = new GroupPersistence(projectId);
    return await groupPersistence.create({
      project: projectId,
      name: `Test Group ${Date.now()}`,
      contacts: [],
    });
  };

  describe("POST /projects/:projectId/groups", () => {
    test("should successfully create a new group", async () => {
      const { project, token } = await createTestSetup();

      const groupPayload = {
        name: "Marketing List",
        contacts: [],
      };

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        name: "Marketing List",
        contacts: [],
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should create group with contact IDs", async () => {
      const { project, token } = await createTestSetup();
      
      // Create test contacts
      const contact1 = await createTestContact(project.id, "contact1@example.com");
      const contact2 = await createTestContact(project.id, "contact2@example.com");

      const groupPayload = {
        name: "VIP Customers",
        contacts: [contact1.id, contact2.id],
      };

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        name: "VIP Customers",
        contacts: expect.arrayContaining([contact1.id, contact2.id]),
      });
      expect(data.contacts).toHaveLength(2);
    });

    test("should return 400 when name is missing", async () => {
      const { project, token } = await createTestSetup();

      const groupPayload = {
        contacts: [],
      };

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const groupPayload = {
        name: "Test Group",
        contacts: [],
      };

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project does not exist", async () => {
      const { token } = await createTestSetup();

      const groupPayload = {
        name: "Test Group",
        contacts: [],
      };

      const response = await app.request("/projects/non-existent-project/groups", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /projects/:projectId/groups", () => {
    test("should list groups with pagination", async () => {
      const { project, token } = await createTestSetup();

      // Create multiple groups
      await createTestGroup(project.id);
      await createTestGroup(project.id);
      await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups?limit=2`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("hasMore");
      expect(data.items).toBeInstanceOf(Array);
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    test("should list all groups without pagination", async () => {
      const { project, token } = await createTestSetup();

      // Create test groups
      await createTestGroup(project.id);
      await createTestGroup(project.id);

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items).toBeInstanceOf(Array);
      expect(data.items.length).toBeGreaterThanOrEqual(2);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/:projectId/groups/all", () => {
    test("should list all groups without pagination", async () => {
      const { project, token } = await createTestSetup();

      // Create test groups
      const group1 = await createTestGroup(project.id);
      const group2 = await createTestGroup(project.id);

      const response = await app.request(`/projects/${project.id}/groups/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      // Verify structure of group objects
      const foundGroup = data.find((g: any) => g.id === group1.id);
      expect(foundGroup).toMatchObject({
        id: group1.id,
        name: group1.name,
        project: project.id,
      });
    });

    test("should return empty array when no groups exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/groups/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeInstanceOf(Array);
      expect(data).toHaveLength(0);
    });
  });

  describe("GET /projects/:projectId/groups/:groupId", () => {
    test("should retrieve a specific group by ID", async () => {
      const { project, token } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: group.id,
        name: group.name,
        contacts: [],
        project: project.id,
      });
    });

    test("should return 404 when group does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/groups/non-existent-id`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("group");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "GET",
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /projects/:projectId/groups/:groupId", () => {
    test("should successfully update a group", async () => {
      const { project, token } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const updatePayload = {
        id: group.id,
        name: "Updated Group Name",
        contacts: [],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: group.id,
        name: "Updated Group Name",
        project: project.id,
      });
    });

    test("should update group contacts", async () => {
      const { project, token } = await createTestSetup();
      const group = await createTestGroup(project.id);
      
      const contact1 = await createTestContact(project.id, "contact1@example.com");
      const contact2 = await createTestContact(project.id, "contact2@example.com");

      const updatePayload = {
        id: group.id,
        name: group.name,
        contacts: [contact1.id, contact2.id],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contacts).toEqual(expect.arrayContaining([contact1.id, contact2.id]));
      expect(data.contacts).toHaveLength(2);
    });

    test("should return 400 when ID mismatch", async () => {
      const { project, token } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const updatePayload = {
        id: "different-id",
        name: "Updated Name",
        contacts: [],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("ID mismatch");
    });

    test("should return 404 when group does not exist", async () => {
      const { project, token } = await createTestSetup();

      const updatePayload = {
        id: "non-existent-id",
        name: "Updated Name",
        contacts: [],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/non-existent-id`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(404);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const updatePayload = {
        id: group.id,
        name: "Updated Name",
        contacts: [],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /projects/:projectId/groups/:groupId", () => {
    test("should successfully delete a group", async () => {
      const { project, token } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      // Verify group was deleted
      const groupPersistence = new GroupPersistence(project.id);
      const deletedGroup = await groupPersistence.get(group.id);
      expect(deletedGroup).toBeUndefined();
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "DELETE",
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/:projectId/groups/:groupId/contacts", () => {
    test("should retrieve all contacts in a group", async () => {
      const { project, token } = await createTestSetup();
      
      // Create contacts
      const contact1 = await createTestContact(project.id, "contact1@example.com");
      const contact2 = await createTestContact(project.id, "contact2@example.com");
      
      // Create group with contacts
      const groupPersistence = new GroupPersistence(project.id);
      const group = await groupPersistence.create({
        project: project.id,
        name: "Test Group",
        contacts: [contact1.id, contact2.id],
      });

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}/contacts`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("contacts");
      expect(data.contacts).toBeInstanceOf(Array);
      expect(data.contacts).toHaveLength(2);
      
      // Verify contact details
      expect(data.contacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: contact1.id,
            email: "contact1@example.com",
          }),
          expect.objectContaining({
            id: contact2.id,
            email: "contact2@example.com",
          }),
        ])
      );
    });

    test("should return empty array when group has no contacts", async () => {
      const { project, token } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}/contacts`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("contacts");
      expect(data.contacts).toEqual([]);
    });

    test("should return 404 when group does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/groups/non-existent-id/contacts`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      expect(response.status).toBe(404);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}/contacts`,
        {
          method: "GET",
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Authentication with Secret Key", () => {
    test("should allow group creation with valid secret key", async () => {
      const { project } = await createTestSetup();

      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const groupPayload = {
        name: "Secret Key Group",
        contacts: [],
      };

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.name).toBe("Secret Key Group");
    });

    test("should allow group retrieval with valid secret key", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const response = await app.request(`/projects/${project.id}/groups/${group.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(group.id);
    });

    test("should allow getting group contacts with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      
      const groupPersistence = new GroupPersistence(project.id);
      const group = await groupPersistence.create({
        project: project.id,
        name: "Test Group",
        contacts: [contact.id],
      });

      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}/contacts`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contacts).toHaveLength(1);
      expect(data.contacts[0].id).toBe(contact.id);
    });

    test("should allow group update with valid secret key", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const updatePayload = {
        id: group.id,
        name: "Updated via Secret Key",
        contacts: [],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${secretToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.name).toBe("Updated via Secret Key");
    });

    test("should allow group deletion with valid secret key", async () => {
      const { project } = await createTestSetup();
      const group = await createTestGroup(project.id);

      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${secretToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Authorization Tests", () => {
    test("should not allow non-member to access groups", async () => {
      const { project } = await createTestSetup();
      
      // Create a different user who is not a member
      const userPersistence = new UserPersistence();
      const nonMemberUser = await userPersistence.create({
        email: `nonmember-${Date.now()}@example.com`,
        password: "hashedpassword",
        enabled: true,
      });

      const nonMemberToken = AuthService.createUserToken(nonMemberUser.id, nonMemberUser.email);

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${nonMemberToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should not allow wrong project secret key", async () => {
      const { project } = await createTestSetup();
      
      // Create another project
      const projectPersistence = new ProjectPersistence();
      const otherProject = await projectPersistence.create({
        name: "Other Project",
        url: "https://other.example.com",
        public: "other-public",
        secret: "other-secret",
        eventTypes: [],
      });

      // Try to use other project's secret key
      const wrongSecretToken = AuthService.createProjectToken(
        otherProject.secret,
        "secret",
        otherProject.id
      );

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${wrongSecretToken}`,
        },
      });

      // Invalid JWT signature returns 401 instead of 404
      expect(response.status).toBe(401);
    });
  });

  describe("Edge Cases", () => {
    test("should handle group with large number of contacts", async () => {
      const { project, token } = await createTestSetup();
      
      // Create many contacts
      const contactIds: string[] = [];
      for (let i = 0; i < 50; i++) {
        const contact = await createTestContact(project.id, `contact${i}@example.com`);
        contactIds.push(contact.id);
      }

      const groupPayload = {
        name: "Large Group",
        contacts: contactIds,
      };

      const response = await app.request(`/projects/${project.id}/groups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groupPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.contacts).toHaveLength(50);
    });

    test("should handle removing all contacts from a group", async () => {
      const { project, token } = await createTestSetup();
      
      const contact = await createTestContact(project.id);
      const groupPersistence = new GroupPersistence(project.id);
      const group = await groupPersistence.create({
        project: project.id,
        name: "Test Group",
        contacts: [contact.id],
      });

      // Update to remove all contacts
      const updatePayload = {
        id: group.id,
        name: group.name,
        contacts: [],
      };

      const response = await app.request(
        `/projects/${project.id}/groups/${group.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contacts).toEqual([]);
    });
  });
});

