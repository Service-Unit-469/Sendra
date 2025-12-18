import { assetsBucket } from "./assets";
import { dynamo } from "./dynamo";
import { passEnvironmentVariables } from "./env";
import { router } from "./route";
import { jwtSecret } from "./secrets";
import { delayedTaskStateMachine, taskQueue } from "./task-queue";

export const api = new sst.aws.Function("ApiFn", {
  url: {
    router: {
      instance: router,
      path: "/api/v1",
    },
    cors: false,
  },
  handler: "packages/api/src/app.handler",
  link: [dynamo, taskQueue, delayedTaskStateMachine, jwtSecret, assetsBucket],
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
