import { vi } from "vitest";

vi.mock("sst", () => ({
	Resource: {
		EmailTopicArn: {
			value: "arn:aws:sns:us-east-1:123456789:test-email-topic",
		},
		TaskQueue: {
			url: "http://test-queue-url",
		},
		SendraDynamoDBTable: {
			name: "test-dynamodb-table",
		},
	},
}));

vi.stubEnv("DEFAULT_EMAIL", "test@example.com");
vi.stubEnv("EMAIL_CONFIGURATION_SET_NAME", "test");
vi.stubEnv("APP_URL", "https://test.com");

