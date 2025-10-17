import { vi } from "vitest";

// Mock pino to avoid Node.js version compatibility issues with diagnostics channel
vi.mock("pino", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  return {
    default: vi.fn(() => mockLogger),
  };
});

// Mock pino-pretty as well
vi.mock("pino-pretty", () => ({
  default: vi.fn(() => process.stdout),
}));

