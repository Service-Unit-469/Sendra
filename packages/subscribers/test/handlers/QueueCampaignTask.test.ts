import {
    CampaignPersistence,
    EmailPersistence,
    TaskQueue
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { sendEmail } from "../../src/handlers/QueueCampaignTask";
import { createTestContact, createTestSetup, createTestTemplate } from "../utils/test-helpers";

// Mock TaskQueue
vi.mock("@sendra/lib", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@sendra/lib")>();
	return {
		...actual,
		TaskQueue: {
			...actual.TaskQueue,
			addTask: vi.fn().mockResolvedValue("mocked-message-id"),
		},
	};
});

describe("QueueCampaignTask Handler", () => {
	let projectId: string;

	beforeAll(async () => {
		await startupDynamoDB();
	});

	afterAll(async () => {
		await stopDynamoDB();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		const { project } = await createTestSetup();
		projectId = project.id;
	});

	describe("Successful Campaign Queueing", () => {
		test("should queue campaign emails for single recipient", async () => {
			const contact = await createTestContact(projectId);
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Test Campaign",
				body: {
					data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
					html: "<p>Test campaign body</p>",
					plainText: "Test campaign body",
				},
				recipients: [contact.id],
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 0,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify email record was created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(1);

			const emailRecord = emails[0];
			expect(emailRecord.contact).toBe(contact.id);
			expect(emailRecord.source).toBe(campaign.id);
			expect(emailRecord.sourceType).toBe("CAMPAIGN");
			expect(emailRecord.sendType).toBe("MARKETING");
			expect(emailRecord.status).toBe("QUEUED");
			expect(emailRecord.subject).toBe(campaign.subject);

			// Verify TaskQueue.addTask was called
			expect(TaskQueue.addTask).toHaveBeenCalledTimes(1);
			expect(TaskQueue.addTask).toHaveBeenCalledWith({
				type: "sendEmail",
				payload: {
					email: emailRecord.id,
					campaign: campaign.id,
					contact: contact.id,
					project: projectId,
				},
				delaySeconds: undefined,
			});
		});

		test("should queue campaign emails for multiple recipients", async () => {
			const contacts = await Promise.all([
				createTestContact(projectId),
				createTestContact(projectId),
				createTestContact(projectId),
			]);
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Multi-Recipient Campaign",
				body: {
					data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
					html: "<p>Multi-recipient campaign body</p>",
					plainText: "Multi-recipient campaign body",
				},
				recipients: contacts.map((c) => c.id),
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 0,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify email records were created for all recipients
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(3);

			// Verify all emails have correct properties
			const contactIds = contacts.map((c) => c.id);
			for (const email of emails) {
				expect(contactIds).toContain(email.contact);
				expect(email.source).toBe(campaign.id);
				expect(email.sourceType).toBe("CAMPAIGN");
				expect(email.sendType).toBe("MARKETING");
				expect(email.status).toBe("QUEUED");
			}

			// Verify TaskQueue.addTask was called for each recipient
			expect(TaskQueue.addTask).toHaveBeenCalledTimes(3);
		});

		test("should queue campaign emails with delay", async () => {
			const contact = await createTestContact(projectId);
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Delayed Campaign",
				body: {
					data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
					html: "<p>Delayed campaign body</p>",
					plainText: "Delayed campaign body",
				},
				recipients: [contact.id],
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 5, // 5 minutes
				},
				delaySeconds: 300, // 5 minutes in seconds
			};

			await sendEmail(task, "test-record-id");

			// Verify email record was created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(1);

			// Verify TaskQueue.addTask was called with delaySeconds
			expect(TaskQueue.addTask).toHaveBeenCalledTimes(1);
			expect(TaskQueue.addTask).toHaveBeenCalledWith({
				type: "sendEmail",
				payload: {
					email: emails[0].id,
					campaign: campaign.id,
					contact: contact.id,
					project: projectId,
				},
				delaySeconds: 300,
			});
		});

		test("should create email records with correct contact email addresses", async () => {
			const contact1 = await createTestContact(projectId, "contact1@example.com");
			const contact2 = await createTestContact(projectId, "contact2@example.com");
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Campaign with Specific Emails",
				body: {
					data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
					html: "<p>Campaign body</p>",
					plainText: "Campaign body",
				},
				recipients: [contact1.id, contact2.id],
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 0,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify email records have correct email addresses
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(2);

			const emailAddresses = emails.map((e) => e.email);
			expect(emailAddresses).toContain("contact1@example.com");
			expect(emailAddresses).toContain("contact2@example.com");
		});
	});

	describe("Error Handling", () => {
		test("should handle missing campaign gracefully", async () => {
			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: "non-existent-campaign",
					project: projectId,
					delay: 0,
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify no email records were created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(0);

			// Verify TaskQueue.addTask was not called
			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

		test("should handle campaign with no recipients gracefully", async () => {
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Empty Campaign",
				body: {
					data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
					html: "<p>Empty campaign body</p>",
					plainText: "Empty campaign body",
				},
				recipients: [],
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 0,
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify no email records were created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(0);

			// Verify TaskQueue.addTask was not called
			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

		test("should handle missing contact gracefully", async () => {
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Campaign with Missing Contact",
				body: {
					data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
					html: "<p>Campaign body</p>",
					plainText: "Campaign body",
				},
				recipients: ["non-existent-contact"],
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 0,
				},
			};

			await expect(sendEmail(task, "test-record-id")).resolves.toBeUndefined();

			// Verify no email records
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(0);

			// Verify TaskQueue.addTask was not called
			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});
	});

	describe("Campaign Body and Subject", () => {
		test("should preserve campaign subject and body in email records", async () => {
			const contact = await createTestContact(projectId);
			const template = await createTestTemplate(projectId);
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaignBody = {
				data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
				html: "<p>Custom campaign HTML</p>",
				plainText: "Custom campaign plain text",
			};
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Custom Campaign Subject",
				body: campaignBody,
				recipients: [contact.id],
				status: "DELIVERED",
				template: template.id,
			});

			const task = {
				type: "queueCampaign" as const,
				payload: {
					campaign: campaign.id,
					project: projectId,
					delay: 0,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify email record has correct subject and body
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(1);

			const emailRecord = emails[0];
			expect(emailRecord.subject).toBe("Custom Campaign Subject");
			// Body structure may differ - check html and plainText fields
			expect(emailRecord.body.html).toBe(campaignBody.html);
			expect(emailRecord.body.plainText).toBe(campaignBody.plainText);
		});
	});
});

