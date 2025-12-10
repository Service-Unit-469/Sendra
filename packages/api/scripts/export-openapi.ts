import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

async function exportOpenAPI() {
  // Set required environment variables for OpenAPI generation
  // These are only needed to initialize the app, not for the actual spec generation
  process.env.ASSETS_BUCKET_NAME = "mock-bucket-for-openapi-generation";
  process.env.ASSETS_URL = "https://mock-url.example.com";
  process.env.AUTH_ISSUER = "mock-issuer";
  process.env.APP_URL = "https://mock-url.example.com";
  process.env.DEFAULT_EMAIL = "mock@example.com";
  process.env.EMAIL_CONFIGURATION_SET_NAME = "mock-config-set";
  process.env.PERSISTENCE_PROVIDER = "local";
  process.env.TABLE_NAME = "mock-table";
  process.env.AWS_ACCESS_KEY_ID = "mock-key";
  process.env.AWS_SECRET_ACCESS_KEY = "mock-secret";

  // Mock SST Resource module before any imports that use it
  const Module = require("module");
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function (id: string) {
    if (id === "sst") {
      return {
        Resource: {
          JwtSecret: {
            value: "mock-jwt-secret-for-openapi-generation-only",
          },
          SendraDatabase: {
            name: "mock-database",
          },
          TaskQueue: {
            url: "https://mock-queue.example.com",
          },
          DelayedTaskStateMachine: {
            stateMachineArn:
              "arn:aws:states:us-east-1:123456789012:stateMachine:mock",
          },
        },
      };
    }
    return originalRequire.apply(this, arguments);
  };

  // Now import the app - the mocks will be in place
  const { app } = await import("../src/app");

  // Restore original require
  Module.prototype.require = originalRequire;

  // Get the OpenAPI document from the app
  const openApiDoc = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "Sendra API",
    },
    servers: [
      {
        url: "https://{hostname}",
        variables: {
          hostname: {
            default: "someid.cloudfront.net",
            description: "Hostname of the API",
          },
        },
      }
    ]
  });

  // Write to JSON file in the package root
  const outputPath = join(__dirname, "../../..", "docs", "openapi.json");

  const securitySchemes = {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  } as const;
  openApiDoc.components = {
    securitySchemes,
  };

  // clean up any parameters with empty enums
  Object.values(openApiDoc.paths).forEach((path) => {
    path.get?.parameters
      ?.filter((p) => "name" in p && ["embed", "filter"].includes(p.name))
      ?.forEach((p) => {
        if ("name" in p) {
          let hasBadEnums = false;
          if ("anyOf" in (p.schema as any)) {
            hasBadEnums = (p.schema as any).anyOf?.some(
              (e: any) => "enum" in e && e.enum.length === 0
            );
          } else if (
            "enum" in (p.schema as any) &&
            (p.schema as any).enum.length === 0
          ) {
            hasBadEnums = true;
          }
          if (hasBadEnums) {
            path.get?.parameters?.splice(
              path.get?.parameters?.indexOf(p) ?? 0,
              1
            );
          }
        }
      });
  });
  writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2), "utf-8");

  console.log(`OpenAPI spec exported to ${outputPath}`);
}

exportOpenAPI().catch((error) => {
  console.error("Failed to export OpenAPI spec:", error);
  process.exit(1);
});
