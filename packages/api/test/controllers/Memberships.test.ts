import { MembershipPersistence, ProjectPersistence, UserPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { app } from "../../src/app";
import { AuthService } from "../../src/services/AuthService";
import { SystemEmailService } from "../../src/services/SystemEmailService";

describe("Memberships Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("POST /memberships/invite", () => {
    test("should invite a new user to a project as ADMIN", async () => {
      // Create a test user (admin)
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project",
        url: "https://test.example.com",
        public: "test-public",
        secret: "test-secret",
        eventTypes: [],
        colors: [],
      });

      // Create admin membership
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: adminUser.email,
        user: adminUser.id,
        project: project.id,
        role: "ADMIN",
      });

      // Mock the SystemEmailService
      const sendInvitationEmailSpy = vi.spyOn(SystemEmailService, "sendInvitationEmail").mockResolvedValue(undefined);

      // Create admin token
      let memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Invite a new user
      const invitePayload = {
        projectId: project.id,
        email: "newuser@example.com",
        role: "ADMIN",
      };

      const response = await app.request("/api/v1/memberships/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("memberships");
      expect(data.memberships).toBeInstanceOf(Array);
      expect(data.memberships.length).toBeGreaterThan(0);

      // Verify the membership was created
      memberships = await membershipPersistence.findAllBy({
        key: "email",
        value: "newuser@example.com",
      });
      expect(memberships).toHaveLength(1);
      expect(memberships[0].email).toBe("newuser@example.com");
      expect(memberships[0].role).toBe("ADMIN");
      expect(memberships[0].user).toBe("NEW_USER");

      // Verify invitation email was sent
      expect(sendInvitationEmailSpy).toHaveBeenCalledWith("newuser@example.com", project.name);

      sendInvitationEmailSpy.mockRestore();
    });

    test("should invite an existing user to a project as MEMBER", async () => {
      // Create test users
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin2@example.com",
        password: "hashedpassword",
        enabled: true,
      });
      const existingUser = await userPersistence.create({
        email: "existing@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project 2",
        url: "https://test2.example.com",
        public: "test-public-2",
        secret: "test-secret-2",
        eventTypes: [],
        colors: [],
      });

      // Create admin membership
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: adminUser.email,
        user: adminUser.id,
        project: project.id,
        role: "ADMIN",
      });

      // Mock the SystemEmailService
      const sendInvitationEmailSpy = vi.spyOn(SystemEmailService, "sendInvitationEmail").mockResolvedValue(undefined);

      // Create admin token
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Invite existing user
      const invitePayload = {
        projectId: project.id,
        email: existingUser.email,
        role: "MEMBER",
      };

      const response = await app.request("/api/v1/memberships/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify the membership was created with the user ID
      const existingUserMemberships = await membershipPersistence.findAllBy({
        key: "email",
        value: existingUser.email,
      });
      expect(existingUserMemberships).toHaveLength(1);
      expect(existingUserMemberships[0].user).toBe(existingUser.id);
      expect(existingUserMemberships[0].role).toBe("MEMBER");

      // Verify invitation email was NOT sent for existing users
      expect(sendInvitationEmailSpy).not.toHaveBeenCalled();

      sendInvitationEmailSpy.mockRestore();
    });

    test("should return existing memberships when user is already a member", async () => {
      // Create test users
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin3@example.com",
        password: "hashedpassword",
        enabled: true,
      });
      const memberUser = await userPersistence.create({
        email: "member@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project 3",
        url: "https://test3.example.com",
        public: "test-public-3",
        secret: "test-secret-3",
        eventTypes: [],
        colors: [],
      });

      // Create memberships
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: adminUser.email,
        user: adminUser.id,
        project: project.id,
        role: "ADMIN",
      });
      await membershipPersistence.create({
        email: memberUser.email,
        user: memberUser.id,
        project: project.id,
        role: "MEMBER",
      });

      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });

      // Create admin token
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Try to invite user who is already a member
      const invitePayload = {
        projectId: project.id,
        email: memberUser.email,
        role: "MEMBER",
      };

      const response = await app.request("/api/v1/memberships/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.memberships).toHaveLength(2);
    });

    test("should return 404 when project does not exist", async () => {
      // Create a test user (admin)
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin4@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create admin token
      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Try to invite to non-existent project
      const invitePayload = {
        projectId: "non-existent-project-id",
        email: "newuser2@example.com",
        role: "MEMBER",
      };

      const response = await app.request("/api/v1/memberships/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitePayload),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("Project");
    });

    test("should return 401 when no authentication is provided", async () => {
      const invitePayload = {
        projectId: "some-project-id",
        email: "user@example.com",
        role: "MEMBER",
      };

      const response = await app.request("/api/v1/memberships/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitePayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 400 when request body is invalid", async () => {
      // Create a test user (admin)
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin5@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      const response = await app.request("/api/v1/memberships/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invalidField: "value",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /memberships/kick", () => {
    test("should kick a member from a project", async () => {
      // Create test users
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin6@example.com",
        password: "hashedpassword",
        enabled: true,
      });
      const memberUser = await userPersistence.create({
        email: "member2@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project 4",
        url: "https://test4.example.com",
        public: "test-public-4",
        secret: "test-secret-4",
        eventTypes: [],
        colors: [],
      });

      // Create memberships
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: adminUser.email,
        user: adminUser.id,
        project: project.id,
        role: "ADMIN",
      });
      const memberMembership = await membershipPersistence.create({
        email: memberUser.email,
        user: memberUser.id,
        project: project.id,
        role: "MEMBER",
      });

      // Create admin token
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Kick the member
      const kickPayload = {
        projectId: project.id,
        email: memberUser.email,
      };

      const response = await app.request("/api/v1/memberships/kick", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kickPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.memberships).toHaveLength(1);
      expect(data.memberships[0].email).toBe(adminUser.email);

      // Verify the membership was deleted
      const deletedMembership = await membershipPersistence.get(memberMembership.id);
      expect(deletedMembership).toBeUndefined();
    });

    test("should not allow user to kick themselves", async () => {
      // Create a test user (admin)
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin7@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project 5",
        url: "https://test5.example.com",
        public: "test-public-5",
        secret: "test-secret-5",
        eventTypes: [],
        colors: [],
      });

      // Create admin membership
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: adminUser.email,
        user: adminUser.id,
        project: project.id,
        role: "ADMIN",
      });

      // Create admin token
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Try to kick self
      const kickPayload = {
        projectId: project.id,
        email: adminUser.email,
      };

      const response = await app.request("/api/v1/memberships/kick", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kickPayload),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Allowed");
      expect(data.detail).toContain("kick yourself");
    });

    test("should return 401 when no authentication is provided", async () => {
      const kickPayload = {
        projectId: "some-project-id",
        email: "user@example.com",
      };

      const response = await app.request("/api/v1/memberships/kick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kickPayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 400 when request body is invalid", async () => {
      // Create a test user (admin)
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin8@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      const response = await app.request("/api/v1/memberships/kick", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invalidField: "value",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should handle kicking non-existent user gracefully", async () => {
      // Create a test user (admin)
      const userPersistence = new UserPersistence();
      const adminUser = await userPersistence.create({
        email: "admin9@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project 6",
        url: "https://test6.example.com",
        public: "test-public-6",
        secret: "test-secret-6",
        eventTypes: [],
        colors: [],
      });

      // Create admin membership
      const membershipPersistence = new MembershipPersistence();
      await membershipPersistence.create({
        email: adminUser.email,
        user: adminUser.id,
        project: project.id,
        role: "ADMIN",
      });

      // Create admin token
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: adminUser.id,
      });
      const token = AuthService.createUserToken(adminUser.id, adminUser.email, memberships);

      // Try to kick non-existent user
      const kickPayload = {
        projectId: project.id,
        email: "nonexistent@example.com",
      };

      const response = await app.request("/api/v1/memberships/kick", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(kickPayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.memberships).toHaveLength(1);
    });
  });

  describe("POST /memberships/leave", () => {
    test("should allow a member to leave a project", async () => {
      // Create a test user
      const userPersistence = new UserPersistence();
      const memberUser = await userPersistence.create({
        email: "member3@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create test projects
      const projectPersistence = new ProjectPersistence();
      const project1 = await projectPersistence.create({
        name: "Test Project 7",
        url: "https://test7.example.com",
        public: "test-public-7",
        secret: "test-secret-7",
        eventTypes: [],
        colors: [],
      });
      const project2 = await projectPersistence.create({
        name: "Test Project 8",
        url: "https://test8.example.com",
        public: "test-public-8",
        secret: "test-secret-8",
        eventTypes: [],
        colors: [],
      });

      // Create memberships
      const membershipPersistence = new MembershipPersistence();
      const membership1 = await membershipPersistence.create({
        email: memberUser.email,
        user: memberUser.id,
        project: project1.id,
        role: "MEMBER",
      });
      await membershipPersistence.create({
        email: memberUser.email,
        user: memberUser.id,
        project: project2.id,
        role: "MEMBER",
      });

      // Create member token
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: memberUser.id,
      });
      const token = AuthService.createUserToken(memberUser.id, memberUser.email, memberships);

      // Leave project 1
      const leavePayload = {
        projectId: project1.id,
      };

      const response = await app.request("/api/v1/memberships/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leavePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.memberships).toBeInstanceOf(Array);

      // Verify the membership was deleted
      const deletedMembership = await membershipPersistence.get(membership1.id);
      expect(deletedMembership).toBeUndefined();

      // Verify user still has membership in project 2
      const remainingMemberships = await membershipPersistence.getUserMemberships(memberUser.id);
      expect(remainingMemberships).toHaveLength(1);
      expect(remainingMemberships[0].project).toBe(project2.id);
    });

    test("should return 401 when no authentication is provided", async () => {
      const leavePayload = {
        projectId: "some-project-id",
      };

      const response = await app.request("/api/v1/memberships/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leavePayload),
      });

      expect(response.status).toBe(401);
    });

    test("should return 400 when request body is invalid", async () => {
      // Create a test user
      const userPersistence = new UserPersistence();
      const memberUser = await userPersistence.create({
        email: "member4@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: memberUser.id,
      });
      const token = AuthService.createUserToken(memberUser.id, memberUser.email, memberships);

      const response = await app.request("/api/v1/memberships/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invalidField: "value",
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should return 404 when trying to leave a project user is not a member of", async () => {
      // Create a test user
      const userPersistence = new UserPersistence();
      const memberUser = await userPersistence.create({
        email: "member5@example.com",
        password: "hashedpassword",
        enabled: true,
      });

      // Create a test project
      const projectPersistence = new ProjectPersistence();
      const project = await projectPersistence.create({
        name: "Test Project 9",
        url: "https://test9.example.com",
        public: "test-public-9",
        secret: "test-secret-9",
        eventTypes: [],
        colors: [],
      });

      // Create member token (but no membership created)
      const membershipPersistence = new MembershipPersistence();
      const memberships = await membershipPersistence.findAllBy({
        key: "user",
        value: memberUser.id,
      });
      const token = AuthService.createUserToken(memberUser.id, memberUser.email, memberships);

      // Try to leave project user is not a member of
      const leavePayload = {
        projectId: project.id,
      };

      const response = await app.request("/api/v1/memberships/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leavePayload),
      });

      // The middleware should reject this since the user is not a member
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
    });
  });
});

