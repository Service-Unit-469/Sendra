#!/usr/bin/env node

const DEFAULT_TIMEOUT_SECONDS = 900;
const DEFAULT_INTERVAL_SECONDS = 10;
const DEFAULT_PATHS = ["/api/v1/health", "/dashboard"];

function parseArgs(argv) {
  const options = {
    baseUrl: process.env.APP_URL,
    timeoutSeconds: DEFAULT_TIMEOUT_SECONDS,
    intervalSeconds: DEFAULT_INTERVAL_SECONDS,
    paths: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--base-url") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--base-url expects a value");
      }
      options.baseUrl = value;
      i += 1;
      continue;
    }

    if (arg === "--path") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--path expects a value");
      }
      options.paths.push(value);
      i += 1;
      continue;
    }

    if (arg === "--timeout-seconds") {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--timeout-seconds expects a positive integer");
      }
      options.timeoutSeconds = value;
      i += 1;
      continue;
    }

    if (arg === "--interval-seconds") {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--interval-seconds expects a positive integer");
      }
      options.intervalSeconds = value;
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`Wait for deployment endpoints to respond successfully.

Usage:
  node scripts/wait-for-deployment-readiness.mjs [--base-url URL] [--path PATH] [--timeout-seconds N] [--interval-seconds N]

Defaults:
  --base-url          Reads APP_URL env var
  --path              /api/v1/health and /dashboard
  --timeout-seconds   900
  --interval-seconds  10
`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function normalizePaths(paths) {
  const normalized = paths.length > 0 ? paths : DEFAULT_PATHS;

  return normalized.map((path) => (path.startsWith("/") ? path : `/${path}`));
}

function getTargetUrls(baseUrl, paths) {
  let parsedBase;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid base URL: ${baseUrl}`);
  }

  return paths.map((path) => new URL(path, parsedBase).toString());
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function checkUrl(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  return response.ok;
}

async function waitForReadiness({ targetUrls, timeoutSeconds, intervalSeconds }) {
  const startedAt = Date.now();

  while (true) {
    const results = await Promise.all(
      targetUrls.map(async (url) => {
        try {
          const isReady = await checkUrl(url);
          return { url, isReady };
        } catch {
          return { url, isReady: false };
        }
      }),
    );

    if (results.every((result) => result.isReady)) {
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    if (elapsedSeconds >= timeoutSeconds) {
      const failedUrls = results.filter((result) => !result.isReady).map((result) => result.url);
      throw new Error(
        `Timed out after ${timeoutSeconds}s waiting for deployment readiness. Failed URLs: ${failedUrls.join(", ")}`,
      );
    }

    const failedUrls = results.filter((result) => !result.isReady).map((result) => result.url);
    console.log(
      `Deployment not ready after ${elapsedSeconds}s. Retrying in ${intervalSeconds}s. Pending: ${failedUrls.join(", ")}`,
    );
    await sleep(intervalSeconds * 1000);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.baseUrl) {
    throw new Error("Missing base URL. Pass --base-url or set APP_URL.");
  }

  const targetUrls = getTargetUrls(options.baseUrl, normalizePaths(options.paths));

  console.log(`Waiting for deployment readiness at ${options.baseUrl}`);
  console.log(`Checking endpoints: ${targetUrls.join(", ")}`);
  await waitForReadiness({
    targetUrls,
    timeoutSeconds: options.timeoutSeconds,
    intervalSeconds: options.intervalSeconds,
  });

  console.log("Deployment is ready.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
