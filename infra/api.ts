import { dynamo } from "./dynamo";
import { getEnvironment } from "./env";
import { delayedTaskStateMachine, taskQueue } from "./task-queue";
import { jwtSecret } from "./secrets";

export const api = new sst.aws.Function("Api", {
  url: {
    cors: false,
  },
  handler: "packages/api/src/app.handler",
  link: [dynamo, taskQueue, delayedTaskStateMachine, jwtSecret],
  logging: {
    retention: "1 week",
  },
  environment: getEnvironment("Api"),
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
