import { Hono } from "hono";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getAppUrl } from "../../src/util/config";

describe("getAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns APP_URL when configured", async () => {
    vi.stubEnv("APP_URL", "https://configured.example.com");

    const app = new Hono();
    app.get("/url", (c) => c.text(getAppUrl(c)));

    const response = await app.request("/url");
    expect(await response.text()).toBe("https://configured.example.com");
  });

  test("returns forwarded cloudfront origin for secure forwarded requests", async () => {
    delete process.env.APP_URL;

    const app = new Hono();
    app.get("/url", (c) => c.text(getAppUrl(c)));

    const response = await app.request("/url", {
      headers: {
        "x-forwarded-host": "d111111abcdef8.cloudfront.net",
        "x-forwarded-proto": "https",
        "x-forwarded-port": "443",
      },
    });

    expect(await response.text()).toBe("https://d111111abcdef8.cloudfront.net");
  });

  test("falls back to localhost for invalid forwarded host", async () => {
    delete process.env.APP_URL;

    const app = new Hono();
    app.get("/url", (c) => c.text(getAppUrl(c)));

    const response = await app.request("/url", {
      headers: {
        "x-forwarded-host": "%",
        "x-forwarded-proto": "https",
        "x-forwarded-port": "443",
      },
    });

    expect(await response.text()).toBe("http://localhost:3000");
  });

  test("falls back to localhost for non-cloudfront forwarded host", async () => {
    delete process.env.APP_URL;

    const app = new Hono();
    app.get("/url", (c) => c.text(getAppUrl(c)));

    const response = await app.request("/url", {
      headers: {
        "x-forwarded-host": "api.example.com",
        "x-forwarded-proto": "https",
        "x-forwarded-port": "443",
      },
    });

    expect(await response.text()).toBe("http://localhost:3000");
  });

  test("falls back to localhost when forwarded protocol is not https", async () => {
    delete process.env.APP_URL;

    const app = new Hono();
    app.get("/url", (c) => c.text(getAppUrl(c)));

    const response = await app.request("/url", {
      headers: {
        "x-forwarded-host": "d111111abcdef8.cloudfront.net",
        "x-forwarded-proto": "http",
        "x-forwarded-port": "80",
      },
    });

    expect(await response.text()).toBe("http://localhost:3000");
  });
});
