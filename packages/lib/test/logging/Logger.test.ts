import { beforeEach, describe, expect, it, vi } from "vitest";
import { rootLogger } from "../../src/logging/Logger";
import { setRequestInfo } from "../../src/logging/RequestInfo";

describe("Logger", () => {
	beforeEach(() => {
		// Clear any previous environment variables
		vi.clearAllMocks();
	});

	describe("Log formatting", () => {
		it("should use pretty formatting when LOG_PRETTY is true", async () => {
			try {
				// Reset modules to clear any cached imports
				vi.resetModules();

				// Mock getLogConfig to return pretty: true
				const mockGetLogConfig = vi.fn().mockReturnValue({
					level: "info",
					pretty: true,
				});

				vi.doMock("../../src/services/AppConfig", () => ({
					getLogConfig: mockGetLogConfig,
				}));

				// Mock pino-pretty to verify it's being used
				const mockPinoPretty = vi.fn().mockImplementation(() => process.stdout);
				vi.doMock("pino-pretty", () => ({
					default: mockPinoPretty,
				}));

				// Dynamically import Logger after mocking to get a fresh instance
				const loggerModule = await import("../../src/logging/Logger");
				const prettyLogger = loggerModule.rootLogger;

				// Verify getLogConfig was called
				expect(mockGetLogConfig).toHaveBeenCalled();
				expect(prettyLogger).toBeDefined();

				// Verify pino-pretty was called with the correct options when pretty is true
				expect(mockPinoPretty).toHaveBeenCalledWith({
					levelFirst: true,
					colorize: true,
				});

				// Verify logger can log without errors
				expect(() => prettyLogger.info("test pretty message")).not.toThrow();

				// Clean up
				vi.doUnmock("../../src/services/AppConfig");
				vi.doUnmock("pino-pretty");
			} finally {
				vi.resetModules();
			}
		});

		it("should use standard JSON formatting when LOG_PRETTY is false", async () => {
			const logs: string[] = [];
			const originalWrite = process.stdout.write;

			// Mock stdout to capture logs
			process.stdout.write = vi.fn((chunk: string | Uint8Array) => {
				if (typeof chunk === "string") {
					logs.push(chunk);
				}
				return true;
			}) as unknown as typeof process.stdout.write;

			try {
				// Reset modules to clear any cached imports
				vi.resetModules();

				// Mock getLogConfig to return pretty: false
				const mockGetLogConfig = vi.fn().mockReturnValue({
					level: "info",
					pretty: false,
				});

				vi.doMock("../../src/services/AppConfig", () => ({
					getLogConfig: mockGetLogConfig,
				}));

				// Dynamically import Logger after mocking to get a fresh instance
				const loggerModule = await import("../../src/logging/Logger");
				const standardLogger = loggerModule.rootLogger;

				expect(mockGetLogConfig).toHaveBeenCalled();
				expect(standardLogger).toBeDefined();

				// Log a message to test standard formatting
				standardLogger.info("test standard message");

				// Wait for async log writing
				await new Promise((resolve) => setTimeout(resolve, 50));

				// Standard formatting should produce JSON output
				const logOutput = logs.join("");
				expect(logOutput.length).toBeGreaterThan(0);

				// Should be valid JSON with expected fields
				const logLines = logOutput.trim().split("\n");
				const lastLog = logLines[logLines.length - 1];
				expect(() => JSON.parse(lastLog)).not.toThrow();

				const parsed = JSON.parse(lastLog);
				expect(parsed).toHaveProperty("level");
				expect(parsed).toHaveProperty("msg");
				expect(parsed.msg).toBe("test standard message");

				// Clean up
				vi.doUnmock("../../src/services/AppConfig");
			} finally {
				process.stdout.write = originalWrite;
				vi.resetModules();
			}
		});

		it("should respect log level from config", async () => {
			const logs: string[] = [];
			const originalWrite = process.stdout.write;

			// Mock stdout to capture logs
			process.stdout.write = vi.fn((chunk: string | Uint8Array) => {
				if (typeof chunk === "string") {
					logs.push(chunk);
				}
				return true;
			}) as unknown as typeof process.stdout.write;

			try {
				// Reset modules to clear any cached imports
				vi.resetModules();

				const mockGetLogConfig = vi.fn().mockReturnValue({
					level: "warn",
					pretty: false,
				});

				vi.doMock("../../src/services/AppConfig", () => ({
					getLogConfig: mockGetLogConfig,
				}));

				// Dynamically import Logger after mocking to get a fresh instance
				const loggerModule = await import("../../src/logging/Logger");
				const warnLogger = loggerModule.rootLogger;

				expect(mockGetLogConfig).toHaveBeenCalled();
				expect(warnLogger).toBeDefined();

				// Info should not be logged when level is warn
				warnLogger.info("should not appear");
				// Warn should be logged
				warnLogger.warn("should appear");

				// Wait for async log writing
				await new Promise((resolve) => setTimeout(resolve, 50));

				const logOutput = logs.join("");

				// Should contain the warn message but not the info message
				expect(logOutput).toContain("should appear");
				expect(logOutput).not.toContain("should not appear");

				// Clean up
				vi.doUnmock("../../src/services/AppConfig");
			} finally {
				process.stdout.write = originalWrite;
				vi.resetModules();
			}
		});
	});

	describe("rootLogger", () => {
		it("should create a logger instance", () => {
			expect(rootLogger).toBeDefined();
			expect(typeof rootLogger.info).toBe("function");
			expect(typeof rootLogger.error).toBe("function");
			expect(typeof rootLogger.warn).toBe("function");
			expect(typeof rootLogger.debug).toBe("function");
		});

		it("should have child method", () => {
			const childLogger = rootLogger.child({ module: "test" });
			expect(childLogger).toBeDefined();
			expect(typeof childLogger.info).toBe("function");
		});

		it("should include request ID in logs when inside request context", async () => {
			const logs: string[] = [];
			const originalWrite = process.stdout.write;

			// Mock stdout to capture logs
			process.stdout.write = vi.fn((chunk: string | Uint8Array) => {
				if (typeof chunk === "string") {
					logs.push(chunk);
				}
				return true;
			}) as unknown as typeof process.stdout.write;

			try {
				await setRequestInfo(
					{
						correlationId: "test-correlation",
						requestId: "test-request-123",
					},
					async () => {
						rootLogger.info("test message");
					},
				);

				// Check that at least one log contains the request ID
				const hasRequestId = logs.some((log) => log.includes("test-request-123") || log.includes("reqId"));

				expect(hasRequestId).toBe(true);
			} finally {
				// Restore stdout
				process.stdout.write = originalWrite;
			}
		});

		it("should create child logger with additional context", () => {
			const childLogger = rootLogger.child({
				module: "TestModule",
				method: "testMethod",
			});

			expect(childLogger).toBeDefined();

			// Child logger should have the same methods
			expect(typeof childLogger.info).toBe("function");
			expect(typeof childLogger.error).toBe("function");
		});

		it("should log at different levels", () => {
			expect(() => rootLogger.debug("debug message")).not.toThrow();
			expect(() => rootLogger.info("info message")).not.toThrow();
			expect(() => rootLogger.warn("warn message")).not.toThrow();
			expect(() => rootLogger.error("error message")).not.toThrow();
		});

		it("should log objects", () => {
			expect(() =>
				rootLogger.info(
					{
						user: "testuser",
						action: "login",
					},
					"user logged in",
				),
			).not.toThrow();
		});

		it("should handle errors in logs", () => {
			const error = new Error("Test error");
			expect(() => rootLogger.error({ error }, "An error occurred")).not.toThrow();
		});

		it("should support nested child loggers", () => {
			const child1 = rootLogger.child({ module: "Parent" });
			const child2 = child1.child({ submodule: "Child" });

			expect(child2).toBeDefined();
			expect(() => child2.info("nested log")).not.toThrow();
		});
	});

	describe("Logger with request context", () => {
		it("should handle missing request info gracefully", () => {
			// Outside of request context
			expect(() => rootLogger.info("message without context")).not.toThrow();
		});

		it("should maintain request ID context within a single request", async () => {
			const logs: string[] = [];
			const originalWrite = process.stdout.write;

			process.stdout.write = vi.fn((chunk: string | Uint8Array) => {
				if (typeof chunk === "string") {
					logs.push(chunk);
				}
				return true;
			}) as unknown as typeof process.stdout.write;

			try {
				setRequestInfo({ correlationId: "c1", requestId: "req1" }, async () => {
					rootLogger.info("message 1");
					await Promise.resolve();
					rootLogger.info("message 2");
				});

				// Wait for async operations
				await new Promise((resolve) => setTimeout(resolve, 20));

				// Both messages should have the same request ID
				const req1Logs = logs.filter((log) => log.includes("req1"));
				expect(req1Logs.length).toBeGreaterThanOrEqual(2);
			} finally {
				process.stdout.write = originalWrite;
			}
		});
	});
});

