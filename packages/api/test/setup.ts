import { vi } from "vitest";

vi.mock("sst", () => ({
  Resource: {
    JwtSecret: {
      value: "test-jwt-secret",
    },
    TaskQueue: {
      url: "http://test-queue-url",
    },
  },
}));

vi.mock("@sendra/lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sendra/lib")>();
  return {
    ...actual,
    TaskQueue: {
      addTask: vi.fn().mockResolvedValue("mocked-message-id"),
      getQueueStatus: vi.fn().mockResolvedValue({
        tasks: 0,
        delayedTasks: 0,
        notVisibleTasks: 0,
      }),
    },
  };
});

vi.stubEnv("DEFAULT_EMAIL", "test@example.com");
vi.stubEnv("EMAIL_CONFIGURATION_SET_NAME", "test");
vi.stubEnv("APP_URL", "https://test.com");
vi.stubEnv("ASSETS_BUCKET_NAME", "test-assets-bucket");
