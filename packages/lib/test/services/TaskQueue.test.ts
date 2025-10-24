import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@sendra/shared";

// Mock AWS SDK clients
vi.mock("@aws-sdk/client-sqs", () => {
	const mockSend = vi.fn();
	return {
		SQSClient: vi.fn(function() {
			return {
				send: mockSend,
			};
		}),
		SendMessageCommand: vi.fn(function(params) { return params; }),
		GetQueueAttributesCommand: vi.fn(function(params) { return params; }),
		__mockSend: mockSend,
	};
});

vi.mock("@aws-sdk/client-sfn", () => {
	const mockSfnSend = vi.fn();
	return {
		SFNClient: vi.fn(function() {
			return {
				send: mockSfnSend,
			};
		}),
		StartExecutionCommand: vi.fn(function(params) { return params; }),
		__mockSfnSend: mockSfnSend,
	};
});

// Mock SST Resource
vi.mock("sst", () => ({
	Resource: {
		TaskQueue: {
			url: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
		},
		DelayedTaskStateMachine: {
			stateMachineArn: "arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine",
		},
	},
}));

import { TaskQueue } from "../../src/services/TaskQueue";

// Get mock functions after import
// @ts-expect-error mocking
const mockSend = vi.mocked((await import("@aws-sdk/client-sqs")).__mockSend as any);
// @ts-expect-error mocking
const mockSfnSend = vi.mocked((await import("@aws-sdk/client-sfn")).__mockSfnSend as any);

