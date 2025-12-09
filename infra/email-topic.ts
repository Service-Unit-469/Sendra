/// <reference path="../.sst/platform/config.d.ts" />

import { dynamo } from "./dynamo";
import { passEnvironmentVariables } from "./env";

export const emailTopic = new sst.aws.SnsTopic("EmailTopic");

emailTopic.subscribe("EmailTopicSubscriber", {
  handler: "packages/subscribers/src/EmailTopicSubscriber.handler",
  timeout: "15 minutes",
  link: [dynamo],
  logging: {
    retention: "1 week",
  },
  environment: {
    EMAIL_CONFIGURATION_SET_NAME: `SendraConfigurationSet-${$app.stage}`,
    ...passEnvironmentVariables([
      "LOG_LEVEL",
      "LOG_PRETTY",
      "DEFAULT_EMAIL",
      "APP_URL",
    ]),
  },
});

let configurationSet: aws.ses.ConfigurationSet;
try {
  configurationSet =  aws.ses.ConfigurationSet.get(`SendraConfigurationSet-${$app.stage}`, "");
} catch (error) {
  configurationSet = new aws.ses.ConfigurationSet("SendraConfigurationSet", {
    name: `SendraConfigurationSet-${$app.stage}`,
  });
}
export { configurationSet };

export const eventDestination: aws.ses.EventDestination =
  new aws.ses.EventDestination("SendraConfigurationSetDestination", {
    name: `SendraConfigurationSetDestination-${$app.stage}`,
    configurationSetName: configurationSet.name,
    enabled: true,
    matchingTypes: ["send", "bounce", "complaint", "delivery", "open", "click"],
    snsDestination: {
      topicArn: emailTopic.arn,
    },
  });
