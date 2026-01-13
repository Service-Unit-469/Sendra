import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const ProblemBodySchema = z.looseObject({
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

export const sendProblem = <AllowedCodes>(c: Context, httpException: Error & { code?: AllowedCodes; status?: ContentfulStatusCode; addl?: Record<string, unknown> }, overrideCode?: AllowedCodes) => {
  const code = overrideCode ?? httpException.code ?? httpException.status ?? 500;
  return c.json(
    {
      type: `/meta/problem/${code}`,
      title: problemTypes[code as ContentfulStatusCode] ?? "Unknown Problem",
      status: code as number,
      detail: httpException.message,
      instance: c.req.path,
      ...(httpException.addl ?? {}),
    },
    code as ContentfulStatusCode,
    {
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
