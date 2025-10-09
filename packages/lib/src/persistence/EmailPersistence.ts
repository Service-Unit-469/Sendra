import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { Email } from "@sendra/shared";
import { EmailSchema } from "@sendra/shared";
import { rootLogger } from "../logging";
import { docClient, type IndexInfo, LOCAL_INDEXES, TABLE_NAME, UnembeddingBasePersistence } from "./BasePersistence";
import { HttpException } from "./utils/HttpException";

const logger = rootLogger.child({
  module: "EmailPersistence",
});

export class EmailPersistence extends UnembeddingBasePersistence<Email> {
  static async getByMessageId(messageId: string): Promise<Email | undefined> {
    const command = new QueryCommand({
      ExpressionAttributeNames: { "#kn0": "email", "#kn1": "type" },
      ExpressionAttributeValues: {
        ":kv0": { S: messageId },
        ":kv1": { S: "EMAIL#" },
      },
      IndexName: LOCAL_INDEXES.ATTR_3.indexName,
      KeyConditionExpression: "#kn0 = :kv0 AND begins_with(#kn1, :kv1)",
      Limit: 50,
      ReturnConsumedCapacity: "TOTAL",
      Select: "ALL_PROJECTED_ATTRIBUTES",
      TableName: TABLE_NAME,
    });

    logger.debug(command, "Executing query");
    const result = await docClient.send(command);

    return result.Items?.[0] ? EmailSchema.parse(unmarshall(result.Items[0])) : undefined;
  }

  constructor(private readonly projectId: string) {
    super("EMAIL", EmailSchema);
  }
  async create(item: Omit<Email, "id" | "createdAt" | "updatedAt" | "project" | "type">) {
    const newItem = this.projectItem({
      ...item,
      id: item.messageId,
      type: "EMAIL",
      project: this.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Email);
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: newItem,
    });
    await docClient.send(command);
    return EmailSchema.parse(newItem);
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

  projectItem(item: Email): Email & { i_attr1?: string; i_attr2?: string; i_attr3?: string } {
    return {
      ...item,
      i_attr1: item.source,
      i_attr2: item.contact,
      i_attr3: item.messageId,
    };
  }
}
