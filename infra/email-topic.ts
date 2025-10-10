/// <reference path="../.sst/platform/config.d.ts" />

import { dynamo } from "./dynamo";

export const emailTopic = new sst.aws.SnsTopic("EmailTopic");

emailTopic.subscribe("EmailTopicSubscriber", {
  handler: "packages/subscribers/src/EmailTopicSubscriber.handler",
  timeout: "15 minutes",
  link: [dynamo],
  logging: {
    retention: "1 week",
  },
});

export const configurationSet: aws.ses.ConfigurationSet =
  new aws.ses.ConfigurationSet("SendraConfigurationSet", {
    name: `SendraConfigurationSet-${$app.stage}`,
  });

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
