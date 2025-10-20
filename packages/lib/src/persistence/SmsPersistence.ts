import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { Sms } from "@sendra/shared";
import { SmsSchema } from "@sendra/shared";
import { rootLogger } from "../logging";
import { getPersistenceConfig } from "../services/AppConfig";
import { GLOBAL_INDEXES, type IndexInfo, LOCAL_INDEXES, UnembeddingBasePersistence } from "./BasePersistence";
import { HttpException } from "./utils/HttpException";

const logger = rootLogger.child({
  module: "SmsPersistence",
});

export class SmsPersistence extends UnembeddingBasePersistence<Sms> {
  static async getByMessageId(messageId: string): Promise<Sms | undefined> {
    const config = getPersistenceConfig();
    const docClient = DynamoDBDocumentClient.from(config.client);
    const command = new QueryCommand({
      ExpressionAttributeNames: { "#messageId": "messageId", "#type": "type" },
      ExpressionAttributeValues: {
        ":messageId": { S: messageId },
        ":typePrefix": { S: "SMS#" },
      },
      IndexName: GLOBAL_INDEXES.BY_MESSAGE_ID.indexName,
      KeyConditionExpression: "#messageId = :messageId AND begins_with(#type, :typePrefix)",
      Limit: 1,
      TableName: config.tableName,
    });

    logger.debug(command, "Executing query");
    const result = await docClient.send(command);

    return result.Items?.[0] ? SmsSchema.parse(unmarshall(result.Items[0])) : undefined;
  }

  constructor(projectId: string) {
    super(`SMS#${projectId}`, SmsSchema);
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "source") {
      return LOCAL_INDEXES.ATTR_1;
    }
    if (key === "contact") {
      return LOCAL_INDEXES.ATTR_2;
    }
    if (key === "messageId") {
      return LOCAL_INDEXES.ATTR_3;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  projectItem(item: Sms): Sms & { i_attr1?: string; i_attr2?: string; i_attr3?: string } {
    return {
      ...item,
      i_attr1: item.source,
      i_attr2: item.contact,
      i_attr3: item.messageId,
    };
  }
}
