import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useContactForm } from "../../../src/components/ContactForm/useContactForm";
import { server } from "../../mocks/server";
import { mockAuthToken } from "../../utils/test-helpers";

describe("useContactForm Hook", () => {
	beforeEach(() => {
		mockAuthToken();
	});

	describe("Initialization", () => {
		it("initializes with default values", () => {
			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
				}),
			);

			expect(result.current.watch("email")).toBe("");
			expect(result.current.watch("subscribed")).toBe(true);
			expect(result.current.watch("data")).toEqual({});
		});

		it("initializes with provided initial data", () => {
			const initialData = {
				email: "test@example.com",
				subscribed: false,
				data: { firstName: "John" },
			};

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					initialData,
				}),
			);

			expect(result.current.watch("email")).toBe("test@example.com");
			expect(result.current.watch("subscribed")).toBe(false);
			expect(result.current.watch("data")).toEqual({ firstName: "John" });
		});
	});

	describe("Create Contact", () => {
		it("creates contact successfully", async () => {
			const onSuccess = vi.fn();
			let requestBody: any;

			// Intercept request to capture body
			server.use(
				http.post("http://localhost:4000/api/v1/projects/project-1/contacts", async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						id: "new-contact-id",
						...requestBody,
					});
				}),
			);

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					onSuccess,
				}),
			);

			const contactData = {
				email: "newcontact@example.com",
				subscribed: true,
				data: { firstName: "Jane" },
			};

			result.current.createContact(contactData);

			await waitFor(() => {
				expect(requestBody).toEqual(contactData);
				expect(onSuccess).toHaveBeenCalled();
			});
		});

		it("handles create contact error", async () => {
			const onSuccess = vi.fn();

			server.use(
				http.post("http://localhost:4000/api/v1/projects/project-1/contacts", () => {
					return HttpResponse.json({ message: "Email already exists" }, { status: 400 });
				}),
			);

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					onSuccess,
				}),
			);

			const contactData = {
				email: "duplicate@example.com",
				subscribed: true,
				data: {},
			};

			result.current.createContact(contactData);

			// Wait a bit for the promise to resolve
			await new Promise((resolve) => setTimeout(resolve, 100));

			// onSuccess should not be called on error
			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	describe("Update Contact", () => {
		it("updates contact successfully", async () => {
			const onSuccess = vi.fn();
			let requestBody: any;

			server.use(
				http.put("http://localhost:4000/api/v1/projects/project-1/contacts/contact-1", async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						id: "contact-1",
						...requestBody,
					});
				}),
			);

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					contactId: "contact-1",
					onSuccess,
				}),
			);

			const contactData = {
				email: "updated@example.com",
				subscribed: false,
				data: { firstName: "John" },
			};

			result.current.updateContact(contactData);

			await waitFor(() => {
				expect(requestBody).toEqual({
					...contactData,
					id: "contact-1",
				});
				expect(onSuccess).toHaveBeenCalled();
			});
		});

		it("does not update if contactId is not provided", async () => {
			const onSuccess = vi.fn();

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					onSuccess,
				}),
			);

			result.current.updateContact({
				email: "test@example.com",
				subscribed: true,
				data: {},
			});

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should not call onSuccess
			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	describe("Delete Contact", () => {
		it("deletes contact successfully", async () => {
			let deleteCalled = false;

			server.use(
				http.delete("http://localhost:4000/api/v1/projects/project-1/contacts/contact-1", () => {
					deleteCalled = true;
					return new HttpResponse(null, { status: 204 });
				}),
			);

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					contactId: "contact-1",
				}),
			);

			await result.current.deleteContact();

			await waitFor(() => {
				expect(deleteCalled).toBe(true);
			});
		});

		it("does not delete if contactId is not provided", async () => {
			let deleteCalled = false;

			server.use(
				http.delete("http://localhost:4000/api/v1/projects/project-1/contacts/:contactId", () => {
					deleteCalled = true;
					return new HttpResponse(null, { status: 204 });
				}),
			);

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
				}),
			);

			await result.current.deleteContact();

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(deleteCalled).toBe(false);
		});
	});

	describe("Form Reset", () => {
		it("resets form to initial values", () => {
			const initialData = {
				email: "initial@example.com",
				subscribed: true,
				data: { firstName: "Initial" },
			};

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					initialData,
				}),
			);

			// Change values
			act(() => {
				result.current.setValue("email", "changed@example.com");
				result.current.setValue("subscribed", false);
			});

			// Reset
			act(() => {
				result.current.reset();
			});

			// Should be back to initial values
			expect(result.current.watch("email")).toBe("initial@example.com");
			expect(result.current.watch("subscribed")).toBe(true);
		});

		it("resets form to new values if provided", () => {
			const initialData = {
				email: "initial@example.com",
				subscribed: true,
				data: {},
			};

			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
					initialData,
				}),
			);

			const newData = {
				email: "new@example.com",
				subscribed: false,
				data: { firstName: "New" },
			};

			act(() => {
				result.current.reset(newData);
			});

			expect(result.current.watch("email")).toBe("new@example.com");
			expect(result.current.watch("subscribed")).toBe(false);
			expect(result.current.watch("data")).toEqual({ firstName: "New" });
		});
	});

	describe("Form Validation", () => {
		it("validates email format", async () => {
			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
				}),
			);

			act(() => {
				result.current.setValue("email", "invalid-email", { shouldValidate: true });
			});

			await waitFor(() => {
				expect(result.current.errors.email).toBeDefined();
			});
		});

		it("allows valid email", async () => {
			const { result } = renderHook(() =>
				useContactForm({
					projectId: "project-1",
				}),
			);

			act(() => {
				result.current.setValue("email", "valid@example.com", { shouldValidate: true });
			});

			await waitFor(() => {
				expect(result.current.errors.email).toBeUndefined();
			});
		});
	});
});

