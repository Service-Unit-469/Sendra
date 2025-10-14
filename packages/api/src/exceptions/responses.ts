import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const ProblemBodySchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
});

const problemTypes = {
  400: "Bad Request",
  401: "Not Authenticated",
  403: "Not Allowed",
  404: "Not Found",
  500: "Internal Server Error",
} as Record<ContentfulStatusCode, string>;

export const sendProblem = <AllowedCodes>(c: Context, httpException: Error & { code?: AllowedCodes; headers?: Record<string, string> }, overrideCode?: AllowedCodes) => {
  const code = overrideCode ?? httpException.code ?? 500;
  return c.json(
    {
      type: `/meta/problem/${code}`,
      title: problemTypes[code as ContentfulStatusCode] ?? "Unknown Problem",
      status: code as number,
      detail: httpException.message,
      instance: c.req.path,
    },
    code as ContentfulStatusCode,
    {
      ...(httpException.headers ?? {}),
      "Content-Type": "application/problem+json",
    },
  );
};

export const getProblemResponseSchema = (status: ContentfulStatusCode) => ({
  content: {
    "application/problem+json": {
      schema: ProblemBodySchema,
    },
  },
  description: problemTypes[status as ContentfulStatusCode] ?? "Unknown Problem",
});

export const RedirectResponseSchema = {
  description: "Redirect to the given location",
  headers: z.object({
    location: z.string(),
  }),
};
