import { ContactPersistence, EmailPersistence, EventPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import type { SNSEvent } from "aws-lambda";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { handler } from "../src/EmailTopicSubscriber";
import { createTestContact, createTestEmail, createTestSetup } from "./utils/test-helpers";

describe("EmailTopicSubscriber", () => {
	let projectId: string;
	let contactId: string;

	beforeAll(async () => {
		await startupDynamoDB();
	});

	afterAll(async () => {
		await stopDynamoDB();
	});

	beforeEach(async () => {
		const { project } = await createTestSetup();
		projectId = project.id;
		const contact = await createTestContact(projectId);
		contactId = contact.id;
	});

	const createSNSEvent = (messageId: string, eventType: string, additionalData?: Record<string, unknown>): SNSEvent => {
		const message = {
			eventType,
			mail: {
				messageId,
				timestamp: new Date().toISOString(),
				source: "test@example.com",
				sendingAccountId: "123456789",
				destination: [`contact-${contactId}@example.com`],
			},
			...additionalData,
		};

		return {
			Records: [
				{
					EventSource: "aws:sns",
					EventVersion: "1.0",
					EventSubscriptionArn: "arn:aws:sns:us-east-1:123456789:test-topic:subscription-id",
					Sns: {
						Type: "Notification",
						MessageId: messageId,
						TopicArn: "arn:aws:sns:us-east-1:123456789:test-topic",
						Subject: "Amazon SES Email Event",
						Message: JSON.stringify(message),
						Timestamp: new Date().toISOString(),
						SignatureVersion: "1",
						Signature: "test-signature",
						SigningCertUrl: "https://sns.us-east-1.amazonaws.com/test.pem",
						UnsubscribeUrl: "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe",
						MessageAttributes: {},
					},
				},
			],
		};
	};

	describe("Delivery Events", () => {
		test("should handle delivery event successfully", async () => {
			const messageId = `test-message-${Date.now()}`;
			await createTestEmail(projectId, contactId, messageId);

			const event = createSNSEvent(messageId, "Delivery", {
				delivery: {
					timestamp: new Date().toISOString(),
					processingTimeMillis: 500,
					recipients: [`contact-${contactId}@example.com`],
					smtpResponse: "250 OK",
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");

			// Verify email status was updated
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const email = emails.find((e) => e.messageId === messageId);
			expect(email?.status).toBe("DELIVERED");

			// Verify event was created
			const eventPersistence = new EventPersistence(projectId);
			const events = await eventPersistence.listAll();
			const deliveryEvent = events.find((e) => e.eventType === "email.delivery");
			expect(deliveryEvent).toBeDefined();
			expect(deliveryEvent?.contact).toBe(contactId);
		});

		test("should handle open event successfully", async () => {
			const messageId = `test-message-${Date.now()}`;
			await createTestEmail(projectId, contactId, messageId);

			const event = createSNSEvent(messageId, "Open", {
				open: {
					timestamp: new Date().toISOString(),
					userAgent: "Mozilla/5.0",
					ipAddress: "192.168.1.1",
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");

			// Verify email status was updated
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const email = emails.find((e) => e.messageId === messageId);
			expect(email?.status).toBe("OPENED");

			// Verify event was created
			const eventPersistence = new EventPersistence(projectId);
			const events = await eventPersistence.listAll();
			const openEvent = events.find((e) => e.eventType === "email.open");
			expect(openEvent).toBeDefined();
		});
	});

	describe("Bounce Events", () => {
		test("should handle bounce event and unsubscribe non-transactional contact", async () => {
			const messageId = `test-message-${Date.now()}`;
			const email = await createTestEmail(projectId, contactId, messageId);
			// Set as marketing email (non-transactional)
			await new EmailPersistence(projectId).put({ ...email, sendType: "MARKETING" });

			const event = createSNSEvent(messageId, "Bounce", {
				bounce: {
					bounceType: "Permanent",
					bounceSubType: "General",
					bouncedRecipients: [{ emailAddress: `contact-${contactId}@example.com` }],
					timestamp: new Date().toISOString(),
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);

			// Verify contact was unsubscribed
			const contactPersistence = new ContactPersistence(projectId);
			const contact = await contactPersistence.get(contactId);
			expect(contact?.subscribed).toBe(false);

			// Verify email status was updated
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const updatedEmail = emails.find((e) => e.messageId === messageId);
			expect(updatedEmail?.status).toBe("BOUNCED");
		});

		test("should handle bounce event but not unsubscribe transactional contact", async () => {
			const messageId = `test-message-${Date.now()}`;
			const email = await createTestEmail(projectId, contactId, messageId);
			// Set as transactional email
			await new EmailPersistence(projectId).put({ ...email, sendType: "TRANSACTIONAL" });

			const event = createSNSEvent(messageId, "Bounce", {
				bounce: {
					bounceType: "Permanent",
					bounceSubType: "General",
					bouncedRecipients: [{ emailAddress: `contact-${contactId}@example.com` }],
					timestamp: new Date().toISOString(),
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);

			// Verify contact was NOT unsubscribed (transactional emails don't unsubscribe)
			const contactPersistence = new ContactPersistence(projectId);
			const contact = await contactPersistence.get(contactId);
			expect(contact?.subscribed).toBe(true);
		});
	});

	describe("Complaint Events", () => {
		test("should handle complaint event and unsubscribe contact", async () => {
			const messageId = `test-message-${Date.now()}`;
			const email = await createTestEmail(projectId, contactId, messageId);
			// Set as marketing email
			await new EmailPersistence(projectId).put({ ...email, sendType: "MARKETING" });

			const event = createSNSEvent(messageId, "Complaint", {
				complaint: {
					complainedRecipients: [{ emailAddress: `contact-${contactId}@example.com` }],
					timestamp: new Date().toISOString(),
					complaintFeedbackType: "abuse",
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);

			// Verify contact was unsubscribed
			const contactPersistence = new ContactPersistence(projectId);
			const contact = await contactPersistence.get(contactId);
			expect(contact?.subscribed).toBe(false);

			// Verify email status was updated
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const updatedEmail = emails.find((e) => e.messageId === messageId);
			expect(updatedEmail?.status).toBe("COMPLAINT");

			// Verify event was created
			const eventPersistence = new EventPersistence(projectId);
			const events = await eventPersistence.listAll();
			const complaintEvent = events.find((e) => e.eventType === "email.complaint");
			expect(complaintEvent).toBeDefined();
			expect(complaintEvent?.contact).toBe(contactId);
		});

		test("should handle complaint event but not unsubscribe transactional contact", async () => {
			const messageId = `test-message-${Date.now()}`;
			const email = await createTestEmail(projectId, contactId, messageId);
			// Set as transactional email
			await new EmailPersistence(projectId).put({ ...email, sendType: "TRANSACTIONAL" });

			const event = createSNSEvent(messageId, "Complaint", {
				complaint: {
					complainedRecipients: [{ emailAddress: `contact-${contactId}@example.com` }],
					timestamp: new Date().toISOString(),
					complaintFeedbackType: "abuse",
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);

			// Verify contact was NOT unsubscribed (transactional emails don't unsubscribe)
			const contactPersistence = new ContactPersistence(projectId);
			const contact = await contactPersistence.get(contactId);
			expect(contact?.subscribed).toBe(true);

			// Verify email status was still updated
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const updatedEmail = emails.find((e) => e.messageId === messageId);
			expect(updatedEmail?.status).toBe("COMPLAINT");
		});
	});

	describe("Reject Events", () => {
		test("should handle reject event successfully", async () => {
			const messageId = `test-message-${Date.now()}`;
			await createTestEmail(projectId, contactId, messageId);

			const event = createSNSEvent(messageId, "Reject", {
				reject: {
					reason: "Bad content",
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");

			// Verify email status was updated
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const email = emails.find((e) => e.messageId === messageId);
			expect(email?.status).toBe("REJECTED");

			// Verify event was created
			const eventPersistence = new EventPersistence(projectId);
			const events = await eventPersistence.listAll();
			const rejectEvent = events.find((e) => e.eventType === "email.reject");
			expect(rejectEvent).toBeDefined();
			expect(rejectEvent?.contact).toBe(contactId);
		});
	});

	describe("Click Events", () => {
		test("should handle click event successfully", async () => {
			const messageId = `test-message-${Date.now()}`;
			await createTestEmail(projectId, contactId, messageId);

			const event = createSNSEvent(messageId, "Click", {
				click: {
					timestamp: new Date().toISOString(),
					userAgent: "Mozilla/5.0",
					ipAddress: "192.168.1.1",
					link: "https://example.com/link",
					linkTags: {
						"campaign": ["newsletter"],
					},
				},
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");

			// Verify email status was NOT updated (click doesn't change status)
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			const email = emails.find((e) => e.messageId === messageId);
			// Status should remain SENT since click is not in eventMap
			expect(email?.status).toBe("SENT");

			// Verify event was created
			const eventPersistence = new EventPersistence(projectId);
			const events = await eventPersistence.listAll();
			const clickEvent = events.find((e) => e.eventType === "email.click");
			expect(clickEvent).toBeDefined();
			expect(clickEvent?.contact).toBe(contactId);
			expect(clickEvent?.data).toHaveProperty("details");
		});

	});

	describe("Error Handling", () => {
		test("should handle missing email gracefully", async () => {
			const messageId = `non-existent-${Date.now()}`;

			const event = createSNSEvent(messageId, "Delivery", {
				delivery: {
					timestamp: new Date().toISOString(),
					processingTimeMillis: 500,
					recipients: [`contact-${contactId}@example.com`],
					smtpResponse: "250 OK",
				},
			});

			const result = await handler(event);

			// Should still return success even if email not found
			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");
		});

		test("should handle missing project gracefully", async () => {
			const messageId = `test-message-${Date.now()}`;

			// Create email with a non-existent project ID
			const fakeProjectId = "non-existent-project";
			const emailPersistence = new EmailPersistence(fakeProjectId);
			await emailPersistence.create({
				project: fakeProjectId,
				contact: contactId,
				messageId,
				subject: "Test Email",
				body: {
					html: "<p>Test body</p>",
					plainText: "Test body",
				},
				email: "test@example.com",
				status: "SENT",
				sendType: "MARKETING",
				sourceType: "ACTION",
				source: "test-action",
			});

			const event = createSNSEvent(messageId, "Delivery", {
				delivery: {
					timestamp: new Date().toISOString(),
					processingTimeMillis: 500,
					recipients: [`contact-${contactId}@example.com`],
					smtpResponse: "250 OK",
				},
			});

			const result = await handler(event);

			// Should still return success
			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");
		});

		test("should handle invalid SNS message format gracefully", async () => {
			const event: SNSEvent = {
				Records: [
					{
						EventSource: "aws:sns",
						EventVersion: "1.0",
						EventSubscriptionArn: "arn:aws:sns:us-east-1:123456789:test-topic:subscription-id",
						Sns: {
							Type: "Notification",
							MessageId: "test-message",
							TopicArn: "arn:aws:sns:us-east-1:123456789:test-topic",
							Subject: "Amazon SES Email Event",
							Message: "invalid json",
							Timestamp: new Date().toISOString(),
							SignatureVersion: "1",
							Signature: "test-signature",
							SigningCertUrl: "https://sns.us-east-1.amazonaws.com/test.pem",
							UnsubscribeUrl: "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe",
							MessageAttributes: {},
						},
					},
				],
			};

			const result = await handler(event);

			// Should still return success
			expect(result.statusCode).toBe(200);
			expect(result.body).toBe("OK");
		});
	});

});

