import { describe, expect, test } from "vitest";
import {
  BadRequest,
  Conflict,
  HttpException,
  NotAllowed,
  NotAuthenticated,
  NotFound,
} from "../../src/exceptions";

describe("exception classes", () => {
  test("HttpException stores code, message and additional payload", () => {
    const error = new HttpException(422, "Invalid payload", { field: "email" });

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(422);
    expect(error.message).toBe("Invalid payload");
    expect(error.addl).toEqual({ field: "email" });
  });

  test("NotFound lowercases resource names", () => {
    const error = new NotFound("Project");
    expect(error.code).toBe(404);
    expect(error.message).toBe("That project was not found");
  });

  test("default exception messages are set correctly", () => {
    expect(new BadRequest("Bad request")).toMatchObject({ code: 400, message: "Bad request" });
    expect(new NotAllowed()).toMatchObject({ code: 403, message: "You are not allowed to perform this action" });
    expect(new Conflict()).toMatchObject({ code: 409, message: "A conflict occurred" });
    expect(new NotAuthenticated()).toMatchObject({ code: 401, message: "You need to be authenticated to do this" });
  });

  test("NotAllowed and Conflict support custom messages", () => {
    expect(new NotAllowed("Nope")).toMatchObject({ code: 403, message: "Nope" });
    expect(new Conflict("Duplicate resource")).toMatchObject({ code: 409, message: "Duplicate resource" });
  });
});
