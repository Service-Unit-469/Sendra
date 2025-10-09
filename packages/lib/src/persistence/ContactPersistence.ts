import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { Contact } from "@sendra/shared";
import { ContactSchema } from "@sendra/shared";
import { Resource } from "sst";
import { rootLogger } from "../logging";
import { BasePersistence, docClient, type Embeddable, type IndexInfo, LOCAL_INDEXES } from "./BasePersistence";
import { embedHelper } from "./utils/EmbedHelper";

const logger = rootLogger.child({
  module: "ContactPersistence",
});

const TABLE_NAME = Resource.SendraDatabase.name;

export class ContactPersistence extends BasePersistence<Contact> {
  constructor(projectId: string) {
    super(`CONTACT#${projectId}`, ContactSchema);
  }

  async embed(items: Contact[], embed?: Embeddable[]) {
    return await embedHelper(items, "contact", ["emails", "triggers"], embed);
  }

  private static async getByEmailFromAllProjectsPage(email: string, cursor?: string) {
    const command = new QueryCommand({
      ExpressionAttributeNames: { "#kn0": "email", "#kn1": "type" },
      ExpressionAttributeValues: {
        ":kv0": { S: email },
        ":kv1": { S: "CONTACT#" },
      },
      IndexName: "BY_EMAIL",
      KeyConditionExpression: "#kn0 = :kv0 AND begins_with(#kn1, :kv1)",
      Limit: 50,
      ReturnConsumedCapacity: "TOTAL",
      Select: "ALL_PROJECTED_ATTRIBUTES",
      TableName: TABLE_NAME,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, "base64").toString("ascii")) : undefined,
    });

    logger.debug(command, "Executing query");
    const result = await docClient.send(command);

    return {
      items: result.Items?.map((item) => unmarshall(item) as Contact) ?? [],
      cursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64") : undefined,
      hasMore: !!result.LastEvaluatedKey,
      count: result.Count ?? 0,
    };
  }

  static async getByEmailFromAllProjects(email: string) {
    const contacts = await ContactPersistence.getByEmailFromAllProjectsPage(email);
    while (contacts.hasMore) {
      const nextContacts = await ContactPersistence.getByEmailFromAllProjectsPage(email, contacts.cursor);
      contacts.items.push(...nextContacts.items);
      contacts.cursor = nextContacts.cursor;
      contacts.hasMore = nextContacts.hasMore;
      contacts.count += nextContacts.count;
    }
    return contacts.items;
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "email") {
      return LOCAL_INDEXES.ATTR_1;
    }
    throw new Error(`No index implemented for: ${key}`);
  }

  projectItem(item: Contact): Contact & { i_attr1?: string; i_attr2?: string } {
    return {
      ...item,
      i_attr1: item.email,
    };
  }

  async getByEmail(email: string) {
    const contact = await this.findBy({
      key: "email",
      value: email,
    });
    if (contact.items.length === 0) {
      return undefined;
    }
    return contact.items[0];
  }
}
