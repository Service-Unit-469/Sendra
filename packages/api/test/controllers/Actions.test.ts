import {
  ActionPersistence,
  ContactPersistence,
  EventPersistence,
  MembershipPersistence,
  ProjectPersistence,
  TemplatePersistence,
  UserPersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../src/app";
import { AuthService } from "../../src/services/AuthService";

describe("Actions Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  // Helper function to create a test setup with user, project, and membership
  const createTestSetup = async () => {
    const userPersistence = new UserPersistence();
    const user = await userPersistence.create({
      email: `testuser-${Date.now()}@example.com`,
      password: "hashedpassword",
      enabled: true,
    });

    const projectPersistence = new ProjectPersistence();
    const project = await projectPersistence.create({
      name: `Test Project ${Date.now()}`,
      url: `https://test-${Date.now()}.example.com`,
      public: `test-public-${Date.now()}`,
      secret: `test-secret-${Date.now()}`,
      eventTypes: ["user.signup", "user.login"],
    });

    const membershipPersistence = new MembershipPersistence();
    await membershipPersistence.create({
      email: user.email,
      user: user.id,
      project: project.id,
      role: "ADMIN",
    });

    const token = AuthService.createUserToken(user.id, user.email);

    return { user, project, token };
  };

  // Helper function to create a test template
  const createTestTemplate = async (projectId: string) => {
    const templatePersistence = new TemplatePersistence(projectId);
    const editorJsData = JSON.stringify({
      time: Date.now(),
      blocks: [
        {
          id: "test-block",
          type: "paragraph",
          data: {
            text: "Test email body content",
          },
        },
      ],
      version: "2.28.0",
    });
    return await templatePersistence.create({
      project: projectId,
      subject: "Test Email Subject",
      body: {
        data: editorJsData,
        html: "<p>Test email body content</p>",
        plainText: "Test email body content",
      },
      templateType: "MARKETING",
    });
  };

  // Helper function to create a test event
  const createTestEvent = async (projectId: string, contactId: string) => {
    const eventPersistence = new EventPersistence(projectId);
    return await eventPersistence.create({
      project: projectId,
      eventType: "user.signup",
      contact: contactId,
    });
  };

  // Helper function to create a test contact
  const createTestContact = async (projectId: string) => {
    const contactPersistence = new ContactPersistence(projectId);
    return await contactPersistence.create({
      project: projectId,
      email: `contact-${Date.now()}@example.com`,
      subscribed: true,
      data: {},
    });
  };

  describe("POST /projects/{projectId}/actions", () => {
    test("should successfully create a new action", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Welcome Email",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        name: "Welcome Email",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should create action with multiple events", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event1 = await createTestEvent(project.id, contact.id);
      const event2 = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Multi Event Action",
        runOnce: true,
        delay: 3600,
        template: template.id,
        events: [event1.id, event2.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.events).toHaveLength(2);
      expect(data.events).toContain(event1.id);
      expect(data.events).toContain(event2.id);
      expect(data.runOnce).toBe(true);
      expect(data.delay).toBe(3600);
    });

    test("should return 404 when template does not exist", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Invalid Template Action",
        runOnce: false,
        delay: 0,
        template: "non-existent-template-id",
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("template");
    });

    test("should return 400 when name is empty", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when events array is empty", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const actionPayload = {
        name: "No Events Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when delay is negative", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Negative Delay Action",
        runOnce: false,
        delay: -100,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when delay is not an integer", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Float Delay Action",
        runOnce: false,
        delay: 10.5,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Unauthorized Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/actions/:actionId", () => {
    test("should successfully get an action by id", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Get Action Test",
        runOnce: false,
        delay: 100,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions/${action.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: action.id,
        name: "Get Action Test",
        runOnce: false,
        delay: 100,
        template: template.id,
        events: [event.id],
        project: project.id,
      });
    });

    test("should return 404 when action does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions/non-existent-id`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("action");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions/some-id`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/actions", () => {
    test("should list actions with pagination", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      
      // Create multiple actions
      await actionPersistence.create({
        project: project.id,
        name: "Action 1",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });
      await actionPersistence.create({
        project: project.id,
        name: "Action 2",
        runOnce: true,
        delay: 100,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("count");
      expect(data).toHaveProperty("hasMore");
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.count).toBeGreaterThanOrEqual(2);
    });

    test("should list actions with limit parameter", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      
      // Create multiple actions
      for (let i = 0; i < 5; i++) {
        await actionPersistence.create({
          project: project.id,
          name: `Action ${i}`,
          runOnce: false,
          delay: 0,
          template: template.id,
          events: [event.id],
          notevents: [],
        });
      }

      const response = await app.request(`/projects/${project.id}/actions?limit=2`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeLessThanOrEqual(2);
    });

    test("should return 400 when limit exceeds maximum", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions?limit=101`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Limit must be less than 100");
    });

    test("should return 400 when filtering by unsupported field", async () => {
      const { project, token } = await createTestSetup();

      // ActionPersistence only supports filtering by "template", not "event"
      const response = await app.request(`/projects/${project.id}/actions?filter=event&value=some-event-id`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("No index implemented for: event");
    });

    test("should filter actions by template", async () => {
      const { project, token } = await createTestSetup();
      const template1 = await createTestTemplate(project.id);
      const template2 = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      
      // Create action with template1
      await actionPersistence.create({
        project: project.id,
        name: "Action with Template 1",
        runOnce: false,
        delay: 0,
        template: template1.id,
        events: [event.id],
        notevents: [],
      });

      // Create action with template2
      await actionPersistence.create({
        project: project.id,
        name: "Action with Template 2",
        runOnce: false,
        delay: 0,
        template: template2.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions?filter=template&value=${template1.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      
      // Verify all returned actions use template1
      for (const action of data.items) {
        expect(action.template).toBe(template1.id);
      }
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/actions/all", () => {
    test("should list all actions without pagination", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      
      // Create multiple actions
      const action1 = await actionPersistence.create({
        project: project.id,
        name: "All Action 1",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });
      const action2 = await actionPersistence.create({
        project: project.id,
        name: "All Action 2",
        runOnce: true,
        delay: 100,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      
      const actionIds = data.map((a: any) => a.id);
      expect(actionIds).toContain(action1.id);
      expect(actionIds).toContain(action2.id);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions/all`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /projects/{projectId}/actions/:actionId", () => {
    test("should successfully update an action", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Original Name",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const updatePayload = {
        id: action.id,
        name: "Updated Name",
        runOnce: true,
        delay: 500,
        template: template.id,
        events: [event.id],
        notevents: [],
      };

      const response = await app.request(`/projects/${project.id}/actions/${action.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: action.id,
        name: "Updated Name",
        runOnce: true,
        delay: 500,
        template: template.id,
        events: [event.id],
        project: project.id,
      });
    });

    test("should update action with new template", async () => {
      const { project, token } = await createTestSetup();
      const template1 = await createTestTemplate(project.id);
      const template2 = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Action to Update",
        runOnce: false,
        delay: 0,
        template: template1.id,
        events: [event.id],
        notevents: [],
      });

      const updatePayload = {
        id: action.id,
        name: "Action to Update",
        runOnce: false,
        delay: 0,
        template: template2.id,
        events: [event.id],
        notevents: [],
      };

      const response = await app.request(`/projects/${project.id}/actions/${action.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.template).toBe(template2.id);
    });

    test("should return 404 when updating with non-existent template", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Action to Update",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const updatePayload = {
        id: action.id,
        name: "Action to Update",
        runOnce: false,
        delay: 0,
        template: "non-existent-template",
        events: [event.id],
        notevents: [],
      };

      const response = await app.request(`/projects/${project.id}/actions/${action.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("template");
    });

    test("should return 400 when id in body does not match url", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Action to Update",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const updatePayload = {
        id: "different-id",
        name: "Updated Name",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      };

      const response = await app.request(`/projects/${project.id}/actions/${action.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("ID mismatch");
    });

    test("should return 404 when action does not exist", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const updatePayload = {
        id: "non-existent-id",
        name: "Updated Name",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      };

      const response = await app.request(`/projects/${project.id}/actions/non-existent-id`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const updatePayload = {
        id: "some-id",
        name: "Updated Name",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions/some-id`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /projects/{projectId}/actions/:actionId", () => {
    test("should successfully delete an action", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Action to Delete",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions/${action.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify action was deleted
      const deletedAction = await actionPersistence.get(action.id);
      expect(deletedAction).toBeUndefined();
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions/some-id`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/actions/:actionId/related", () => {
    test("should get related actions for an action", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPersistence = new ActionPersistence(project.id);
      
      // Create main action
      const mainAction = await actionPersistence.create({
        project: project.id,
        name: "Main Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      // Create related action (shares the same event)
      const relatedAction = await actionPersistence.create({
        project: project.id,
        name: "Related Action",
        runOnce: false,
        delay: 100,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions/${mainAction.id}/related`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      
      // Should include related action
      const relatedIds = data.map((a: any) => a.id);
      expect(relatedIds).toContain(relatedAction.id);
    });

    test("should return related actions when they share template", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact1 = await createTestContact(project.id);
      const contact2 = await createTestContact(project.id);
      const event1 = await createTestEvent(project.id, contact1.id);
      const event2 = await createTestEvent(project.id, contact2.id);

      const actionPersistence = new ActionPersistence(project.id);
      
      // Create action with unique event but shares template
      const action = await actionPersistence.create({
        project: project.id,
        name: "Action 1",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event1.id],
        notevents: [],
      });

      // Create related action with different event but same template
      const relatedAction = await actionPersistence.create({
        project: project.id,
        name: "Action 2",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event2.id],
        notevents: [],
      });

      const response = await app.request(`/projects/${project.id}/actions/${action.id}/related`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      // Should include the related action since they share the same template
      expect(data.length).toBeGreaterThanOrEqual(1);
      const relatedIds = data.map((a: any) => a.id);
      expect(relatedIds).toContain(relatedAction.id);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/actions/some-id/related`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Authentication with Secret Key", () => {
    test("should allow access with valid secret key", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      // Create a proper secret token using AuthService
      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const actionPayload = {
        name: "Secret Key Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(201);
    });

    test("should deny access with invalid secret key format", async () => {
      const { project } = await createTestSetup();
      const template = await createTestTemplate(project.id);
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);

      const actionPayload = {
        name: "Invalid Secret Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
      };

      const response = await app.request(`/projects/${project.id}/actions`, {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-secret-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(actionPayload),
      });

      expect(response.status).toBe(401);
    });
  });
});

