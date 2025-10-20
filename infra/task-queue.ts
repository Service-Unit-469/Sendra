import { dynamo } from "./dynamo";
import { passEnvironmentVariables } from "./env";

const deadLetterQueue = new sst.aws.Queue("TaskDeadLetterQueue");

export const taskQueue = new sst.aws.Queue("TaskQueue", {
  dlq: deadLetterQueue.arn,
  visibilityTimeout: "15 minutes",
});

taskQueue.subscribe(
  {
    handler: "packages/subscribers/src/TaskQueueSubscriber.handler",
    timeout: "15 minutes",
    logging: {
      retention: "1 week",
    },
    link: [dynamo],
    environment: {
      EMAIL_CONFIGURATION_SET_NAME: `SendraConfigurationSet-${$app.stage}`,
      ...passEnvironmentVariables([
        "LOG_LEVEL",
        "LOG_PRETTY",
        "DEFAULT_EMAIL",
        "APP_URL",
      ]),
    },
    permissions: [
      {
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: ["*"],
      },
      {
        actions: ["sms-voice:SendTextMessage"],
        resources: ["*"],
      },
    ],
  },
  {
    batch: {
      partialResponses: true,
    },
  }
);

const wait = sst.aws.StepFunctions.wait({
  name: "Wait",
  time: "{% $states.input.delaySeconds %}",
});

const queueTask = sst.aws.StepFunctions.sqsSendMessage({
  name: "QueueTask",
  queue: taskQueue,
  messageBody: "{% $states.input.task %}",
});

export const delayedTaskStateMachine = new sst.aws.StepFunctions(
  "DelayedTaskStateMachine",
  {
    definition: wait.next(queueTask),
    logging: {
      retention: "1 week",
    },
  }
);