describe("TaskQueue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("addTask", () => {
		it("should add task to SQS queue when delay is less than 900 seconds", async () => {
			const task: Task = {
				type: "sendEmail",
				delaySeconds: 300,
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSend.mockResolvedValue({ MessageId: "message-id-123" });

			const result = await TaskQueue.addTask(task);

			expect(mockSend).toHaveBeenCalledWith({
				QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
				MessageBody: JSON.stringify(task),
			});
			expect(result).toBe("message-id-123");
			expect(mockSfnSend).not.toHaveBeenCalled();
		});

		it("should add task to SQS queue when delay is exactly 900 seconds", async () => {
			const task: Task = {
				type: "sendEmail",
				delaySeconds: 900,
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSend.mockResolvedValue({ MessageId: "message-id-123" });

			const result = await TaskQueue.addTask(task);

			expect(mockSend).toHaveBeenCalled();
			expect(result).toBe("message-id-123");
			expect(mockSfnSend).not.toHaveBeenCalled();
		});

		it("should add task to Step Functions when delay is greater than 900 seconds", async () => {
			const task: Task = {
				type: "sendEmail",
				delaySeconds: 1800, // 30 minutes
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSfnSend.mockResolvedValue({ executionArn: "execution-arn-123" });

			const result = await TaskQueue.addTask(task);

			expect(mockSfnSend).toHaveBeenCalled();
			const callArgs = mockSfnSend.mock.calls[0][0];
			expect(callArgs.stateMachineArn).toBe("arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine");
			expect(JSON.parse(callArgs.input)).toEqual({
				delaySeconds: 1800,
				task: JSON.stringify(task),
			});
			expect(callArgs.name).toMatch(/^delayed-task-sendEmail-/);
			expect(result).toBe("execution-arn-123");
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("should add task to SQS queue when no delay is specified", async () => {
			const task: Task = {
				type: "sendEmail",
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSend.mockResolvedValue({ MessageId: "message-id-123" });

			const result = await TaskQueue.addTask(task);

			expect(mockSend).toHaveBeenCalledWith({
				QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
				MessageBody: JSON.stringify(task),
			});
			expect(result).toBe("message-id-123");
			expect(mockSfnSend).not.toHaveBeenCalled();
		});

		it("should add task to SQS queue when delay is 0", async () => {
			const task: Task = {
				type: "sendEmail",
				delaySeconds: 0,
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSend.mockResolvedValue({ MessageId: "message-id-123" });

			const result = await TaskQueue.addTask(task);

			expect(mockSend).toHaveBeenCalled();
			expect(result).toBe("message-id-123");
			expect(mockSfnSend).not.toHaveBeenCalled();
		});

		it("should handle different task types", async () => {
			const task: Task = {
				type: "deleteContact" as any,
				delaySeconds: 60,
				payload: {
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSend.mockResolvedValue({ MessageId: "message-id-123" });

			const result = await TaskQueue.addTask(task);

			expect(mockSend).toHaveBeenCalledWith({
				QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
				MessageBody: JSON.stringify(task),
			});
			expect(result).toBe("message-id-123");
		});

		it("should serialize task payload correctly", async () => {
			const task: Task = {
				type: "sendEmail",
				delaySeconds: 100,
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			mockSend.mockResolvedValue({ MessageId: "message-id-123" });

			await TaskQueue.addTask(task);

			const callArgs = mockSend.mock.calls[0][0];
			const parsedBody = JSON.parse(callArgs.MessageBody);
			expect(parsedBody).toEqual(task);
		});

		it("should handle long delays with unique execution names", async () => {
			const task1: Task = {
				type: "sendEmail",
				delaySeconds: 2000,
				payload: {
					action: "action-123",
					contact: "contact-123",
					project: "project-123",
				},
			};

			const task2: Task = {
				type: "sendEmail",
				delaySeconds: 2000,
				payload: {
					action: "action-456",
					contact: "contact-456",
					project: "project-456",
				},
			};

			mockSfnSend.mockResolvedValue({ executionArn: "execution-arn-123" });

			await TaskQueue.addTask(task1);
			await TaskQueue.addTask(task2);

			const callArgs1 = mockSfnSend.mock.calls[0][0];
			const callArgs2 = mockSfnSend.mock.calls[1][0];

			// Execution names should be different
			expect(callArgs1.name).not.toBe(callArgs2.name);
			// Both should start with the expected prefix
			expect(callArgs1.name).toMatch(/^delayed-task-sendEmail-/);
			expect(callArgs2.name).toMatch(/^delayed-task-sendEmail-/);
		});
	});

	describe("getQueueStatus", () => {
		it("should return queue status with all attributes", async () => {
			mockSend.mockResolvedValue({
				Attributes: {
					ApproximateNumberOfMessages: "42",
					ApproximateNumberOfMessagesDelayed: "10",
					ApproximateNumberOfMessagesNotVisible: "5",
				},
			});

			const result = await TaskQueue.getQueueStatus();

			expect(mockSend).toHaveBeenCalledWith({
				QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
				AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesDelayed", "ApproximateNumberOfMessagesNotVisible"],
			});

			expect(result).toEqual({
				tasks: "42",
				delayedTasks: "10",
				notVisibleTasks: "5",
			});
		});

		it("should handle missing attributes", async () => {
			mockSend.mockResolvedValue({
				Attributes: {},
			});

			const result = await TaskQueue.getQueueStatus();

			expect(result).toEqual({
				tasks: undefined,
				delayedTasks: undefined,
				notVisibleTasks: undefined,
			});
		});

		it("should handle zero messages", async () => {
			mockSend.mockResolvedValue({
				Attributes: {
					ApproximateNumberOfMessages: "0",
					ApproximateNumberOfMessagesDelayed: "0",
					ApproximateNumberOfMessagesNotVisible: "0",
				},
			});

			const result = await TaskQueue.getQueueStatus();

			expect(result).toEqual({
				tasks: "0",
				delayedTasks: "0",
				notVisibleTasks: "0",
			});
		});

		it("should handle undefined Attributes", async () => {
			mockSend.mockResolvedValue({});

			const result = await TaskQueue.getQueueStatus();

			expect(result).toEqual({
				tasks: undefined,
				delayedTasks: undefined,
				notVisibleTasks: undefined,
			});
		});
	});
});

