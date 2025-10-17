import { describe, expect, it, vi } from "vitest";

// Mock AppConfig to avoid initialization errors
vi.mock("../src/services/AppConfig", () => ({
	emailConfig: {
		appUrl: "example.com",
		emailConfigurationSetName: "test-config-set",
		allowDuplicateProjectIdentities: false,
		defaultEmail: "test@example.com",
	},
	getLogConfig: vi.fn(() => ({
		level: "info",
		pretty: false,
	})),
	getAuthConfig: vi.fn(() => ({
		issuer: "test",
		ttl: {
			secret: "90 D",
			public: "265 D",
			user: "2 H",
		},
		disableSignups: false,
	})),
	getEmailConfig: vi.fn(() => ({
		appUrl: "example.com",
		emailConfigurationSetName: "test-config-set",
		allowDuplicateProjectIdentities: false,
		defaultEmail: "test@example.com",
	})),
}));

// Mock AWS SDK
vi.mock("@aws-sdk/client-ses", () => ({
	SES: vi.fn(() => ({
		sendRawEmail: vi.fn(),
	})),
}));

import * as lib from "../src/index";

describe("index", () => {
	it("should export logging utilities", () => {
		expect(lib).toHaveProperty("rootLogger");
		expect(lib).toHaveProperty("getRequestInfo");
	});

	it("should export persistence classes", () => {
		expect(lib).toHaveProperty("ActionPersistence");
		expect(lib).toHaveProperty("BasePersistence");
		expect(lib).toHaveProperty("CampaignPersistence");
		expect(lib).toHaveProperty("ContactPersistence");
		expect(lib).toHaveProperty("EmailPersistence");
		expect(lib).toHaveProperty("EventPersistence");
		expect(lib).toHaveProperty("EventTypePersistence");
		expect(lib).toHaveProperty("GroupPersistence");
		expect(lib).toHaveProperty("MembershipPersistence");
		expect(lib).toHaveProperty("ProjectPersistence");
		expect(lib).toHaveProperty("TemplatePersistence");
		expect(lib).toHaveProperty("UserPersistence");
	});

	it("should export service classes", () => {
		expect(lib).toHaveProperty("ActionsService");
		expect(lib).toHaveProperty("EmailService");
		expect(lib).toHaveProperty("TaskQueue");
	});

	it("should export config functions", () => {
		expect(lib).toHaveProperty("getAuthConfig");
		expect(lib).toHaveProperty("getLogConfig");
		expect(lib).toHaveProperty("getEmailConfig");
	});
});

