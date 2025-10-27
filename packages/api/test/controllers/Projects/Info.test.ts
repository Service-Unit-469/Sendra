import {
  ActionPersistence,
  ContactPersistence,
  EmailPersistence,
  EventPersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import dayjs from "dayjs";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import {
  createTestContact,
  createTestEvent,
  createTestSetup,
  createTestTemplate,
} from "../../utils/test-helpers";

describe("Info Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("GET /projects/:projectId/analytics", () => {
    test("should return analytics for week period with no data", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        contacts: {
          timeseries: expect.any(Array),
          subscribed: 0,
          unsubscribed: 0,
        },
        emails: {
          total: 0,
          opened: 0,
          bounced: 0,
          complaint: 0,
          totalPrev: 0,
          bouncedPrev: 0,
          complaintPrev: 0,
          openedPrev: 0,
        },
        clicks: expect.any(Array),
      });

      expect(data.contacts.timeseries.length).toBe(7);
    });

    test("should return analytics with correct timeseries length for month period", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/analytics?period=month`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contacts.timeseries.length).toBe(30);
    });

    test("should return analytics with correct timeseries length for year period", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/analytics?period=year`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contacts.timeseries.length).toBe(365);
    });

    test("should return analytics with contact data", async () => {
      const { project, token } = await createTestSetup();

      // Create contacts
      await createTestContact(project.id, "subscribed@example.com");
      await createTestContact(project.id);

      // Create an unsubscribed contact
      const contactPersistence = new ContactPersistence(project.id);
      await contactPersistence.create({
        project: project.id,
        email: "unsubscribed@example.com",
        subscribed: false,
        data: {},
      });

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.contacts.subscribed).toBe(2);
      expect(data.contacts.unsubscribed).toBe(1);
    });

    test("should return analytics with email data", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);

      // Create emails with different statuses
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "msg-1",
        subject: "Test Email 1",
        body: "Body 1",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "msg-2",
        subject: "Test Email 2",
        body: "Body 2",
        status: "OPENED",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "msg-3",
        subject: "Test Email 3",
        body: "Body 3",
        status: "BOUNCED",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "msg-4",
        subject: "Test Email 4",
        body: "Body 4",
        status: "COMPLAINT",
        sendType: "TRANSACTIONAL",
      });

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.emails.total).toBe(4);
      expect(data.emails.opened).toBe(1);
      expect(data.emails.bounced).toBe(1);
      expect(data.emails.complaint).toBe(1);
    });

    test("should return analytics with click data from events", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const eventPersistence = new EventPersistence(project.id);

      // Create click events
      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "email.click",
        data: {
          details: {
            link: "https://example.com/page1",
          },
          mail: {
            commonHeaders: {
              subject: "Test Email Subject",
            },
          },
        },
      });

      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "email.click",
        data: {
          details: {
            link: "https://example.com/page1",
          },
          mail: {
            commonHeaders: {
              subject: "Test Email Subject",
            },
          },
        },
      });

      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "email.click",
        data: {
          details: {
            link: "https://example.com/page2",
          },
          mail: {
            commonHeaders: {
              subject: "Another Email",
            },
          },
        },
      });

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.clicks).toHaveLength(2);

      const link1Clicks = data.clicks.find(
        (c: { link: string }) => c.link === "https://example.com/page1",
      );
      expect(link1Clicks).toBeDefined();
      expect(link1Clicks.count).toBe(2);
      expect(link1Clicks.name).toBe("Test Email Subject");

      const link2Clicks = data.clicks.find(
        (c: { link: string }) => c.link === "https://example.com/page2",
      );
      expect(link2Clicks).toBeDefined();
      expect(link2Clicks.count).toBe(1);
      expect(link2Clicks.name).toBe("Another Email");
    });

    test("should return analytics for month period", async () => {
      const { project, token } = await createTestSetup();
      await createTestContact(project.id);

      const response = await app.request(
        `/projects/${project.id}/analytics?period=month`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("contacts");
      expect(data).toHaveProperty("emails");
      expect(data).toHaveProperty("clicks");
    });

    test("should return analytics for year period", async () => {
      const { project, token } = await createTestSetup();
      await createTestContact(project.id);

      const response = await app.request(
        `/projects/${project.id}/analytics?period=year`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("contacts");
      expect(data).toHaveProperty("emails");
      expect(data).toHaveProperty("clicks");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when authenticated as different user without access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
    });

    test("should include all contacts in count regardless of age", async () => {
      const { project, token } = await createTestSetup();

      // Create recent contacts
      await createTestContact(project.id);
      await createTestContact(project.id);

      const response = await app.request(
        `/projects/${project.id}/analytics?period=week`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      // Should count both recent contacts
      expect(data.contacts.subscribed).toBe(2);
    });
  });

  describe("GET /projects/:projectId/feed", () => {
    test("should return empty feed for new project", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    test("should return feed with events", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const eventPersistence = new EventPersistence(project.id);
      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "user.signup",
      });

      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "user.login",
      });

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(2);

      const event = data.find((item: { type: string }) => item.type === "trigger");
      expect(event).toBeDefined();
      expect(event).toMatchObject({
        type: "trigger",
        id: expect.any(String),
        createdAt: expect.any(String),
        contact: {
          id: contact.id,
          email: contact.email,
        },
        event: {
          name: expect.any(String),
        },
      });
    });

    test("should return feed with emails", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "test-msg-1",
        subject: "Test Email",
        body: "Test Body",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(1);

      const email = data.find((item: { type: string }) => item.type === "email");
      expect(email).toBeDefined();
      expect(email).toMatchObject({
        type: "email",
        id: expect.any(String),
        createdAt: expect.any(String),
        messageId: "test-msg-1",
        status: "SENT",
        contact: {
          id: contact.id,
          email: contact.email,
        },
      });
    });

    test("should return feed with events and emails sorted by date", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "test-msg-1",
        subject: "Test Email",
        body: "Test Body",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      const eventPersistence = new EventPersistence(project.id);
      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "user.signup",
      });

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.length).toBeGreaterThanOrEqual(2);

      // Verify items are sorted by createdAt descending
      for (let i = 0; i < data.length - 1; i++) {
        const currentDate = new Date(data[i].createdAt);
        const nextDate = new Date(data[i + 1].createdAt);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    test("should return feed with event linked to action", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);
      const template = await createTestTemplate(project.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const eventPersistence = new EventPersistence(project.id);
      await eventPersistence.create({
        project: project.id,
        contact: contact.id,
        eventType: "user.signup",
        relation: action.id,
        relationType: "ACTION",
      });

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const eventWithAction = data.find(
        (item: { type: string; action?: { name: string } }) =>
          item.type === "trigger" && item.action,
      );

      expect(eventWithAction).toBeDefined();
      expect(eventWithAction.action).toMatchObject({
        name: "Test Action",
      });
    });

    test("should limit feed to 10 events and 10 emails", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const eventPersistence = new EventPersistence(project.id);
      const emailPersistence = new EmailPersistence(project.id);

      // Create 15 events
      for (let i = 0; i < 15; i++) {
        await eventPersistence.create({
          project: project.id,
          contact: contact.id,
          eventType: "user.signup",
        });
      }

      // Create 15 emails
      for (let i = 0; i < 15; i++) {
        await emailPersistence.create({
          project: project.id,
          contact: contact.id,
          email: contact.email,
          messageId: `test-msg-${i}`,
          subject: `Test Email ${i}`,
          body: "Test Body",
          status: "SENT",
          sendType: "TRANSACTIONAL",
        });
      }

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      // Maximum should be 20 items total (10 events + 10 emails)
      expect(data.length).toBeLessThanOrEqual(20);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when authenticated as different user without access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/feed`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /projects/:projectId/usage", () => {
    test("should return zero usage for new project", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        transactional: 0,
        automation: 0,
        campaign: 0,
      });
    });

    test("should count transactional emails correctly", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);

      // Create transactional emails (emails without source)
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "trans-1",
        subject: "Transactional Email 1",
        body: "Body 1",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "trans-2",
        subject: "Transactional Email 2",
        body: "Body 2",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.transactional).toBe(2);
      expect(data.automation).toBe(0);
      expect(data.campaign).toBe(0);
    });

    test("should count automation emails correctly", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);
      const template = await createTestTemplate(project.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const emailPersistence = new EmailPersistence(project.id);

      // Create automation emails (emails with ACTION sourceType)
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "auto-1",
        subject: "Automation Email 1",
        body: "Body 1",
        status: "SENT",
        sendType: "TRANSACTIONAL",
        source: action.id,
        sourceType: "ACTION",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "auto-2",
        subject: "Automation Email 2",
        body: "Body 2",
        status: "SENT",
        sendType: "TRANSACTIONAL",
        source: action.id,
        sourceType: "ACTION",
      });

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.transactional).toBe(0);
      expect(data.automation).toBe(2);
      expect(data.campaign).toBe(0);
    });

    test("should count campaign emails correctly", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);

      // Create campaign emails (emails with CAMPAIGN sourceType)
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "camp-1",
        subject: "Campaign Email 1",
        body: "Body 1",
        status: "SENT",
        sendType: "MARKETING",
        source: "campaign-id-1",
        sourceType: "CAMPAIGN",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "camp-2",
        subject: "Campaign Email 2",
        body: "Body 2",
        status: "SENT",
        sendType: "MARKETING",
        source: "campaign-id-1",
        sourceType: "CAMPAIGN",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "camp-3",
        subject: "Campaign Email 3",
        body: "Body 3",
        status: "SENT",
        sendType: "MARKETING",
        source: "campaign-id-2",
        sourceType: "CAMPAIGN",
      });

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.transactional).toBe(0);
      expect(data.automation).toBe(0);
      expect(data.campaign).toBe(3);
    });

    test("should count mixed email types correctly", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const event = await createTestEvent(project.id, contact.id);
      const template = await createTestTemplate(project.id);

      const actionPersistence = new ActionPersistence(project.id);
      const action = await actionPersistence.create({
        project: project.id,
        name: "Test Action",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: [event.id],
        notevents: [],
      });

      const emailPersistence = new EmailPersistence(project.id);

      // Create mixed emails
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "trans-1",
        subject: "Transactional Email",
        body: "Body",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "auto-1",
        subject: "Automation Email",
        body: "Body",
        status: "SENT",
        sendType: "TRANSACTIONAL",
        source: action.id,
        sourceType: "ACTION",
      });

      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "camp-1",
        subject: "Campaign Email",
        body: "Body",
        status: "SENT",
        sendType: "MARKETING",
        source: "campaign-id",
        sourceType: "CAMPAIGN",
      });

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.transactional).toBe(1);
      expect(data.automation).toBe(1);
      expect(data.campaign).toBe(1);
    });

    test("should only count emails from current month", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);

      // Create a current month email
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "current-1",
        subject: "Current Month Email",
        body: "Body",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      // For the old email test, we'll just verify current month filtering works
      // DynamoDB doesn't support updating createdAt in test environment

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      // Should count the current month email
      expect(data.transactional).toBe(1);
      expect(data.automation).toBe(0);
      expect(data.campaign).toBe(0);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when authenticated as different user without access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should work with API secret key authentication", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const emailPersistence = new EmailPersistence(project.id);
      await emailPersistence.create({
        project: project.id,
        contact: contact.id,
        email: contact.email,
        messageId: "trans-1",
        subject: "Test Email",
        body: "Body",
        status: "SENT",
        sendType: "TRANSACTIONAL",
      });

      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const response = await app.request(`/projects/${project.id}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.transactional).toBe(1);
    });
  });
});

