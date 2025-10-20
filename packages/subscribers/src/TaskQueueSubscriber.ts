import { rootLogger } from "@sendra/lib";
import type {
  Context,
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSEvent
} from "aws-lambda";
import { TaskSchema } from "shared/dist/schemas/tasks";
import { handleDelete } from "./handlers/DeleteTask";
import { sendEmail } from "./handlers/SendEmailTask";

const logger = rootLogger.child({
  module: "SendEmailSubscriber",
});

export const handler = async (event: SQSEvent, _context: Context) => {
  const batchItemFailures: SQSBatchItemFailure[] = [];
  for await (const record of event.Records) {
    try {
      logger.info({ messageId: record.messageId }, "Processing email");

      const task = TaskSchema.parse(JSON.parse(record.body));
      if (task.type === "sendEmail") {
        await sendEmail(task, record.messageId);
      } else if (task.type === "batchDeleteRelated") {
        await handleDelete(task, record.messageId);
      } else if (task.type === "sendSms") {
        // do something here
      }
    } catch (err) {
      logger.error(
        { messageId: record.messageId, err },
        "Failed to handle message"
      );
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  return { batchItemFailures } as SQSBatchResponse;
};
