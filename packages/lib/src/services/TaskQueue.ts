import { randomUUID } from "node:crypto";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { GetQueueAttributesCommand, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { Task } from "@sendra/shared";
import { rootLogger } from "../logging";
import { getTaskQueueConfig } from "./AppConfig";

const logger = rootLogger.child({
  module: "TaskQueue",
});

const sqs = new SQSClient();
const sfn = new SFNClient();

export class TaskQueue {
  public static async addTask(task: Task) {
    const { queueUrl, stateMachineArn } = getTaskQueueConfig();
    if (task.delaySeconds && task.delaySeconds > 900) {
      logger.info({ task }, "Adding delayed task");
      const command = new StartExecutionCommand({
        stateMachineArn,
        input: JSON.stringify({
          delaySeconds: task.delaySeconds,
          task: JSON.stringify(task),
        }),
        name: `delayed-task-${task.type}-${randomUUID()}`,
      });

      const result = await sfn.send(command);
      return result.executionArn;
    }
    logger.info({ task }, "Adding task to queue");
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(task),
    });
    const result = await sqs.send(command);
    return result.MessageId;
  }

  public static async getQueueStatus() {
    const { queueUrl } = getTaskQueueConfig();
    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesDelayed", "ApproximateNumberOfMessagesNotVisible"],
    });
    const result = await sqs.send(command);

    const attributes = result.Attributes;
    return {
      tasks: attributes?.ApproximateNumberOfMessages,
      delayedTasks: attributes?.ApproximateNumberOfMessagesDelayed,
      notVisibleTasks: attributes?.ApproximateNumberOfMessagesNotVisible,
    };
  }
}
