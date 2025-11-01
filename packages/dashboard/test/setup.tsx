import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";
import React from "react";

// Mock Next.js router
vi.mock("next/router", () => ({
	useRouter: vi.fn(() => ({
		pathname: "/",
		route: "/",
		query: {},
		asPath: "/",
		push: vi.fn(),
		replace: vi.fn(),
		reload: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
		beforePopState: vi.fn(),
		events: {
			on: vi.fn(),
			off: vi.fn(),
			emit: vi.fn(),
		},
		isFallback: false,
		isLocaleDomain: false,
		isReady: true,
		isPreview: false,
	})),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
	default: (props: any) => {
		// eslint-disable-next-line jsx-a11y/alt-text
		return <img {...props} />;
	},
}));

// Mock Next.js Head component
vi.mock("next/head", () => ({
	default: ({ children }: { children: React.ReactNode }) => {
		return <>{children}</>;
	},
}));

// Mock sessionStorage
const sessionStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, "sessionStorage", {
	value: sessionStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Set up MSW server
beforeAll(() => {
	server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
	cleanup();
	server.resetHandlers();
	sessionStorageMock.clear();
});

// Clean up after all tests
afterAll(() => {
	server.close();
});

// Mock environment variables
process.env.NEXT_PUBLIC_API_URI = "http://localhost:4000";
process.env.NEXT_PUBLIC_AWS_REGION = "us-east-1";

