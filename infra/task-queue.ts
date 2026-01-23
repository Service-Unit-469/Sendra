import { dataTable } from "./data";
import { passEnvironmentVariables } from "./env";
import { router } from "./route";

const deadLetterQueue = new sst.aws.Queue("TaskDeadLetterQueue");

export const taskQueue = new sst.aws.Queue("TaskQueue", {
  dlq: deadLetterQueue.arn,
  visibilityTimeout: "15 minutes",
});

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

taskQueue.subscribe(
  {
    handler: "packages/subscribers/src/TaskQueueSubscriber.handler",
    timeout: "15 minutes",
    logging: {
      retention: "1 week",
    },
    link: [dataTable, taskQueue, delayedTaskStateMachine],
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
    permissions: [
      {
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
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
