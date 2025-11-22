import { render as rtlRender, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { Provider as JotaiProvider } from "jotai";
import { SWRConfig } from "swr";
import { network } from "../../src/lib/network";
import { vi, beforeEach, afterEach } from "vitest";

/**
 * Custom render function that wraps components with necessary providers
 * Includes React Router, Jotai, and SWR providers
 */
export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper"> & {
		initialEntries?: string[];
	},
) {
	const { initialEntries = ["/"], ...renderOptions } = options || {};

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<SWRConfig
				value={{
					fetcher: network.fetch,
					dedupingInterval: 0,
					provider: () => new Map(),
					revalidateOnFocus: false,
				}}
			>
				<JotaiProvider>
					<MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
				</JotaiProvider>
			</SWRConfig>
		);
	}

	return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock localStorage token for authenticated requests
 */
export function mockAuthToken(token = "mock-jwt-token") {
	localStorage.setItem("sendra.token", token);
}

/**
 * Clear authentication token from localStorage
 */
export function clearAuthToken() {
	localStorage.removeItem("sendra.token");
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
	condition: () => boolean,
	timeout = 5000,
	interval = 50,
): Promise<void> {
	const startTime = Date.now();
	while (!condition()) {
		if (Date.now() - startTime > timeout) {
			throw new Error("Timeout waiting for condition");
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
}

/**
 * Create a mock file for file upload testing
 */
export function createMockFile(name = "test.txt", size = 1024, type = "text/plain"): File {
	const content = "a".repeat(size);
	return new File([content], name, { type });
}

/**
 * Utility to suppress console errors/warnings in tests
 * Useful when testing error states that log to console
 */
export function suppressConsole(methods: Array<"log" | "error" | "warn" | "info"> = ["error"]) {
	const mocks: Record<string, any> = {};

	beforeEach(() => {
		for (const method of methods) {
			mocks[method] = vi.spyOn(console, method).mockImplementation(() => {});
		}
	});

	afterEach(() => {
		for (const method of methods) {
			mocks[method]?.mockRestore();
		}
	});
}

/**
 * Create mock contact data for testing
 */
export function createMockContact(overrides: Record<string, any> = {}) {
	return {
		id: "contact-test-id",
		email: "test@example.com",
		subscribed: true,
		data: {
			firstName: "John",
			lastName: "Doe",
		},
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * Create mock project data for testing
 */
export function createMockProject(overrides: Record<string, any> = {}) {
	return {
		id: "project-test-id",
		name: "Test Project",
		url: "https://test.example.com",
		public: "test-public-key",
		secret: "test-secret-key",
		eventTypes: ["user.signup", "user.login"],
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * Create mock template data for testing
 */
export function createMockTemplate(overrides: Record<string, any> = {}) {
	return {
		id: "template-test-id",
		subject: "Test Email Subject",
		body: "<p>Test email body</p>",
		templateType: "MARKETING",
		project: "project-test-id",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * Create mock campaign data for testing
 */
export function createMockCampaign(overrides: Record<string, any> = {}) {
	return {
		id: "campaign-test-id",
		subject: "Test Campaign",
		status: "DRAFT",
		body: "<p>Campaign content</p>",
		project: "project-test-id",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

/**
 * Create mock user data for testing
 */
export function createMockUser(overrides: Record<string, any> = {}) {
	return {
		id: "user-test-id",
		email: "testuser@example.com",
		enabled: true,
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

// Default render function that uses renderWithProviders
export function render(ui: ReactElement, options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] }) {
	return renderWithProviders(ui, options);
}

// Re-export everything from @testing-library/react for convenience
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Re-export render as the default for convenience
export { render as default };

