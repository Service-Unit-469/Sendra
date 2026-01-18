import { assetsBucket } from "./assets";
import { data } from "./data";
import { passEnvironmentVariables } from "./env";
import { rateLimitTable } from "./rateLimit";
import { router } from "./route";
import { jwtSecret } from "./secrets";
import { delayedTaskStateMachine, taskQueue } from "./task-queue";

export const api = new sst.aws.ApiGatewayV2("ApiGateway", {
  accessLog: {
    retention: "1 week",
  },
  cors: {
    allowOrigins: ["http://localhost:3000", process.env.APP_URL ?? "*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-Correlation-Id",
    ],
  },
  transform: {
    stage: {
      defaultRouteSettings: {
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
      }
    }
  }
});
router.route("/api/v1", api.url);

api.route("ANY /api/v1/{proxy+}", {
  handler: "packages/api/src/app.handler",
  link: [
    assetsBucket,
    delayedTaskStateMachine,
    data,
    jwtSecret,
    rateLimitTable,
    taskQueue,
  ],
  logging: {
    retention: "1 week",
  },
  environment: {
    EMAIL_CONFIGURATION_SET_NAME: `SendraConfigurationSet-${$app.stage}`,
    ASSETS_BUCKET_NAME: assetsBucket.name,
    ...passEnvironmentVariables([
      "ALLOW_DUPLICATE_PROJECT_IDENTITIES",
      "AUTH_ISSUER",
      "AUTH_TTL_PUBLIC",
      "AUTH_TTL_SECRET",
      "AUTH_TTL_USER",
      "DEFAULT_EMAIL",
      "DISABLE_SIGNUPS",
      "LOG_LEVEL",
      "LOG_PRETTY",
      "METRICS_ENABLED",
    ]),
    APP_URL: process.env.APP_URL ?? router.url,
  },
  nodejs: {
    loader: {
      ".html": "file",
    },
  },
  permissions: [
    {
      actions: [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:VerifyDomainDkim",
        "ses:GetIdentityVerificationAttributes",
        "ses:SetIdentityMailFromDomain",
        "ses:GetIdentityDkimAttributes",
        "ses:VerifyEmailAddress",
        "ses:VerifyEmailIdentity",
      ],
      resources: ["*"],
    },
  ],
});
