#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function parseArgs(argv) {
  const options = {
    apply: false,
    limit: Infinity,
    appPrefix: null,
    repository: null,
    listAppPrefixes: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--limit") {
      const value = Number(argv[i + 1]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--limit expects a positive integer");
      }
      options.limit = value;
      i += 1;
      continue;
    }

    if (arg === "--app-prefix") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--app-prefix expects a value");
      }
      options.appPrefix = value;
      i += 1;
      continue;
    }

    if (arg === "--repo") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--repo expects a value in the format owner/repo");
      }
      options.repository = value;
      i += 1;
      continue;
    }

    if (arg === "--list-app-prefixes") {
      options.listAppPrefixes = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`Cleanup stale PR SST environments.

Usage:
  node scripts/cleanup-stale-pr-envs.mjs [--apply] [--limit N] [--app-prefix VALUE] [--repo owner/repo] [--list-app-prefixes]

Options:
  --apply             Actually run 'sst remove' for stale PR stages
  --limit N           Only process the first N stale stages
  --app-prefix VALUE  Prefix used in CloudFront KV store names (default: local SST app name)
  --repo VALUE        Repository used for open PR lookup (format: owner/repo)
  --list-app-prefixes List all app prefixes discovered in CloudFront KV store names
`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function getOpenPrNumbers(repository) {
  const args = [
    "pr",
    "list",
    "--state",
    "open",
    "--limit",
    "1000",
    "--json",
    "number",
    "--jq",
    ".[].number",
  ];

  if (repository) {
    args.push("--repo", repository);
  }

  const stdout = run("gh", args);

  return new Set(
    stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => Number(line))
      .filter(Number.isInteger),
  );
}

function getKvStoreNames() {
  const stdout = run("aws", [
    "cloudfront",
    "list-key-value-stores",
    "--output",
    "json",
  ]);

  const parsed = JSON.parse(stdout);
  const items = parsed?.KeyValueStoreList?.Items ?? [];

  return items
    .map((item) => item?.Name)
    .filter((name) => typeof name === "string");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function getAppPrefixesFromKvStoreNames(kvStoreNames) {
  const matcher = /^(.+)-PR-(\d+)-/;
  const appPrefixes = new Set();

  for (const name of kvStoreNames) {
    const match = name.match(matcher);
    if (!match) {
      continue;
    }

    appPrefixes.add(match[1]);
  }

  return [...appPrefixes].sort((a, b) => a.localeCompare(b));
}

function getPrNumbersFromKvStoreNames(kvStoreNames, appPrefix) {
  const matcher = new RegExp(`^${escapeRegex(appPrefix)}-PR-(\\d+)-`);
  const prNumbers = new Set();

  for (const name of kvStoreNames) {
    const match = name.match(matcher);
    if (!match) {
      continue;
    }

    const prNumber = Number(match[1]);
    if (Number.isInteger(prNumber)) {
      prNumbers.add(prNumber);
    }
  }

  return [...prNumbers].sort((a, b) => a - b);
}

function removeStage(stage) {
  execFileSync("pnpm", ["run", "sst", "--", "remove", "--print-logs", "--stage", stage], {
    stdio: "inherit",
  });
}

function getSstConfigPath() {
  const candidates = [
    "sst.config.ts",
    "sst.config.mts",
    "sst.config.js",
    "sst.config.mjs",
    "sst.config.cjs",
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

function getLocalSstAppName() {
  const configPath = getSstConfigPath();
  if (!configPath) {
    return null;
  }

  const contents = readFileSync(configPath, "utf8");
  const match = contents.match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/);
  return match ? match[1] : null;
}

function resolveAppPrefix(options) {
  if (options.appPrefix) {
    return options.appPrefix;
  }

  const localAppName = getLocalSstAppName();
  if (localAppName) {
    return localAppName;
  }

  throw new Error(
    "Could not infer app prefix from local SST config. Pass --app-prefix VALUE explicitly.",
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const appPrefix = resolveAppPrefix(options);

  const openPrNumbers = getOpenPrNumbers(options.repository);
  const kvStoreNames = getKvStoreNames();
  const prNumbersWithKvStores = getPrNumbersFromKvStoreNames(kvStoreNames, appPrefix);
  const appPrefixes = getAppPrefixesFromKvStoreNames(kvStoreNames);

  const stalePrNumbers = prNumbersWithKvStores
    .filter((prNumber) => !openPrNumbers.has(prNumber))
    .slice(0, options.limit);

  console.log(`Open PRs: ${openPrNumbers.size}`);
  if (options.repository) {
    console.log(`Repository used for PR lookup: ${options.repository}`);
  }
  console.log(`App prefix used for KV matching: ${appPrefix}`);
  if (options.listAppPrefixes) {
    if (appPrefixes.length === 0) {
      console.log("App prefixes detected from CloudFront KV stores: none");
    } else {
      console.log(`App prefixes detected from CloudFront KV stores (${appPrefixes.length}):`);
      for (const prefix of appPrefixes) {
        console.log(`- ${prefix}`);
      }
    }
  }
  console.log(`PR stages detected from CloudFront KV stores: ${prNumbersWithKvStores.length}`);
  console.log(`Stale PR stages: ${stalePrNumbers.length}`);

  if (stalePrNumbers.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const staleStages = stalePrNumbers.map((prNumber) => `PR-${prNumber}`);

  if (!options.apply) {
    console.log("\nDry run only. Stages that would be removed:");
    for (const stage of staleStages) {
      console.log(`- ${stage}`);
    }
    console.log("\nRe-run with --apply to remove these stages.");
    return;
  }

  const failures = [];
  for (const stage of staleStages) {
    console.log(`\nRemoving ${stage}...`);
    try {
      removeStage(stage);
      console.log(`Removed ${stage}`);
    } catch (error) {
      console.error(`Failed to remove ${stage}`);
      failures.push(stage);
    }
  }

  if (failures.length > 0) {
    console.error("\nCleanup finished with failures:");
    for (const stage of failures) {
      console.error(`- ${stage}`);
    }
    process.exit(1);
  }

  console.log("\nCleanup complete.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
