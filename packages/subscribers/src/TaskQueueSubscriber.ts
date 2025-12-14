import { rootLogger, setRequestInfo, withMetrics } from "@sendra/lib";
import { TaskSchema } from "@sendra/shared";
import type { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { handleDelete } from "./handlers/DeleteTask";
import { queueCampaign } from "./handlers/QueueCampaignTask";
import { sendEmail } from "./handlers/SendEmailTask";

const handleRecord = async (record: SQSRecord) => {
  const logger = rootLogger.child({
    messageId: record.messageId,
    ...record.messageAttributes,
  });
  logger.info("Received task message");

  const task = TaskSchema.parse(JSON.parse(record.body));
  await withMetrics(
    async (metricsLogger) => {
      if (task.type === "sendEmail") {
        metricsLogger.setProperty("Email", task.payload.email);
        metricsLogger.setProperty("Project", task.payload.project);
        await sendEmail(task, record.messageId);
      } else if (task.type === "batchDeleteRelated") {
        metricsLogger.setProperty("MessageId", record.messageId);
        metricsLogger.setProperty("Project", task.payload.type);
        await handleDelete(task, record.messageId);
      } else if (task.type === "queueCampaign") {
        metricsLogger.setProperty("Campaign", task.payload.campaign);
        metricsLogger.setProperty("Project", task.payload.project);
        await queueCampaign(task, record.messageId);
      }
    },
    {
      Operation: "HandleQueueTask",
      TaskType: task.type,
    },
  );
};

export const handler = async (event: SQSEvent, _context: Context) => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  for await (const record of event.Records) {
    try {
      await new Promise((resolve, reject) =>
        setRequestInfo(
          {
            requestId: record.messageId,
            correlationId: _context.awsRequestId,
          },
          () => handleRecord(record).then(resolve).catch(reject),
        ),
      );
    } catch (err) {
      rootLogger.error({ messageId: record.messageId, err }, "Failed to handle message");
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures } as SQSBatchResponse;
};
