import { dataTable } from "./data";
import { passEnvironmentVariables } from "./env";
import { router } from "./router";
import { z } from "zod";

type QueueBatchWindow = `${number} ${"second" | "seconds" | "minute" | "minutes"}`;

const isPreviewStage = $app.stage.startsWith("PR-");
const taskQueueEnv = z
  .object({
    ENABLE_SQS_POLLER: z.enum(["true", "false"]).optional(),
    SQS_BATCH_WINDOW: z
      .string()
      .regex(/^\d+ (second|seconds|minute|minutes)$/)
      .default("2 minutes")
      .transform((value) => value as QueueBatchWindow),
    SQS_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2).catch(2),
  })
  .parse(process.env);
const isSqsPollerEnabled = taskQueueEnv.ENABLE_SQS_POLLER === "true" || !isPreviewStage;
const sqsBatchWindow = taskQueueEnv.SQS_BATCH_WINDOW;
const sqsMaximumConcurrency = taskQueueEnv.SQS_MAX_CONCURRENCY;

const deadLetterQueue = new sst.aws.Queue("TaskDeadLetterQueue");

export const taskQueue = new sst.aws.Queue("TaskQueue", {
  dlq: deadLetterQueue.arn,
  visibilityTimeout: "15 minutes",
  transform: {
    queue: {
      receiveWaitTimeSeconds: 20,
    },
  },
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

if (isSqsPollerEnabled) {
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
        size: 10,
        window: sqsBatchWindow,
        partialResponses: true,
      },
      transform: {
        eventSourceMapping: {
          scalingConfig: {
            maximumConcurrency: sqsMaximumConcurrency,
          },
        },
      },
    }
  );
}
