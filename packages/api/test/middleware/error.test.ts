import { describe, expect, test, vi } from "vitest";
import { errorWrapper } from "../../src/middleware/error";

describe("errorWrapper", () => {
  test("converts unhandled errors into problem responses", async () => {
    const c = {
      req: { path: "/boom" },
      json: vi.fn((body: unknown, status: number, headers: Record<string, string>) =>
        new Response(JSON.stringify(body), { status, headers }),
      ),
    };

    const response = await errorWrapper(c as never, async () => {
      throw new Error("Unexpected failure");
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      type: "/meta/problem/500",
      title: "Internal Server Error",
      status: 500,
      detail: "Unexpected failure",
      instance: "/boom",
    });
  });

  test("uses provided error status code", async () => {
    const c = {
      req: { path: "/forbidden" },
      json: vi.fn((body: unknown, status: number, headers: Record<string, string>) =>
        new Response(JSON.stringify(body), { status, headers }),
      ),
    };

    const response = await errorWrapper(c as never, async () => {
      const err = Object.assign(new Error("Forbidden action"), { code: 403 });
      throw err;
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.title).toBe("Not Allowed");
    expect(body.detail).toBe("Forbidden action");
  });
});
