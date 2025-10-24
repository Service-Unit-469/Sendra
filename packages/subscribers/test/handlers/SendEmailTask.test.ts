import {
	ActionPersistence,
	CampaignPersistence,
	ContactPersistence,
	EmailPersistence,
	EmailService,
	EventPersistence,
	TemplatePersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { sendEmail } from "../../src/handlers/SendEmailTask";
import { createTestAction, createTestCampaign, createTestContact, createTestSetup, createTestTemplate } from "../utils/test-helpers";

// Mock EmailService methods
vi.mock("@sendra/lib", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@sendra/lib")>();
	return {
		...actual,
		EmailService: {
			...actual.EmailService,
			send: vi.fn().mockResolvedValue({ messageId: `mock-message-${Date.now()}` }),
			compileSubject: vi.fn((subject: string, data: any) => {
				// Simple mock compilation - replace variables with contact data
				let result = subject;
				if (data?.contact?.data) {
					for (const [key, value] of Object.entries(data.contact.data)) {
						result = result.replace(`{{${key}}}`, String(value));
					}
				}
				return result;
			}),
			compileBody: vi.fn((body: string, data: any) => {
				// Simple mock compilation - replace variables with contact data
				let result = body;
				if (data?.contact?.data) {
					for (const [key, value] of Object.entries(data.contact.data)) {
						result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
					}
				}
				return result;
			}),
		},
	};
});

