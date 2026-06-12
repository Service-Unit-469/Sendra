import { Hono } from "hono";
import { describe, expect, test } from "vitest";
import { getProblemResponseSchema, sendProblem } from "../../src/exceptions/responses";

describe("sendProblem", () => {
  test("uses override code and keeps additional details", async () => {
    const app = new Hono();
    app.get("/problem", (c) => {
      const err = Object.assign(new Error("Request failed"), {
        code: 404,
        addl: { reason: "validation" },
      });
      return sendProblem(c, err, 400);
    });

    const response = await app.request("/problem");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(body).toMatchObject({
      type: "/meta/problem/400",
      title: "Bad Request",
      status: 400,
      detail: "Request failed",
      instance: "/problem",
      reason: "validation",
    });
  });

  test("falls back to status and uses unknown problem title for unmapped code", async () => {
    const app = new Hono();
    app.get("/problem", (c) => {
      const err = Object.assign(new Error("Teapot"), { status: 418 });
      return sendProblem(c, err);
    });

    const response = await app.request("/problem");
    const body = await response.json();

    expect(response.status).toBe(418);
    expect(body).toMatchObject({
      type: "/meta/problem/418",
      title: "Unknown Problem",
      status: 418,
      detail: "Teapot",
      instance: "/problem",
    });
  });
});

describe("getProblemResponseSchema", () => {
  test("returns known description for mapped status", () => {
    const schema = getProblemResponseSchema(404);
    expect(schema.description).toBe("Not Found");
    expect(schema.content["application/problem+json"].schema).toBeDefined();
  });

  test("returns fallback description for unknown status", () => {
    const schema = getProblemResponseSchema(418 as never);
    expect(schema.description).toBe("Unknown Problem");
  });
});
