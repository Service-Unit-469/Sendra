import { rootLogger } from "@sendra/lib";
import { TaskSchema } from "@sendra/shared";
import type { Context, SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { handleDelete } from "./handlers/DeleteTask";
import { sendEmail } from "./handlers/SendEmailTask";

const handleRecord = async (record: SQSRecord) => {
  const logger = rootLogger.child({
    messageId: record.messageId,
    ...record.messageAttributes,
  });
  logger.info("Received task message");

  const task = TaskSchema.parse(JSON.parse(record.body));
  if (task.type === "sendEmail") {
    await sendEmail(task, record.messageId);
  } else if (task.type === "batchDeleteRelated") {
    await handleDelete(task, record.messageId);
  }
};

export const handler = async (event: SQSEvent, _context: Context) => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  for await (const record of event.Records) {
    try {
      await handleRecord(record);
    } catch (error) {
      rootLogger.error({ messageId: record.messageId, error }, "Failed to handle message");
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures } as SQSBatchResponse;
};