describe("SendEmailTask Handler", () => {
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

	describe("Action-based Email", () => {
		test("should send email for action successfully", async () => {
			const contact = await createTestContact(projectId);
			const template = await createTestTemplate(projectId);
			const action = await createTestAction(projectId, template.id);

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					action: action.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was called
			expect(EmailService.send).toHaveBeenCalledWith(
				expect.objectContaining({
					to: [contact.email],
					content: expect.objectContaining({
						subject: expect.any(String),
						html: expect.any(String),
					}),
				}),
			);

			// Verify email record was created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBeGreaterThan(0);

			const emailRecord = emails[0];
			expect(emailRecord.contact).toBe(contact.id);
			expect(emailRecord.source).toBe(action.id);
			expect(emailRecord.sourceType).toBe("ACTION");
			expect(emailRecord.status).toBe("SENT");
			expect(emailRecord.messageId).toMatch(/^mock-message-/);
		});

		test("should not send email if action has not-events and they occurred", async () => {
			const contact = await createTestContact(projectId);
			const template = await createTestTemplate(projectId);

		// Create action with notevents
		const actionPersistence = new ActionPersistence(projectId);
		const action = await actionPersistence.create({
			project: projectId,
			name: "Test Action with NotEvents",
			template: template.id,
			events: ["user.signup"],
			notevents: ["user.login"], // Don't send if user.login occurred
			delay: 0,
			runOnce: false,
		});

			// Create a user.login event for this contact
			const eventPersistence = new EventPersistence(projectId);
			await eventPersistence.create({
				project: projectId,
				eventType: "user.login",
				contact: contact.id,
			});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					action: action.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was NOT called
			expect(EmailService.send).not.toHaveBeenCalled();

			// Verify no email record was created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(0);
		});

		test("should handle missing template gracefully", async () => {
			const contact = await createTestContact(projectId);

		// Create action with non-existent template
		const actionPersistence = new ActionPersistence(projectId);
		const action = await actionPersistence.create({
			project: projectId,
			name: "Test Action",
			template: "non-existent-template",
			events: ["user.signup"],
			notevents: [],
			delay: 0,
			runOnce: false,
		});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					action: action.id,
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was NOT called
			expect(EmailService.send).not.toHaveBeenCalled();
		});

		test("should handle missing action gracefully", async () => {
			const contact = await createTestContact(projectId);

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					action: "non-existent-action",
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was NOT called
			expect(EmailService.send).not.toHaveBeenCalled();
		});

		test("should update existing email record if provided", async () => {
			const contact = await createTestContact(projectId);
			const template = await createTestTemplate(projectId);
			const action = await createTestAction(projectId, template.id);

			// Create an existing email record
			const emailPersistence = new EmailPersistence(projectId);
			const existingEmail = await emailPersistence.create({
				project: projectId,
				contact: contact.id,
				messageId: "placeholder-message-id",
				subject: "Old Subject",
				body: "<p>Old Body</p>",
				email: "old@example.com",
				status: "QUEUED",
				sendType: "MARKETING",
				sourceType: "ACTION",
				source: "old-action",
			});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					action: action.id,
					email: existingEmail.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify email record was updated (not created new)
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(1);

			const updatedEmail = await emailPersistence.get(existingEmail.id);
			expect(updatedEmail?.status).toBe("SENT");
			expect(updatedEmail?.messageId).toMatch(/^mock-message-/);
			expect(updatedEmail?.id).toBe(existingEmail.id);
		});
	});

	describe("Campaign-based Email", () => {
		test("should send email for standard campaign successfully", async () => {
			const contact = await createTestContact(projectId);
			const campaign = await createTestCampaign(projectId);

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					campaign: campaign.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was called
			expect(EmailService.send).toHaveBeenCalledWith(
				expect.objectContaining({
					to: [contact.email],
					content: expect.objectContaining({
						subject: expect.any(String),
						html: expect.any(String),
					}),
				}),
			);

			// Verify email record was created
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBeGreaterThan(0);

			const emailRecord = emails[0];
			expect(emailRecord.contact).toBe(contact.id);
			expect(emailRecord.source).toBe(campaign.id);
			expect(emailRecord.sourceType).toBe("CAMPAIGN");
			expect(emailRecord.sendType).toBe("TRANSACTIONAL");
		});

		test("should merge campaign body with quick email template", async () => {
			const contact = await createTestContact(projectId);

			// Create a quick email template with {{quickBody}} token
			const templatePersistence = new TemplatePersistence(projectId);
			const template = await templatePersistence.create({
				project: projectId,
				subject: "Quick Email Template",
				body: "<mjml><mj-body><mj-section><mj-column><mj-text>Header Content</mj-text><mj-text>{{{quickBody}}}</mj-text><mj-text>Footer Content</mj-text></mj-column></mj-section></mj-body></mjml>",
				templateType: "MARKETING",
				quickEmail: true,
			});

			// Create campaign with quick email template reference
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Test Quick Campaign",
				body: "This is the quick email body content",
				recipients: [contact.id],
				status: "DRAFT",
				template: template.id,
			});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					campaign: campaign.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify EmailService.compileBody was called with the merged template
			expect(EmailService.compileBody).toHaveBeenCalledWith(
				expect.stringContaining("This is the quick email body content"),
				expect.any(Object),
			);

			// Verify the body passed to compileBody contains both template and campaign content
			const compileBodyCall = vi.mocked(EmailService.compileBody).mock.calls[0];
			const mergedBody = compileBodyCall[0];
			expect(mergedBody).toContain("Header Content");
			expect(mergedBody).toContain("This is the quick email body content");
			expect(mergedBody).toContain("Footer Content");
			expect(mergedBody).not.toContain("{{quickBody}}");
			expect(mergedBody).not.toContain("{{{quickBody}}}");
		});

		test("should use campaign body directly for non-quick-email template", async () => {
			const contact = await createTestContact(projectId);

			// Create a regular (non-quick) template
			const templatePersistence = new TemplatePersistence(projectId);
			const template = await templatePersistence.create({
				project: projectId,
				subject: "Regular Template",
				body: "<mjml><mj-body><mj-section><mj-column><mj-text>Template Content</mj-text></mj-column></mj-section></mj-body></mjml>",
				templateType: "MARKETING",
				quickEmail: false,
			});

			// Create campaign referencing the regular template
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Test Regular Campaign",
				body: "<mjml><mj-body><mj-section><mj-column><mj-text>Campaign Content</mj-text></mj-column></mj-section></mj-body></mjml>",
				recipients: [contact.id],
				status: "DRAFT",
				template: template.id,
			});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					campaign: campaign.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify EmailService.compileBody was called with the campaign body (not merged)
			expect(EmailService.compileBody).toHaveBeenCalledWith(
				expect.stringContaining("Campaign Content"),
				expect.any(Object),
			);

			// Verify the body does NOT contain template content
			const compileBodyCall = vi.mocked(EmailService.compileBody).mock.calls[0];
			const body = compileBodyCall[0];
			expect(body).toContain("Campaign Content");
			expect(body).not.toContain("Template Content");
		});

		test("should use campaign body directly when no template is referenced", async () => {
			const contact = await createTestContact(projectId);

			// Create campaign without template reference
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "No Template Campaign",
				body: "<mjml><mj-body><mj-section><mj-column><mj-text>Direct Campaign Content</mj-text></mj-column></mj-section></mj-body></mjml>",
				recipients: [contact.id],
				status: "DRAFT",
			});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					campaign: campaign.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify EmailService.compileBody was called with the campaign body directly
			expect(EmailService.compileBody).toHaveBeenCalledWith(
				expect.stringContaining("Direct Campaign Content"),
				expect.any(Object),
			);
		});

		test("should handle quick email template with escaped token {{quickBody}}", async () => {
			const contact = await createTestContact(projectId);

			// Create a quick email template with escaped {{quickBody}} token
			const templatePersistence = new TemplatePersistence(projectId);
			const template = await templatePersistence.create({
				project: projectId,
				subject: "Quick Email Template Escaped",
				body: "<mjml><mj-body><mj-section><mj-column><mj-text>{{quickBody}}</mj-text></mj-column></mj-section></mj-body></mjml>",
				templateType: "MARKETING",
				quickEmail: true,
			});

			// Create campaign with quick email template reference
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaign = await campaignPersistence.create({
				project: projectId,
				subject: "Test Quick Campaign Escaped",
				body: "Escaped content",
				recipients: [contact.id],
				status: "DRAFT",
				template: template.id,
			});

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					campaign: campaign.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify the escaped token was replaced
			const compileBodyCall = vi.mocked(EmailService.compileBody).mock.calls[0];
			const mergedBody = compileBodyCall[0];
			expect(mergedBody).toContain("Escaped content");
			expect(mergedBody).not.toContain("{{quickBody}}");
		});

		test("should handle missing campaign gracefully", async () => {
			const contact = await createTestContact(projectId);

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					campaign: "non-existent-campaign",
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was NOT called
			expect(EmailService.send).not.toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		test("should handle missing project gracefully", async () => {
			const task = {
				type: "sendEmail" as const,
				payload: {
					project: "non-existent-project",
					contact: "contact-123",
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was NOT called
			expect(EmailService.send).not.toHaveBeenCalled();
		});

		test("should handle missing contact gracefully", async () => {
			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: "non-existent-contact",
				},
			};

			// Should not throw
			await sendEmail(task, "test-record-id");

			// Verify EmailService.send was NOT called
			expect(EmailService.send).not.toHaveBeenCalled();
		});
	});

	describe("Email Compilation", () => {
		test("should compile subject and body with contact data", async () => {
			const contact = await createTestContact(projectId);
			// Update contact with custom data
			const contactPersistence = new ContactPersistence(projectId);
			await contactPersistence.put({
				...contact,
				data: {
					firstName: "John",
					lastName: "Doe",
				},
			});

		// Create template with variables
		const templatePersistence = new TemplatePersistence(projectId);
		const template = await templatePersistence.create({
			project: projectId,
			subject: "Hello {{firstName}}",
			body: "<p>Hi {{firstName}} {{lastName}}</p>",
			templateType: "MARKETING",
			quickEmail: false,
		});

			const action = await createTestAction(projectId, template.id);

			const task = {
				type: "sendEmail" as const,
				payload: {
					project: projectId,
					contact: contact.id,
					action: action.id,
				},
			};

			await sendEmail(task, "test-record-id");

			// Verify compilation occurred
			expect(EmailService.send).toHaveBeenCalledWith(
				expect.objectContaining({
					content: expect.objectContaining({
						subject: expect.stringContaining("John"),
						html: expect.stringContaining("John"),
					}),
				}),
			);
		});
	});
});

