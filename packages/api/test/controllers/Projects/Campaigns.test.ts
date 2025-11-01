import {
  CampaignPersistence,
  ContactPersistence,
  EmailPersistence,
  EmailService,
  TemplatePersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import {
  createTestContact,
  createTestSetup,
  createTestTemplate,
} from "../../utils/test-helpers";

// Mock the EmailService methods
vi.spyOn(EmailService, "send").mockResolvedValue({ messageId: "test-message-id" });
vi.spyOn(EmailService, "compileSubject").mockImplementation((subject: string) => subject);
vi.spyOn(EmailService, "compileBody").mockImplementation((body: string) => body);

describe("Campaigns Endpoint Contract Tests", () => {
  beforeAll(async () => {
    await startupDynamoDB();
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("POST /projects/:projectId/campaigns", () => {
    test("should successfully create a new campaign", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "Test Campaign Subject",
        body: "This is the campaign body content",
        recipients: [contact.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        subject: "Test Campaign Subject",
        body: "This is the campaign body content",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
        project: project.id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("should create campaign with multiple recipients", async () => {
      const { project, token } = await createTestSetup();
      const contact1 = await createTestContact(project.id);
      const contact2 = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "Multi-Recipient Campaign",
        body: "Campaign for multiple recipients",
        recipients: [contact1.id, contact2.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.recipients).toHaveLength(2);
      expect(data.recipients).toContain(contact1.id);
      expect(data.recipients).toContain(contact2.id);
    });

    test("should create campaign with 'all' recipients", async () => {
      const { project, token } = await createTestSetup();
      await createTestContact(project.id);
      await createTestContact(project.id);
      await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "All Recipients Campaign",
        body: "Campaign for all contacts",
        recipients: ["all"],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.recipients.length).toBeGreaterThanOrEqual(3);
    });

    test("should create campaign with email addresses and auto-create contacts", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "Email Address Campaign",
        body: "Campaign with email addresses",
        recipients: ["newcontact@example.com"],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.recipients).toHaveLength(1);

      // Verify contact was created
      const contactPersistence = new ContactPersistence(project.id);
      const contact = await contactPersistence.getByEmail("newcontact@example.com");
      expect(contact).toBeDefined();
      expect(contact?.email).toBe("newcontact@example.com");
    });

    test("should return 400 when subject exceeds 70 characters", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "A".repeat(71),
        body: "Campaign body",
        recipients: [contact.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(400);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "Unauthorized Campaign",
        body: "Campaign body",
        recipients: [contact.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/:projectId/campaigns/:campaignId", () => {
    test("should successfully get a campaign by id", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Get Campaign Test",
        body: "Test campaign body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: campaign.id,
        subject: "Get Campaign Test",
        body: "Test campaign body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
        project: project.id,
      });
    });

    test("should return 404 when campaign does not exist", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/campaigns/non-existent-id`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("campaign");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/campaigns/some-id`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/:projectId/campaigns", () => {
    test("should list campaigns with pagination", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);

      // Create multiple campaigns
      await campaignPersistence.create({
        project: project.id,
        subject: "Campaign 1",
        body: "Body 1",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });
      await campaignPersistence.create({
        project: project.id,
        subject: "Campaign 2",
        body: "Body 2",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const response = await app.request(`/projects/${project.id}/campaigns`, {
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

    test("should list campaigns with limit parameter", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);

      // Create multiple campaigns
      for (let i = 0; i < 5; i++) {
        await campaignPersistence.create({
          project: project.id,
          subject: `Campaign ${i}`,
          body: `Body ${i}`,
          recipients: [contact.id],
          template: template.id,
          status: "DRAFT",
        });
      }

      const response = await app.request(`/projects/${project.id}/campaigns?limit=2`, {
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

      const response = await app.request(`/projects/${project.id}/campaigns?limit=101`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("Limit must be less than 100");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/:projectId/campaigns/all", () => {
    test("should list all campaigns without pagination", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);

      // Create multiple campaigns
      const campaign1 = await campaignPersistence.create({
        project: project.id,
        subject: "All Campaign 1",
        body: "Body 1",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });
      const campaign2 = await campaignPersistence.create({
        project: project.id,
        subject: "All Campaign 2",
        body: "Body 2",
        recipients: [contact.id],
        template: template.id,
        status: "DELIVERED",
      });

      const response = await app.request(`/projects/${project.id}/campaigns/all`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);

      const campaignIds = data.map((c: any) => c.id);
      expect(campaignIds).toContain(campaign1.id);
      expect(campaignIds).toContain(campaign2.id);
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/campaigns/all`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PUT /projects/:projectId/campaigns/:campaignId", () => {
    test("should successfully update a campaign", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Original Subject",
        body: "Original Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const updatePayload = {
        id: campaign.id,
        subject: "Updated Subject",
        body: "Updated Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}`, {
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
        id: campaign.id,
        subject: "Updated Subject",
        body: "Updated Body",
        recipients: [contact.id],
        template: template.id,
        project: project.id,
      });
    });

    test("should update campaign recipients", async () => {
      const { project, token } = await createTestSetup();
      const contact1 = await createTestContact(project.id);
      const contact2 = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Update Recipients Test",
        body: "Test Body",
        recipients: [contact1.id],
        template: template.id,
        status: "DRAFT",
      });

      const updatePayload = {
        id: campaign.id,
        subject: "Update Recipients Test",
        body: "Test Body",
        recipients: [contact1.id, contact2.id],
        template: template.id,
        status: "DRAFT",
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.recipients).toHaveLength(2);
      expect(data.recipients).toContain(contact1.id);
      expect(data.recipients).toContain(contact2.id);
    });

    test("should return 400 when id in body does not match url", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Test Subject",
        body: "Test Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const updatePayload = {
        id: "different-id",
        subject: "Updated Subject",
        body: "Updated Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}`, {
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

    test("should return 404 when campaign does not exist", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: "non-existent-id",
        subject: "Updated Subject",
        body: "Updated Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      };

      const response = await app.request(`/projects/${project.id}/campaigns/non-existent-id`, {
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
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const updatePayload = {
        id: "some-id",
        subject: "Updated Subject",
        body: "Updated Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      };

      const response = await app.request(`/projects/${project.id}/campaigns/some-id`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /projects/:projectId/campaigns/:campaignId", () => {
    test("should successfully delete a campaign", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Campaign to Delete",
        body: "Test Body",
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify campaign was deleted
      const deletedCampaign = await campaignPersistence.get(campaign.id);
      expect(deletedCampaign).toBeUndefined();
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/campaigns/some-id`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /projects/:projectId/campaigns/:campaignId/send", () => {
    test("should successfully send a test campaign (live=false)", async () => {
      const { project, token, user } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Test Campaign",
        body: JSON.stringify({ blocks: [] }),
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const sendPayload = {
        id: campaign.id,
        live: false,
        delay: 0,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(202);

      // Verify EmailService.send was called
      expect(EmailService.send).toHaveBeenCalled();
    });

    test("should successfully send a live campaign (live=true)", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Live Campaign",
        body: JSON.stringify({ blocks: [] }),
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const sendPayload = {
        id: campaign.id,
        live: true,
        delay: 0,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(202);

      // Verify campaign status was updated
      const updatedCampaign = await campaignPersistence.get(campaign.id);
      expect(updatedCampaign?.status).toBe("DELIVERED");

      // Verify email was created
      const emailPersistence = new EmailPersistence(project.id);
      const emails = await emailPersistence.listAll();
      const campaignEmails = emails.filter((e) => e.source === campaign.id);
      expect(campaignEmails.length).toBeGreaterThanOrEqual(1);
    });

    test("should send live campaign with delay", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Delayed Campaign",
        body: JSON.stringify({ blocks: [] }),
        recipients: [contact.id],
        template: template.id,
        status: "DRAFT",
      });

      const sendPayload = {
        id: campaign.id,
        live: true,
        delay: 5,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(202);
    });

    test("should send live campaign with multiple recipients and staggered delays", async () => {
      const { project, token } = await createTestSetup();
      const contacts = await Promise.all([
        createTestContact(project.id),
        createTestContact(project.id),
        createTestContact(project.id),
      ]);
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Multi-Recipient Campaign",
        body: JSON.stringify({ blocks: [] }),
        recipients: contacts.map((c) => c.id),
        template: template.id,
        status: "DRAFT",
      });

      const sendPayload = {
        id: campaign.id,
        live: true,
        delay: 1,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(202);

      // Verify emails were created for all recipients
      const emailPersistence = new EmailPersistence(project.id);
      const emails = await emailPersistence.listAll();
      const campaignEmails = emails.filter((e) => e.source === campaign.id);
      expect(campaignEmails.length).toBe(3);
    });

    test("should return 400 when sending live campaign with no recipients", async () => {
      const { project, token } = await createTestSetup();
      const template = await createTestTemplate(project.id);

      const campaignPersistence = new CampaignPersistence(project.id);
      const campaign = await campaignPersistence.create({
        project: project.id,
        subject: "Empty Recipients Campaign",
        body: JSON.stringify({ blocks: [] }),
        recipients: [],
        template: template.id,
        status: "DRAFT",
      });

      const sendPayload = {
        id: campaign.id,
        live: true,
        delay: 0,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.detail).toContain("No recipients provided");
    });

    test("should return 404 when campaign does not exist", async () => {
      const { project, token } = await createTestSetup();

      const sendPayload = {
        id: "non-existent-id",
        live: false,
        delay: 0,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/non-existent-id/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty("title", "Not Found");
      expect(data.detail).toContain("campaign");
    });

    test("should return 401 when no authentication is provided", async () => {
      const { project } = await createTestSetup();

      const sendPayload = {
        id: "some-id",
        live: false,
        delay: 0,
      };

      const response = await app.request(`/projects/${project.id}/campaigns/some-id/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Authentication with Secret Key", () => {
    test("should allow access with valid secret key", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      // Create a proper secret token using AuthService
      const secretToken = AuthService.createProjectToken(project.secret, "secret", project.id);

      const campaignPayload = {
        subject: "Secret Key Campaign",
        body: "Campaign created with secret key",
        recipients: [contact.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(201);
    });

    test("should deny access with invalid secret key format", async () => {
      const { project } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "Invalid Secret Campaign",
        body: "Campaign body",
        recipients: [contact.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: "Bearer invalid-secret-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Campaign with Template Tests", () => {
    test("should create a campaign with a template reference", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);
      const template = await createTestTemplate(project.id);

      const campaignPayload = {
        subject: "Campaign with Template",
        body: JSON.stringify({ blocks: [] }),
        recipients: [contact.id],
        template: template.id,
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toMatchObject({
        id: expect.any(String),
        subject: "Campaign with Template",
        body: JSON.stringify({ blocks: [] }),
        template: template.id,
        recipients: [contact.id],
        status: "DRAFT",
        project: project.id,
      });
    });

    test("should require template field when creating campaign", async () => {
      const { project, token } = await createTestSetup();
      const contact = await createTestContact(project.id);

      const campaignPayload = {
        subject: "Campaign without Template",
        body: JSON.stringify({ blocks: [] }),
        recipients: [contact.id],
        // No template field
      };

      const response = await app.request(`/projects/${project.id}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(campaignPayload),
      });

      expect(response.status).toBe(400);
    });
  });
});

