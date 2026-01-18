/// <reference path="../.sst/platform/config.d.ts" />

import { data } from "./data";
import { passEnvironmentVariables } from "./env";
import { router } from "./route";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const emailTopic = new sst.aws.SnsTopic("EmailTopic");

emailTopic.subscribe("EmailTopicSubscriber", {
  handler: "packages/subscribers/src/EmailTopicSubscriber.handler",
  timeout: "15 minutes",
  link: [data],
  logging: {
    retention: "1 week",
  },
  environment: {
    EMAIL_CONFIGURATION_SET_NAME: `SendraConfigurationSet-${$app.stage}`,
    ...passEnvironmentVariables([
      "DEFAULT_EMAIL",
      "LOG_LEVEL",
      "LOG_PRETTY",
      "METRICS_ENABLED",
    ]),
    APP_URL: process.env.APP_URL ?? router.url,
  },
});

const configurationSetName = `SendraConfigurationSet-${$app.stage}`;

// Check if configuration set exists by wrapping getConfigurationSetOutput
// in a way that handles errors gracefully
const configSetExists = pulumi.output(
  (async () => {
    try {
      await aws.sesv2.getConfigurationSet({
        configurationSetName: configurationSetName,
      });
      return true;
    } catch {
      return false;
    }
  })(),
);

// Create or reference configuration set based on existence
export const configurationSet = configSetExists.apply((exists) => {
  if (exists) {
    // Reference existing configuration set
    return aws.sesv2.ConfigurationSet.get(
      "SendraConfigurationSet",
      configurationSetName,
    );
  } else {
    // Create new configuration set
    return new aws.sesv2.ConfigurationSet("SendraConfigurationSet", {
      configurationSetName: configurationSetName,
    });
  }
});

export const eventDestination = new aws.sesv2.ConfigurationSetEventDestination(
  "SendraConfigurationSetDestination",
  {
    configurationSetName: configurationSet.configurationSetName,
    eventDestinationName: `SendraConfigurationSetDestination-${$app.stage}`,
    eventDestination: {
      enabled: true,
      matchingEventTypes: [
        "SEND",
        "BOUNCE",
        "COMPLAINT",
        "DELIVERY",
        "OPEN",
        "CLICK",
      ],
      snsDestination: {
        topicArn: emailTopic.arn,
      },
    },
  },
);
