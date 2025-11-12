import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Action, Contact, Email, PublicProject } from "@sendra/shared";

// Mock AWS SDK
vi.mock("@aws-sdk/client-ses", () => {
	const mockSendRawEmail = vi.fn();
	return {
		SES: vi.fn(function() {
			return {
				sendRawEmail: mockSendRawEmail,
			};
		}),
		__mockSendRawEmail: mockSendRawEmail,
	};
});

// Mock the getEmailConfig and getLogConfig
vi.mock("../../src/services/AppConfig", () => ({
	getEmailConfig: vi.fn(() => ({
		appUrl: "example.com",
		emailConfigurationSetName: "test-config-set",
		defaultEmail: "noreply@example.com",
	})),
	getLogConfig: vi.fn(() => ({
		level: "info",
		pretty: false,
	})),
}));

import { EmailService } from "../../src/services/EmailService";

// Get mock function after import
// @ts-expect-error mocking
const mockSendRawEmail = vi.mocked((await import("@aws-sdk/client-ses")).__mockSendRawEmail as any);

describe("EmailService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("send", () => {
		it("should send a basic email successfully", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			const result = await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
			});

			expect(mockSendRawEmail).toHaveBeenCalled();
			expect(result).toEqual({ messageId: "test-message-id-123" });
		});

		it("should include reply-to header when provided", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				reply: "reply@example.com",
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);
			// Check that Reply-To header exists with the reply email (format may vary due to encoding)
			expect(rawMessage).toMatch(/Reply-To:.*reply@example\.com/);
		});

		it("should not include reply-to header when not provided", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);
			// Should not have Reply-To header when not provided
			expect(rawMessage).not.toMatch(/^Reply-To:/m);
		});

		it("should include custom headers when provided", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
				headers: {
					"X-Custom-Header": "custom-value",
					"X-Campaign-ID": "campaign-123",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);
			expect(rawMessage).toContain("X-Custom-Header: custom-value");
			expect(rawMessage).toContain("X-Campaign-ID: campaign-123");
		});

		it("should handle multiple recipients", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient1@example.com", "recipient2@example.com", "recipient3@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			expect(callArgs.Destinations).toEqual(["recipient1@example.com", "recipient2@example.com", "recipient3@example.com"]);
		});

		it("should include attachments when provided", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
				attachments: [
					{
						filename: "document.pdf",
						content: "base64content",
						contentType: "application/pdf",
					},
				],
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);
			expect(rawMessage).toContain("Content-Disposition: attachment; filename=\"document.pdf\"");
			expect(rawMessage).toContain("Content-Type: application/pdf");
		});

		it("should include plain text content when provided", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
					plainText: "Test content",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);
			expect(rawMessage).toContain("text/plain");
			expect(rawMessage).toContain("Test content");
		});

		it("should throw error when send fails", async () => {
			mockSendRawEmail.mockResolvedValue({});

			await expect(
				EmailService.send({
					from: {
						name: "Test Sender",
						email: "sender@example.com",
					},
					to: ["recipient@example.com"],
					content: {
						subject: "Test Subject",
						html: "<p>Test content</p>",
					},
				}),
			).rejects.toThrow("Could not send email");
		});

		it("should include unsubscribe link", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			const rawMessage = new TextDecoder().decode(callArgs.RawMessage.Data);
			expect(rawMessage).toContain("List-Unsubscribe:");
			expect(rawMessage).toContain("https://example.com/subscription/?email=");
		});

		it("should set correct source and configuration", async () => {
			mockSendRawEmail.mockResolvedValue({ MessageId: "test-message-id-123" });

			await EmailService.send({
				from: {
					name: "Test Sender",
					email: "sender@example.com",
				},
				to: ["recipient@example.com"],
				content: {
					subject: "Test Subject",
					html: "<p>Test content</p>",
				},
			});

			const callArgs = mockSendRawEmail.mock.calls[0][0];
			expect(callArgs.Source).toBe("Test Sender <sender@example.com>");
			expect(callArgs.ConfigurationSetName).toBe("test-config-set");
		});
	});

	describe("compileBody", () => {

		const mockProject: PublicProject = {
			id: "project-123",
			name: "Test Project",
			createdAt: "",
			updatedAt: "",
			url: "https://example.com",
			eventTypes: [],
		};

		const mockContact: Contact = {
			id: "contact-123",
			email: "test@example.com",
			subscribed: true,
			data: {
				firstName: "John",
				lastName: "Doe",
			},
			createdAt: "1000",
			updatedAt: "1000",
			project: mockProject.id
		};
		const mockEmail: Email = {
			id: "email-123",
			sendType: "TRANSACTIONAL",
			subject: "Test Subject",
			body: {
				html: "<p>Test body</p>",
				plainText: "Test body",
			},
			createdAt: "1000",
			updatedAt: "1000",
			project: mockProject.id,
			contact: mockContact.id,
			email: "",
			status: "DELIVERED"
		};

		const mockAction: Pick<Action, "name"> = {
			name: "Welcome Email",
		};

		it("should compile a simple body without variables", () => {
			const body = "<p>Hello World</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Hello World</p>");
		});

		it("should replace contact data in body", () => {
			const body = "<p>Hello {{contact.data.firstName}}!</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Hello John!</p>");
		});

		it("should replace project data in body", () => {
			const body = "<p>Project: {{project.name}}</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Project: Test Project</p>");
		});

		it("should use default helper for undefined values", () => {
			const body = "<p>Name: {{default contact.data.middleName \"N/A\"}}</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Name: N/A</p>");
		});

		it("should use first value when available with default helper", () => {
			const body = "<p>Name: {{default contact.data.firstName \"N/A\"}}</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Name: John</p>");
		});

		it("should include action name in body", () => {
			const body = "<p>Action: {{action.name}}</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Action: Welcome Email</p>");
		});

		it("should include APP_URI in body", () => {
			const body = "<p><a href=\"https://{{APP_URI}}\">Link</a></p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p><a href=\"https://example.com\">Link</a></p>");
		});

		it("should handle multiple variable replacements", () => {
			const body = "<p>Hello {{contact.data.firstName}} {{contact.data.lastName}} from {{project.name}}!</p>";

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>Hello John Doe from Test Project!</p>");
		});

		it("should handle nested object access", () => {
			const contactWithNested = {
				...mockContact,
				data: {
					...mockContact.data,
					address: {
						city: "New York",
						state: "NY",
					},
				},
			};

			const body = "<p>City: {{contact.data.address.city}}, State: {{contact.data.address.state}}</p>";

			const result = EmailService.compileBody(body, {
				contact: contactWithNested,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toBe("<p>City: New York, State: NY</p>");
		});
	});

	describe("compileSubject", () => {
		const mockProject: PublicProject = {
			id: "project-123",
			name: "Test Project",
			createdAt: "",
			updatedAt: "",
			url: "",
			eventTypes: [],
		};
		
		const mockContact: Contact = {
			id: "contact-123",
			email: "test@example.com",
			subscribed: true,
			data: {
				firstName: "John",
				lastName: "Doe",
			},
			createdAt: "1000",
			updatedAt: "1000",
			project: mockProject.id
		};

		const mockAction: Pick<Action, "name"> = {
			name: "Welcome Email",
		};

		it("should compile a simple subject without variables", () => {
			const subject = "Welcome to our service!";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("Welcome to our service!");
		});

		it("should replace contact data in subject", () => {
			const subject = "Hello {{contact.data.firstName}}!";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("Hello John!");
		});

		it("should replace project name in subject", () => {
			const subject = "Welcome to {{project.name}}";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("Welcome to Test Project");
		});

		it("should use default helper for undefined values", () => {
			const subject = "Hello {{default contact.data.nickname contact.data.firstName}}!";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("Hello John!");
		});

		it("should handle action name in subject", () => {
			const subject = "[{{action.name}}] Important message";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("[Welcome Email] Important message");
		});

		it("should handle multiple variable replacements", () => {
			const subject = "{{contact.data.firstName}} {{contact.data.lastName}} - {{project.name}}";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("John Doe - Test Project");
		});

		it("should handle empty string for undefined variables", () => {
			const subject = "Hello {{contact.data.middleName}}!";

			const result = EmailService.compileSubject(subject, {
				contact: mockContact,
				project: mockProject,
				action: mockAction,
			});

			expect(result).toBe("Hello !");
		});
	});
});
