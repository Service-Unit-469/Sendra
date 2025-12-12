import { beforeEach, describe, expect, it } from "vitest";
import { getAuthConfig, getEmailConfig, getLogConfig } from "../../src/services/AppConfig";

describe("AppConfig", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset process.env before each test
		process.env = { ...originalEnv };
		// Clear all config-related env vars
		delete process.env.AUTH_ISSUER;
		delete process.env.AUTH_TTL_SECRET;
		delete process.env.AUTH_TTL_PUBLIC;
		delete process.env.AUTH_TTL_USER;
		delete process.env.DISABLE_SIGNUPS;
		delete process.env.LOG_LEVEL;
		delete process.env.LOG_PRETTY;
		delete process.env.ALLOW_DUPLICATE_PROJECT_IDENTITIES;
		delete process.env.APP_URL;
		delete process.env.DEFAULT_EMAIL;
		delete process.env.EMAIL_CONFIGURATION_SET_NAME;
	});

	describe("getAuthConfig", () => {
		it("should return default auth config when no env vars are set", () => {
			const config = getAuthConfig();

			expect(config).toEqual({
				issuer: "sendra",
				ttl: {
					secret: "90 D",
					public: "265 D",
					user: "2 H",
				},
				disableSignups: false,
			});
		});

		it("should parse custom AUTH_ISSUER", () => {
			process.env.AUTH_ISSUER = "custom-issuer";
			const config = getAuthConfig();

			expect(config.issuer).toBe("custom-issuer");
		});

		it("should parse custom TTL values with string format", () => {
			process.env.AUTH_TTL_SECRET = "30 D";
			process.env.AUTH_TTL_PUBLIC = "365 D";
			process.env.AUTH_TTL_USER = "1 H";

			const config = getAuthConfig();

			expect(config.ttl.secret).toBe("30 D");
			expect(config.ttl.public).toBe("365 D");
			expect(config.ttl.user).toBe("1 H");
		});

		it("should throw error for numeric TTL without time unit", () => {
			process.env.AUTH_TTL_SECRET = "3600";

			expect(() => getAuthConfig()).toThrow();
		});

		it("should parse TTL with different time units", () => {
			process.env.AUTH_TTL_SECRET = "1 Y";
			process.env.AUTH_TTL_PUBLIC = "52 W";
			process.env.AUTH_TTL_USER = "120 M";

			const config = getAuthConfig();

			expect(config.ttl.secret).toBe("1 Y");
			expect(config.ttl.public).toBe("52 W");
			expect(config.ttl.user).toBe("120 M");
		});

		it("should parse TTL with milliseconds and seconds", () => {
			process.env.AUTH_TTL_SECRET = "1000 Ms";
			process.env.AUTH_TTL_USER = "30 s";

			const config = getAuthConfig();

			expect(config.ttl.secret).toBe("1000 Ms");
			expect(config.ttl.user).toBe("30 s");
		});

		it("should throw error for invalid TTL format", () => {
			process.env.AUTH_TTL_SECRET = "invalid";

			expect(() => getAuthConfig()).toThrow();
		});

		it("should throw error for TTL with invalid time unit", () => {
			process.env.AUTH_TTL_SECRET = "30 X";

			expect(() => getAuthConfig()).toThrow();
		});

		it("should parse DISABLE_SIGNUPS as true", () => {
			process.env.DISABLE_SIGNUPS = "true";
			const config = getAuthConfig();

			expect(config.disableSignups).toBe(true);
		});

		it("should parse DISABLE_SIGNUPS as false", () => {
			process.env.DISABLE_SIGNUPS = "false";
			const config = getAuthConfig();

			expect(config.disableSignups).toBe(false);
		});

		it("should default DISABLE_SIGNUPS to false", () => {
			const config = getAuthConfig();

			expect(config.disableSignups).toBe(false);
		});

		it("should throw error for invalid DISABLE_SIGNUPS value", () => {
			process.env.DISABLE_SIGNUPS = "yes";

			expect(() => getAuthConfig()).toThrow();
		});

		it("should parse all custom values together", () => {
			process.env.AUTH_ISSUER = "my-app";
			process.env.AUTH_TTL_SECRET = "60 D";
			process.env.AUTH_TTL_PUBLIC = "180 D";
			process.env.AUTH_TTL_USER = "4 H";
			process.env.DISABLE_SIGNUPS = "true";

			const config = getAuthConfig();

			expect(config).toEqual({
				issuer: "my-app",
				ttl: {
					secret: "60 D",
					public: "180 D",
					user: "4 H",
				},
				disableSignups: true,
			});
		});
	});

	describe("getLogConfig", () => {
		it("should return default log config when no env vars are set", () => {
			const config = getLogConfig();

			expect(config).toEqual({
				level: "info",
				pretty: false,
				metricsEnabled: false,
			});
		});

		it("should parse LOG_LEVEL as debug", () => {
			process.env.LOG_LEVEL = "debug";
			const config = getLogConfig();

			expect(config.level).toBe("debug");
		});

		it("should parse LOG_LEVEL as info", () => {
			process.env.LOG_LEVEL = "info";
			const config = getLogConfig();

			expect(config.level).toBe("info");
		});

		it("should parse LOG_LEVEL as warn", () => {
			process.env.LOG_LEVEL = "warn";
			const config = getLogConfig();

			expect(config.level).toBe("warn");
		});

		it("should parse LOG_LEVEL as error", () => {
			process.env.LOG_LEVEL = "error";
			const config = getLogConfig();

			expect(config.level).toBe("error");
		});

		it("should throw error for invalid LOG_LEVEL", () => {
			process.env.LOG_LEVEL = "trace";

			expect(() => getLogConfig()).toThrow();
		});

		it("should parse LOG_PRETTY as true", () => {
			process.env.LOG_PRETTY = "true";
			const config = getLogConfig();

			expect(config.pretty).toBe(true);
		});

		it("should parse LOG_PRETTY as false", () => {
			process.env.LOG_PRETTY = "false";
			const config = getLogConfig();

			expect(config.pretty).toBe(false);
		});

		it("should default LOG_PRETTY to false", () => {
			const config = getLogConfig();

			expect(config.pretty).toBe(false);
		});

		it("should throw error for invalid LOG_PRETTY value", () => {
			process.env.LOG_PRETTY = "yes";

			expect(() => getLogConfig()).toThrow();
		});

		it("should parse all custom values together", () => {
			process.env.LOG_LEVEL = "debug";
			process.env.LOG_PRETTY = "true";

			const config = getLogConfig();

			expect(config).toEqual({
				level: "debug",
				pretty: true,
				metricsEnabled: false,
			});
		});
	});

	describe("getEmailConfig", () => {
		it("should parse valid email config", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			const config = getEmailConfig();

			expect(config).toEqual({
				allowDuplicateProjectIdentities: false,
				appUrl: "https://example.com",
				defaultEmail: "noreply@example.com",
				emailConfigurationSetName: "my-config-set",
			});
		});

		it("should throw error when APP_URL is missing", () => {
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			expect(() => getEmailConfig()).toThrow();
		});

		it("should throw error when APP_URL is invalid", () => {
			process.env.APP_URL = "not-a-url";
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			expect(() => getEmailConfig()).toThrow();
		});

		it("should throw error when DEFAULT_EMAIL is missing", () => {
			process.env.APP_URL = "https://example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			expect(() => getEmailConfig()).toThrow();
		});

		it("should throw error when DEFAULT_EMAIL is invalid", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "not-an-email";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			expect(() => getEmailConfig()).toThrow();
		});

		it("should throw error when EMAIL_CONFIGURATION_SET_NAME is missing", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply@example.com";

			expect(() => getEmailConfig()).toThrow();
		});

		it("should parse ALLOW_DUPLICATE_PROJECT_IDENTITIES as true", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";
			process.env.ALLOW_DUPLICATE_PROJECT_IDENTITIES = "true";

			const config = getEmailConfig();

			expect(config.allowDuplicateProjectIdentities).toBe(true);
		});

		it("should parse ALLOW_DUPLICATE_PROJECT_IDENTITIES as false", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";
			process.env.ALLOW_DUPLICATE_PROJECT_IDENTITIES = "false";

			const config = getEmailConfig();

			expect(config.allowDuplicateProjectIdentities).toBe(false);
		});

		it("should default ALLOW_DUPLICATE_PROJECT_IDENTITIES to false", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			const config = getEmailConfig();

			expect(config.allowDuplicateProjectIdentities).toBe(false);
		});

		it("should throw error for invalid ALLOW_DUPLICATE_PROJECT_IDENTITIES value", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply@example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";
			process.env.ALLOW_DUPLICATE_PROJECT_IDENTITIES = "yes";

			expect(() => getEmailConfig()).toThrow();
		});

		it("should parse all custom values together", () => {
			process.env.APP_URL = "https://myapp.com";
			process.env.DEFAULT_EMAIL = "hello@myapp.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "production-config";
			process.env.ALLOW_DUPLICATE_PROJECT_IDENTITIES = "true";

			const config = getEmailConfig();

			expect(config).toEqual({
				allowDuplicateProjectIdentities: true,
				appUrl: "https://myapp.com",
				defaultEmail: "hello@myapp.com",
				emailConfigurationSetName: "production-config",
			});
		});

		it("should accept http URLs", () => {
			process.env.APP_URL = "http://localhost:3000";
			process.env.DEFAULT_EMAIL = "dev@localhost.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "local-config";

			const config = getEmailConfig();

			expect(config.appUrl).toBe("http://localhost:3000");
		});

		it("should accept complex email addresses", () => {
			process.env.APP_URL = "https://example.com";
			process.env.DEFAULT_EMAIL = "noreply+test@subdomain.example.com";
			process.env.EMAIL_CONFIGURATION_SET_NAME = "my-config-set";

			const config = getEmailConfig();

			expect(config.defaultEmail).toBe("noreply+test@subdomain.example.com");
		});
	});
});

