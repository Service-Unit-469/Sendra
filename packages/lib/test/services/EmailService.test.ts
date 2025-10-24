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
			expect(rawMessage).toContain("Reply-To: reply@example.com");
		});

		it("should use from email as reply-to when not provided", async () => {
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
			expect(rawMessage).toContain("Reply-To: sender@example.com");
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
			body: "<p>Test body</p>",
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

		it("should compile a simple MJML template", () => {
			const body = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello World</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
			`.trim();

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toContain("Hello World");
			expect(result).toContain("<!doctype html>");
		});

		it("should replace contact data in template", () => {
			const body = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello {{contact.data.firstName}}!</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
			`.trim();

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toContain("Hello John!");
		});

		it("should replace project data in template", () => {
			const body = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Project: {{project.name}}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
			`.trim();

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toContain("Project: Test Project");
		});

		it("should use default helper for undefined values", () => {
			const body = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Name: {{default contact.data.middleName "N/A"}}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
			`.trim();

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toContain("Name: N/A");
		});

		it("should throw error for invalid MJML", () => {
			const body = "<mjml><invalid-tag>Bad MJML</invalid-tag></mjml>";

			expect(() =>
				EmailService.compileBody(body, {
					contact: mockContact,
					project: mockProject,
					email: mockEmail,
					action: mockAction,
				}),
			).toThrow();
		});

		it("should include action name in template", () => {
			const body = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Action: {{action.name}}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
			`.trim();

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toContain("Action: Welcome Email");
		});

		it("should include APP_URI in template", () => {
			const body = `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          <a href="https://{{APP_URI}}">Link</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
			`.trim();

			const result = EmailService.compileBody(body, {
				contact: mockContact,
				project: mockProject,
				email: mockEmail,
				action: mockAction,
			});

			expect(result).toContain("https://example.com");
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

		it("should compile a simple subject", () => {
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
	});
});

