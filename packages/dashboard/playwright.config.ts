import { defineConfig, devices } from "@playwright/test";
import { config } from 'dotenv';
import { getConfig } from "./e2e/util/config";

config({
  quiet: true,
});
const {domainName} = getConfig();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.BASE_URL || `https://${domainName}/dashboard`,
    trace: { mode: "retain-on-failure", snapshots: true, screenshots: true, sources: true },
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "create e2e user",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["create e2e user"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      dependencies: ["create e2e user"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["create e2e user"],
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
      dependencies: ["create e2e user"],
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
      dependencies: ["create e2e user"],
    }
  ],
});
