import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import type { Context, SQSEvent } from "aws-lambda";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { handler } from "../src/TaskQueueSubscriber";
import { createTestSetup } from "./utils/test-helpers";

// Mock the handlers
vi.mock("../src/handlers/SendEmailTask", () => ({
	sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/handlers/DeleteTask", () => ({
	handleDelete: vi.fn().mockResolvedValue(undefined),
}));

import { handleDelete } from "../src/handlers/DeleteTask";
import { sendEmail } from "../src/handlers/SendEmailTask";

describe("TaskQueueSubscriber", () => {
	let projectId: string;

	beforeAll(async () => {
		await startupDynamoDB();
	});

	afterAll(async () => {
		await stopDynamoDB();
	});

	beforeEach(async () => {
		vi.clearAllMocks();
		const { project } = await createTestSetup();
		projectId = project.id;
	});

	const createSQSEvent = (task: Record<string, unknown>, messageId = `msg-${Date.now()}`): SQSEvent => {
		return {
			Records: [
				{
					messageId,
					receiptHandle: "test-receipt-handle",
					body: JSON.stringify(task),
					attributes: {
						ApproximateReceiveCount: "1",
						SentTimestamp: Date.now().toString(),
						SenderId: "test-sender",
						ApproximateFirstReceiveTimestamp: Date.now().toString(),
					},
					messageAttributes: {},
					md5OfBody: "test-md5",
					eventSource: "aws:sqs",
					eventSourceARN: "arn:aws:sqs:us-east-1:123456789:test-queue",
					awsRegion: "us-east-1",
				},
			],
		};
	};

	const createContext = (): Context => ({
		callbackWaitsForEmptyEventLoop: false,
		functionName: "test-function",
		functionVersion: "$LATEST",
		invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789:function:test",
		memoryLimitInMB: "128",
		awsRequestId: "test-request-id",
		logGroupName: "/aws/lambda/test",
		logStreamName: "2024/01/01/[$LATEST]test",
		getRemainingTimeInMillis: () => 30000,
		done: () => {},
		fail: () => {},
		succeed: () => {},
	});

	describe("SendEmail Task", () => {
		test("should process sendEmail task successfully", async () => {
			const contactId = `contact-${Date.now()}`;
			const task = {
				type: "sendEmail",
				payload: {
					project: projectId,
					contact: contactId,
					action: "action-123",
				},
			};

			const event = createSQSEvent(task);
			const context = createContext();

			const result = await handler(event, context);

			expect(sendEmail).toHaveBeenCalledWith(task, event.Records[0].messageId);
			expect(result.batchItemFailures).toEqual([]);
		});

		test("should process sendEmail task with campaign", async () => {
			const contactId = `contact-${Date.now()}`;
			const task = {
				type: "sendEmail",
				payload: {
					project: projectId,
					contact: contactId,
					campaign: "campaign-123",
				},
			};

			const event = createSQSEvent(task);
			const context = createContext();

			const result = await handler(event, context);

			expect(sendEmail).toHaveBeenCalledWith(task, event.Records[0].messageId);
			expect(result.batchItemFailures).toEqual([]);
		});
	});

	describe("BatchDeleteRelated Task", () => {
		test("should process batchDeleteRelated task for project", async () => {
			const task = {
				type: "batchDeleteRelated",
				payload: {
					type: "PROJECT",
					id: projectId,
				},
			};

			const event = createSQSEvent(task);
			const context = createContext();

			const result = await handler(event, context);

			expect(handleDelete).toHaveBeenCalledWith(task, event.Records[0].messageId);
			expect(result.batchItemFailures).toEqual([]);
		});

		test("should process batchDeleteRelated task for user", async () => {
			const userId = `user-${Date.now()}`;
			const task = {
				type: "batchDeleteRelated",
				payload: {
					type: "USER",
					id: userId,
				},
			};

			const event = createSQSEvent(task);
			const context = createContext();

			const result = await handler(event, context);

			expect(handleDelete).toHaveBeenCalledWith(task, event.Records[0].messageId);
			expect(result.batchItemFailures).toEqual([]);
		});
	});

	describe("Error Handling", () => {
		test("should handle task processing errors and return batch failures", async () => {
			vi.mocked(sendEmail).mockRejectedValueOnce(new Error("Processing failed"));

			const task = {
				type: "sendEmail",
				payload: {
					project: projectId,
					contact: "contact-123",
				},
			};

			const messageId = "failing-message-id";
			const event = createSQSEvent(task, messageId);
			const context = createContext();

			const result = await handler(event, context);

			expect(result.batchItemFailures).toEqual([
				{
					itemIdentifier: messageId,
				},
			]);
		});

		test("should handle invalid JSON in message body", async () => {
			const event: SQSEvent = {
				Records: [
					{
						messageId: "invalid-msg",
						receiptHandle: "test-receipt-handle",
						body: "invalid json",
						attributes: {
							ApproximateReceiveCount: "1",
							SentTimestamp: Date.now().toString(),
							SenderId: "test-sender",
							ApproximateFirstReceiveTimestamp: Date.now().toString(),
						},
						messageAttributes: {},
						md5OfBody: "test-md5",
						eventSource: "aws:sqs",
						eventSourceARN: "arn:aws:sqs:us-east-1:123456789:test-queue",
						awsRegion: "us-east-1",
					},
				],
			};

			const context = createContext();
			const result = await handler(event, context);

			// Should return batch failure for invalid message
			expect(result.batchItemFailures).toEqual([
				{
					itemIdentifier: "invalid-msg",
				},
			]);
		});

		test("should handle multiple records with mixed success and failure", async () => {
			// First task succeeds, second fails
			vi.mocked(sendEmail).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Second task failed"));

			const event: SQSEvent = {
				Records: [
					{
						messageId: "success-msg",
						receiptHandle: "receipt-1",
						body: JSON.stringify({
							type: "sendEmail",
							payload: { project: projectId, contact: "contact-1" },
						}),
						attributes: {
							ApproximateReceiveCount: "1",
							SentTimestamp: Date.now().toString(),
							SenderId: "test-sender",
							ApproximateFirstReceiveTimestamp: Date.now().toString(),
						},
						messageAttributes: {},
						md5OfBody: "md5-1",
						eventSource: "aws:sqs",
						eventSourceARN: "arn:aws:sqs:us-east-1:123456789:test-queue",
						awsRegion: "us-east-1",
					},
					{
						messageId: "failure-msg",
						receiptHandle: "receipt-2",
						body: JSON.stringify({
							type: "sendEmail",
							payload: { project: projectId, contact: "contact-2" },
						}),
						attributes: {
							ApproximateReceiveCount: "1",
							SentTimestamp: Date.now().toString(),
							SenderId: "test-sender",
							ApproximateFirstReceiveTimestamp: Date.now().toString(),
						},
						messageAttributes: {},
						md5OfBody: "md5-2",
						eventSource: "aws:sqs",
						eventSourceARN: "arn:aws:sqs:us-east-1:123456789:test-queue",
						awsRegion: "us-east-1",
					},
				],
			};

			const context = createContext();
			const result = await handler(event, context);

			// Only the second message should be in batch failures
			expect(result.batchItemFailures).toEqual([
				{
					itemIdentifier: "failure-msg",
				},
			]);
		});
	});

	describe("Unknown Task Types", () => {
		test("should handle unknown task type gracefully", async () => {
			const task = {
				type: "unknownTaskType",
				payload: {},
			};

			const event = createSQSEvent(task);
			const context = createContext();

			// Should fail validation since unknown task type
			const result = await handler(event, context);

			expect(sendEmail).not.toHaveBeenCalled();
			expect(handleDelete).not.toHaveBeenCalled();
			// Should return batch failure since invalid task format
			expect(result.batchItemFailures.length).toBe(1);
		});
	});
});

