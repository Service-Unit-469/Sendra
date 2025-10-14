import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { Action, Email, Template, Event } from "@sendra/shared";
import { Resource } from "sst";
import { uuidv7 } from "uuidv7";
import type { ZodType } from "zod";
import { logMethodReturningPromise, rootLogger } from "../logging";
import { HttpException } from "./utils/HttpException";

export const TABLE_NAME = Resource.SendraDatabase.name;

// Initialize DynamoDB client
const client = new DynamoDBClient();

export const docClient = DynamoDBDocumentClient.from(client);

export const GLOBAL_INDEXES = {
  BY_EMAIL: {
    type: "global",
    indexName: "BY_EMAIL",
    hashKey: "email",
    rangeKey: "type",
  } as IndexInfo,
} as const;

export const LOCAL_INDEXES = {
  ATTR_1: {
    type: "local",
    indexName: "ATTR_1",
    rangeKey: "i_attr1",
  } as IndexInfo,
  ATTR_2: {
    type: "local",
    indexName: "ATTR_2",
    rangeKey: "i_attr2",
  } as IndexInfo,
  ATTR_3: {
    type: "local",
    indexName: "ATTR_3",
    rangeKey: "i_attr3",
  } as IndexInfo,
  ATTR_4: {
    type: "local",
    indexName: "ATTR_4",
    rangeKey: "i_attr4",
  } as IndexInfo,
} as const;

export type IndexInfo =
  | {
      type: "local";
      indexName: string;
      rangeKey: string;
    }
  | {
      type: "global";
      indexName: string;
      hashKey: string;
      rangeKey: string;
    };

export type BaseItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Embeddable = "actions" | "emails" | "events" | "templates";

export type QueryParams = {
  key: string;
  value?: string | number;
  comparator?: "=" | "<" | ">" | "<=" | ">=" | "begins_with";
  limit?: number;
  cursor?: string;
  embed?: Embeddable[];
};

export type QueryResult<T> = {
  items: T[];
  cursor: string | undefined;
  hasMore: boolean;
  count: number;
};

export type EmbeddedObject<T> = T & {
  _embed?: {
    actions?: Action[];
    emails?: Email[];
    events?: Event[];
    templates?: Template[];
  };
};

export abstract class BasePersistence<T extends BaseItem> {
  constructor(
    private readonly type: string,
    private readonly schema: ZodType<T>
  ) {}

  abstract embed(
    items: T[],
    embed?: Embeddable[],
    limit?: number
  ): Promise<EmbeddedObject<T>[]>;

  abstract getIndexInfo(key: string): IndexInfo;

  abstract projectItem(item: T): T & {
    i_attr1?: string;
    i_attr2?: string;
    i_attr3?: string;
    i_attr4?: string;
  };

