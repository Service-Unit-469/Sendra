import { beforeEach, describe, expect, it, vi } from "vitest";
import { type LogMethodOptions, logMethodReturningPromise } from "../../src/logging/Decorator";
import { rootLogger } from "../../src/logging/Logger";

describe("Decorator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("logMethodReturningPromise", () => {
		it("should log method start and success", async () => {
			const infoSpy = vi.spyOn(rootLogger, "info");

			class TestClass {
				async testMethod(value: string): Promise<string> {
					return `processed: ${value}`;
				}
			}

			const instance = new TestClass();
			// Apply decorator manually
			const decorator = logMethodReturningPromise<string, string>("TestClass");
			instance.testMethod = decorator(instance.testMethod, "testMethod") as typeof instance.testMethod;

			const result = await instance.testMethod("test");

			expect(result).toBe("processed: test");
			expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("testMethod.start"));
			expect(infoSpy).toHaveBeenCalledWith(expect.objectContaining({ duration: expect.any(Number) }), expect.stringContaining("testMethod.succeeded"));
		});

		it("should log method failure", async () => {
			const infoSpy = vi.spyOn(rootLogger, "info");
			const warnSpy = vi.spyOn(rootLogger, "warn");

			class TestClass {
				async failingMethod(): Promise<void> {
					throw new Error("Test error");
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise<void, void>("TestClass");
			instance.failingMethod = decorator(instance.failingMethod, "failingMethod") as typeof instance.failingMethod;

			await expect(instance.failingMethod()).rejects.toThrow("Test error");

			expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining("failingMethod.start"));
			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					duration: expect.any(Number),
					error: expect.any(Error),
				}),
				expect.stringContaining("failingMethod.failed"),
			);
		});

		it("should include method arguments in logs", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithArgs(str: string, num: number): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithArgs = decorator(instance.methodWithArgs, "methodWithArgs") as typeof instance.methodWithArgs;

			await instance.methodWithArgs("test", 42);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						name: "methodWithArgs",
						module: "TestClass",
						args: expect.stringContaining("test"),
					}),
				}),
			);
		});

		it("should handle null arguments", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithNull(value: null): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithNull = decorator(instance.methodWithNull, "methodWithNull") as typeof instance.methodWithNull;

			await instance.methodWithNull(null);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: "null",
					}),
				}),
			);
		});

		it("should handle undefined arguments", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithUndefined(value: undefined): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithUndefined = decorator(instance.methodWithUndefined, "methodWithUndefined") as typeof instance.methodWithUndefined;

			await instance.methodWithUndefined(undefined);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: "undefined",
					}),
				}),
			);
		});

		it("should handle function arguments", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithFunction(callback: () => void): Promise<void> {
					callback();
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithFunction = decorator(instance.methodWithFunction, "methodWithFunction") as typeof instance.methodWithFunction;

			const namedFunction = function testCallback() {};
			await instance.methodWithFunction(namedFunction);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringContaining("function testCallback()"),
					}),
				}),
			);
		});

		it("should handle Blob arguments", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithBlob(blob: Blob): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithBlob = decorator(instance.methodWithBlob, "methodWithBlob") as typeof instance.methodWithBlob;

			const blob = new Blob(["test content"], { type: "text/plain" });
			await instance.methodWithBlob(blob);

			// In Node.js environment, Blob might be serialized as [object Object]
			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringMatching(/Blob|\[object Object\]/),
					}),
				}),
			);
		});

		it("should truncate long string arguments", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithLongString(str: string): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithLongString = decorator(instance.methodWithLongString, "methodWithLongString") as typeof instance.methodWithLongString;

			const longString = "a".repeat(300);
			await instance.methodWithLongString(longString);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringContaining("..."),
					}),
				}),
			);

			const callArgs = childSpy.mock.calls[0][0];
			const argsString = (callArgs as { method: { args: string } }).method.args;
			expect(argsString.length).toBeLessThan(longString.length);
		});

		it("should handle object arguments with traceable keys", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithObject(obj: { id: string; message: string }): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithObject = decorator(instance.methodWithObject, "methodWithObject") as typeof instance.methodWithObject;

			await instance.methodWithObject({ id: "123", message: "test message" });

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringContaining("123"),
					}),
				}),
			);
		});

		it("should handle object arguments without traceable keys", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithGenericObject(obj: { name: string }): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithGenericObject = decorator(instance.methodWithGenericObject, "methodWithGenericObject") as typeof instance.methodWithGenericObject;

			await instance.methodWithGenericObject({ name: "test" });

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringContaining("Object:"),
					}),
				}),
			);
		});

		it("should handle multiple arguments", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class TestClass {
				async methodWithMultipleArgs(str: string, num: number, bool: boolean): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithMultipleArgs = decorator(instance.methodWithMultipleArgs, "methodWithMultipleArgs") as typeof instance.methodWithMultipleArgs;

			await instance.methodWithMultipleArgs("test", 42, true);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringMatching(/test.*42.*true/),
					}),
				}),
			);
		});

		it("should include custom context options", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			const options: LogMethodOptions = {
				context: {
					userId: "user123",
					requestType: "api",
				},
			};

			class TestClass {
				async methodWithContext(): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass", options);
			instance.methodWithContext = decorator(instance.methodWithContext, "methodWithContext") as typeof instance.methodWithContext;

			await instance.methodWithContext();

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: "user123",
					requestType: "api",
				}),
			);
		});

		it("should measure execution duration", async () => {
			const infoSpy = vi.spyOn(rootLogger, "info");

			class TestClass {
				async slowMethod(): Promise<void> {
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.slowMethod = decorator(instance.slowMethod, "slowMethod") as typeof instance.slowMethod;

			await instance.slowMethod();

			const successCall = infoSpy.mock.calls.find((call) => typeof call[1] === "string" && call[1].includes("succeeded"));

			expect(successCall).toBeDefined();
			if (successCall) {
				const logObject = successCall[0] as { duration: number };
				expect(logObject.duration).toBeGreaterThanOrEqual(45);
			}
		});

		it("should preserve method return value", async () => {
			class TestClass {
				async getValue(input: number): Promise<number> {
					return input * 2;
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise<number, number>("TestClass");
			instance.getValue = decorator(instance.getValue, "getValue") as typeof instance.getValue;

			const result = await instance.getValue(21);

			expect(result).toBe(42);
		});

		it("should preserve thrown errors", async () => {
			const customError = new Error("Custom error message");

			class TestClass {
				async throwError(): Promise<void> {
					throw customError;
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise<void, void>("TestClass");
			instance.throwError = decorator(instance.throwError, "throwError") as typeof instance.throwError;

			await expect(instance.throwError()).rejects.toThrow(customError);
		});

		it("should handle class with custom name", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class CustomNamedClass {
				async myMethod(): Promise<void> {
					// Method implementation
				}
			}

			const instance = new CustomNamedClass();
			const decorator = logMethodReturningPromise("MyCustomModule");
			instance.myMethod = decorator(instance.myMethod, "myMethod") as typeof instance.myMethod;

			await instance.myMethod();

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						module: "MyCustomModule",
					}),
				}),
			);
		});

		it("should handle object with type constructor", async () => {
			const childSpy = vi.spyOn(rootLogger, "child");

			class CustomType {
				id = "custom-id";
				message = "custom message";
				toString() {
					return `CustomType(${this.id})`;
				}
			}

			class TestClass {
				async methodWithCustomType(obj: CustomType): Promise<void> {
					// Method implementation
				}
			}

			const instance = new TestClass();
			const decorator = logMethodReturningPromise("TestClass");
			instance.methodWithCustomType = decorator(instance.methodWithCustomType, "methodWithCustomType") as typeof instance.methodWithCustomType;

			const customObj = new CustomType();
			await instance.methodWithCustomType(customObj);

			expect(childSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					method: expect.objectContaining({
						args: expect.stringContaining("custom-id"),
					}),
				}),
			);
		});
	});
});
