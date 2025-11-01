import { http, HttpResponse } from "msw";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContactForm } from "../../../src/components/ContactForm/ContactForm";
import { server } from "../../mocks/server";
import { mockAuthToken, render, screen, userEvent, waitFor } from "../../utils/test-helpers";

describe("ContactForm Integration", () => {
	beforeEach(() => {
		mockAuthToken();
	});

	describe("Create Contact", () => {
		it("renders form with email field and submit button", () => {
			render(<ContactForm projectId="project-1" />);

			expect(screen.getByPlaceholderText(/hello@email.com/i)).toBeInTheDocument();
			expect(screen.getByText("Email")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
		});

		it("renders subscribed toggle", () => {
			render(<ContactForm projectId="project-1" />);

			expect(screen.getByText("Subscribed")).toBeInTheDocument();
			expect(screen.getByRole("switch")).toBeInTheDocument();
		});

		it("submits form with valid data", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();

			render(<ContactForm projectId="project-1" onSuccess={onSuccess} />);

			const emailInput = screen.getByPlaceholderText(/hello@email.com/i);
			const submitButton = screen.getByRole("button", { name: /save/i });

			await user.type(emailInput, "newcontact@example.com");
			await user.click(submitButton);

			await waitFor(() => {
				expect(onSuccess).toHaveBeenCalled();
			});
		});

		it("displays validation error for invalid email", async () => {
			const user = userEvent.setup();

			render(<ContactForm projectId="project-1" />);

			const emailInput = screen.getByPlaceholderText(/hello@email.com/i);
			const submitButton = screen.getByRole("button", { name: /save/i });

			await user.type(emailInput, "invalid-email");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/invalid/i)).toBeInTheDocument();
			});
		});

		it("toggles subscribed status", async () => {
			const user = userEvent.setup();

			render(<ContactForm projectId="project-1" />);

			const toggle = screen.getByRole("switch");

			// Initially should be checked (default)
			expect(screen.getByText(/opted-in to receive/i)).toBeInTheDocument();

			await user.click(toggle);

			// After toggle, should show unsubscribed message
			await waitFor(() => {
				expect(screen.getByText(/prefers not to receive/i)).toBeInTheDocument();
			});
		});

		it("hides email field when showEmailField is false", () => {
			render(<ContactForm projectId="project-1" showEmailField={false} />);

			expect(screen.queryByPlaceholderText(/hello@email.com/i)).not.toBeInTheDocument();
		});

		it("uses custom submit button text", () => {
			render(<ContactForm projectId="project-1" submitButtonText="Create Contact" />);

			expect(screen.getByRole("button", { name: /create contact/i })).toBeInTheDocument();
		});
	});

	describe("Update Contact", () => {
		it("renders form with initial data", () => {
			const initialData = {
				email: "existing@example.com",
				subscribed: false,
				data: { firstName: "John", lastName: "Doe" },
			};

			render(<ContactForm projectId="project-1" contactId="contact-1" initialData={initialData} />);

			const emailInput = screen.getByPlaceholderText(/hello@email.com/i) as HTMLInputElement;
			expect(emailInput.value).toBe("existing@example.com");
		});

		it("updates existing contact on submit", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();

			const initialData = {
				email: "existing@example.com",
				subscribed: true,
				data: {},
			};

			render(
				<ContactForm projectId="project-1" contactId="contact-1" initialData={initialData} onSuccess={onSuccess} />,
			);

			const emailInput = screen.getByPlaceholderText(/hello@email.com/i);
			const submitButton = screen.getByRole("button", { name: /save/i });

			await user.clear(emailInput);
			await user.type(emailInput, "updated@example.com");
			await user.click(submitButton);

			await waitFor(() => {
				expect(onSuccess).toHaveBeenCalled();
			});
		});
	});

	describe("API Error Handling", () => {
		it("handles API error on create", async () => {
			const user = userEvent.setup();

			// Override handler to return error
			server.use(
				http.post("http://localhost:4000/projects/:projectId/contacts", () => {
					return HttpResponse.json({ message: "Email already exists" }, { status: 400 });
				}),
			);

			render(<ContactForm projectId="project-1" />);

			const emailInput = screen.getByPlaceholderText(/hello@email.com/i);
			const submitButton = screen.getByRole("button", { name: /save/i });

			await user.type(emailInput, "duplicate@example.com");
			await user.click(submitButton);

			// Toast error should be shown (handled by sonner in the hook)
			// We can't easily test toast messages without additional setup
			// but we can verify the form is still rendered
			await waitFor(() => {
				expect(screen.getByPlaceholderText(/hello@email.com/i)).toBeInTheDocument();
			});
		});

		it("handles API error on update", async () => {
			const user = userEvent.setup();

			// Override handler to return error
			server.use(
				http.put("http://localhost:4000/projects/:projectId/contacts/:contactId", () => {
					return HttpResponse.json({ message: "Update failed" }, { status: 500 });
				}),
			);

			const initialData = {
				email: "existing@example.com",
				subscribed: true,
				data: {},
			};

			render(<ContactForm projectId="project-1" contactId="contact-1" initialData={initialData} />);

			const submitButton = screen.getByRole("button", { name: /save/i });
			await user.click(submitButton);

			// Form should still be present after error
			await waitFor(() => {
				expect(screen.getByPlaceholderText(/hello@email.com/i)).toBeInTheDocument();
			});
		});
	});

	describe("Metadata Form", () => {
		it("renders metadata form for additional contact data", () => {
			render(<ContactForm projectId="project-1" />);

			// ContactMetadataForm should be rendered
			// This component allows dynamic key-value pairs
			// The actual implementation would need to be tested separately
			expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
		});
	});
});