  @logMethodReturningPromise("BasePersistence")
  async batchDelete(ids: string[]): Promise<void> {
    const command = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: ids.map((id) => ({
          DeleteRequest: { Key: { id: id, type: this.type } },
        })),
      },
    });
    await docClient.send(command);
  }

  @logMethodReturningPromise("BasePersistence")
  async batchGet(ids: string[]): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }
    const command = new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: ids.map((id) => ({ id: id, type: this.type })),
        },
      },
    });
    const result = await docClient.send(command);

    const items: T[] = result.Responses?.[TABLE_NAME].filter(
      (item) => item !== undefined
    ) as T[];
    if (!items) {
      return [];
    }
    return items.map((i) => this.schema.parse(i)) ?? [];
  }

  @logMethodReturningPromise("BasePersistence")
  async create(item: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const newItem = this.projectItem({
      ...item,
      id: uuidv7(),
      type: this.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T & { type: string });
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: newItem,
    });
    await docClient.send(command);
    return this.schema.parse(newItem);
  }

  @logMethodReturningPromise("BasePersistence")
  async delete(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        id: id,
        type: this.type,
      },
    });
    await docClient.send(command);
  }

  @logMethodReturningPromise("BasePersistence")
  async findBy(params: QueryParams): Promise<QueryResult<EmbeddedObject<T>>> {
    const { key, value, comparator, limit, cursor, embed } = params;

    const indexInfo = this.getIndexInfo(key);
    const hashKey = indexInfo.type === "local" ? "type" : indexInfo.hashKey;
    const { indexName, rangeKey } = indexInfo;
    const config = {
      TableName: TABLE_NAME,
      IndexName: indexName,
      KeyConditionExpression: `#hashKey = :pk${
        rangeKey && value ? ` AND #rangeKey ${comparator ?? "="} :rk` : ""
      }`,
      ExpressionAttributeNames: (rangeKey && value
        ? {
            "#hashKey": hashKey,
            "#rangeKey": rangeKey,
          }
        : { "#hashKey": hashKey }) as Record<string, string>,
      ExpressionAttributeValues: {
        ":pk": { S: this.type },
        ...(value && {
          ":rk":
            typeof value === "string"
              ? { S: value }
              : typeof value === "number"
              ? { N: value.toString() }
              : value,
        }),
      },
      Limit: limit,
      ExclusiveStartKey: cursor
        ? JSON.parse(Buffer.from(cursor, "base64").toString("ascii"))
        : undefined,
    };
    const logger = rootLogger.child({
      method: {
        name: "findBy",
        module: "BasePersistence",
      },
    });
    logger.debug(config, "Executing query");
    const command = new QueryCommand(config);
    const result = await docClient.send(command);

    const items =
      result.Items?.map((item) => unmarshall(item) as T).map((i) =>
        this.schema.parse(i)
      ) ?? [];

    return {
      items: await this.embed(items, embed, limit),
      cursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64"
          )
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
      count: result.Count ?? 0,
    };
  }

  @logMethodReturningPromise("BasePersistence")
  async findAllBy(
    params: Omit<QueryParams, "limit" | "cursor">
  ): Promise<EmbeddedObject<T>[]> {
    const { embed } = params;
    const result = await this.findBy({
      ...params,
      limit: undefined,
      cursor: undefined,
    });
    while (result.hasMore) {
      const nextResult = await this.findBy({
        ...params,
        cursor: result.cursor,
      });
      result.items.push(...nextResult.items);
      result.cursor = nextResult.cursor;
      result.hasMore = nextResult.hasMore;
    }
    return await this.embed(result.items, embed);
  }

  @logMethodReturningPromise("BasePersistence")
  async get(
    key: string,
    options?: Pick<QueryParams, "embed">
  ): Promise<EmbeddedObject<T> | undefined> {
    const { embed } = options ?? {};
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        id: key,
        type: this.type,
      },
    });
    const result = await docClient.send(command);
    if (!result.Item) {
      return undefined;
    }
    return (await this.embed([this.schema.parse(result.Item as T)], embed))[0];
  }

  @logMethodReturningPromise("BasePersistence")
  async list(
    params?: Pick<QueryParams, "limit" | "cursor" | "embed">
  ): Promise<QueryResult<EmbeddedObject<T>>> {
    const { limit, cursor, embed } = params ?? {};

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "type",
      },
      ExpressionAttributeValues: {
        ":pk": { S: this.type },
      },
      Limit: limit,
      ExclusiveStartKey: cursor
        ? JSON.parse(Buffer.from(cursor, "base64").toString("ascii"))
        : undefined,
    });
    const result = await docClient.send(command);

    const items =
      result.Items?.map((item) => unmarshall(item) as T).map((i) =>
        this.schema.parse(i)
      ) ?? [];

    return {
      items: await this.embed(items, embed, limit),
      cursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64"
          )
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
      count: result.Count ?? 0,
    };
  }

  async listAll(
    options?: Pick<QueryParams, "embed">
  ): Promise<EmbeddedObject<T>[]> {
    const { embed } = options ?? {};
    const all: T[] = [];
    let cursor: string | undefined;
    while (true) {
      const result = await this.list({ limit: 100, cursor });
      all.push(...result.items);
      cursor = result.cursor;
      if (!result.hasMore) {
        break;
      }
    }
    return await this.embed(all, embed);
  }

  @logMethodReturningPromise("BasePersistence")
  async put(item: T): Promise<T> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: this.projectItem({
        ...item,
        type: this.type,
        updatedAt: new Date().toISOString(),
      }),
      ConditionExpression: "attribute_exists(id)",
    });
    await docClient.send(command);
    return this.schema.parse(item);
  }
}

export abstract class UnembeddingBasePersistence<
  T extends BaseItem
> extends BasePersistence<T> {
  embed(items: T[], embed?: Embeddable[]): Promise<EmbeddedObject<T>[]> {
    if (embed && embed.length > 0) {
      throw new HttpException(400, "This persistence does not support embed");
    }
    return Promise.resolve(items as EmbeddedObject<T>[]);
  }

  embedAll(items: T[], embed?: Embeddable[]): Promise<EmbeddedObject<T>[]> {
    if (embed && embed.length > 0) {
      throw new HttpException(400, "This persistence does not support embed");
    }
    return Promise.resolve(items as EmbeddedObject<T>[]);
  }
}
