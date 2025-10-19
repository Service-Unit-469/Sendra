import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpException extends Error {
  public constructor(
    public readonly code: ContentfulStatusCode,
    message: string,
    public readonly addl?: Record<string, any>,
  ) {
    super(message);
  }
}

export class BadRequest extends HttpException {
  public constructor(message: string) {
    super(400, message);
  }
}

export class NotFound extends HttpException {
  /**
   * Construct a new NotFound exception
   * @param resource The type of resource that was not found
   */
  public constructor(resource: string) {
    super(404, `That ${resource.toLowerCase()} was not found`);
  }
}

export class NotAllowed extends HttpException {
  /**
   * Construct a new NotAllowed exception
   * @param msg
   */
  public constructor(msg = "You are not allowed to perform this action") {
    super(403, msg);
  }
}

export class Conflict extends HttpException {
  public constructor(msg = "A conflict occurred") {
    super(409, msg);
  }
}

export class NotAuthenticated extends HttpException {
  public constructor() {
    super(401, "You need to be authenticated to do this");
  }
}
