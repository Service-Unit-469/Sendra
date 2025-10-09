import { dynamo } from "./dynamo";
import { delayedTaskStateMachine, taskQueue } from "./task-queue";

export const api = new sst.aws.Function("Api", {
  url: {
    cors: false,
  },
  handler: "packages/api/src/app.handler",
  link: [dynamo, taskQueue, delayedTaskStateMachine],
  logging: {
    retention: "1 week",
  },
  environment: {
    JWT_SECRET: "test",
    LOG_LEVEL: "debug",
    LOG_PRETTY: "true",
    DEFAULT_EMAIL: "no-reply@email.com", // TODO: replace this with your own default email
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
      ],
      resources: ["*"],
    },
  ],
});
