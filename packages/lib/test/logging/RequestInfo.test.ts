import { beforeEach, describe, expect, it } from "vitest";
import { type RequestInfo, getRequestInfo, setRequestInfo } from "../../src/logging/RequestInfo";

describe("RequestInfo", () => {
	const mockRequestInfo: RequestInfo = {
		correlationId: "test-correlation-id",
		requestId: "test-request-id",
	};

	beforeEach(() => {
		// Tests run in isolation so no cleanup needed
	});

	describe("setRequestInfo", () => {
		it("should store request info and make it available in the callback", async () => {
			let capturedInfo: RequestInfo | undefined;

			setRequestInfo(mockRequestInfo, async () => {
				capturedInfo = getRequestInfo();
			});

			expect(capturedInfo).toEqual(mockRequestInfo);
		});

		it("should isolate request info between different calls", async () => {
			const requestInfo1: RequestInfo = {
				correlationId: "correlation-1",
				requestId: "request-1",
			};
			const requestInfo2: RequestInfo = {
				correlationId: "correlation-2",
				requestId: "request-2",
			};

			let captured1: RequestInfo | undefined;
			let captured2: RequestInfo | undefined;

			setRequestInfo(requestInfo1, async () => {
				captured1 = getRequestInfo();
			});

			setRequestInfo(requestInfo2, async () => {
				captured2 = getRequestInfo();
			});

			expect(captured1).toEqual(requestInfo1);
			expect(captured2).toEqual(requestInfo2);
		});

		it("should handle nested setRequestInfo calls", async () => {
			const outerInfo: RequestInfo = {
				correlationId: "outer-correlation",
				requestId: "outer-request",
			};
			const innerInfo: RequestInfo = {
				correlationId: "inner-correlation",
				requestId: "inner-request",
			};

			let outerCaptured: RequestInfo | undefined;
			let innerCaptured: RequestInfo | undefined;
			let afterInnerCaptured: RequestInfo | undefined;

			setRequestInfo(outerInfo, async () => {
				outerCaptured = getRequestInfo();

				setRequestInfo(innerInfo, async () => {
					innerCaptured = getRequestInfo();
				});

				afterInnerCaptured = getRequestInfo();
			});

			expect(outerCaptured).toEqual(outerInfo);
			expect(innerCaptured).toEqual(innerInfo);
			expect(afterInnerCaptured).toEqual(outerInfo);
		});

		it("should not throw when called with async callback", () => {
			// Verify that setRequestInfo itself doesn't throw when called
			expect(() => {
				setRequestInfo(mockRequestInfo, async () => {
					// Async operations happen here
					await Promise.resolve();
				});
			}).not.toThrow();
		});

		it("should make request info available throughout async operations", async () => {
			let capturedBefore: RequestInfo | undefined;
			let capturedAfter: RequestInfo | undefined;

			setRequestInfo(mockRequestInfo, async () => {
				capturedBefore = getRequestInfo();
				await Promise.resolve();
				capturedAfter = getRequestInfo();
			});

			// Wait a bit for async operations to complete
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(capturedBefore).toEqual(mockRequestInfo);
			expect(capturedAfter).toEqual(mockRequestInfo);
		});
	});

	describe("getRequestInfo", () => {
		it("should return request info when inside setRequestInfo context", () => {
			setRequestInfo(mockRequestInfo, async () => {
				const info = getRequestInfo();
				expect(info).toEqual(mockRequestInfo);
			});
		});

		it("should return empty RequestInfo object when outside context", () => {
			const info = getRequestInfo();
			expect(info).toEqual({} as RequestInfo);
			expect(info.requestId).toBeUndefined();
			expect(info.correlationId).toBeUndefined();
		});

		it("should return correct info after context ends", async () => {
			let infoInside: RequestInfo | undefined;

			setRequestInfo(mockRequestInfo, async () => {
				infoInside = getRequestInfo();
			});

			// Wait for context to complete
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(infoInside).toEqual(mockRequestInfo);

			const infoOutside = getRequestInfo();
			expect(infoOutside).toEqual({} as RequestInfo);
		});
	});
});

