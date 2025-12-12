import { QueryCommand } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchWriteCommand, DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { Action, Email, Event, Template } from "@sendra/shared";
import { type MetricsLogger, Unit } from "aws-embedded-metrics";
import { uuidv7 } from "uuidv7";
import type { ZodType } from "zod";
import { logMethodReturningPromise, rootLogger } from "../logging";
import { withMetrics } from "../metrics";
import { getPersistenceConfig } from "../services/AppConfig";
import { HttpException } from "./utils/HttpException";

export const GLOBAL_INDEXES = {
  BY_EMAIL: {
    type: "global",
    indexName: "BY_EMAIL",
    hashKey: "email",
    rangeKey: "type",
  } as IndexInfo,
  BY_MESSAGE_ID: {
    type: "global",
    indexName: "BY_MESSAGE_ID",
    hashKey: "messageId",
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

export type Embeddable = "actions" | "emails" | "events";

export type StopFn<T> = (item: T) => boolean;

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
  private readonly logger = rootLogger.child({
    module: "BasePersistence",
    type: this.type,
  });
  public readonly docClient: DynamoDBDocumentClient;
  public readonly tableName: string;

  constructor(
    private readonly type: string,
    private readonly schema: ZodType<T>,
  ) {
    const config = getPersistenceConfig();
    this.docClient = DynamoDBDocumentClient.from(config.client);
    this.tableName = config.tableName;
  }

  abstract embed(items: T[], embed?: Embeddable[], limit?: number): Promise<EmbeddedObject<T>[]>;

  abstract getIndexInfo(key: string): IndexInfo;

  abstract projectItem(item: T): T & {
    i_attr1?: string;
    i_attr2?: string;
    i_attr3?: string;
    i_attr4?: string;
  };

  @logMethodReturningPromise("BasePersistence")
  async batchDelete(ids: string[]): Promise<void> {
    await withMetrics(
      async (metricsLogger: MetricsLogger) => {
        metricsLogger.putMetric("BatchDeleteCount", ids.length, Unit.Count);
        return this.docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [this.tableName]: ids.map((id) => ({
                DeleteRequest: { Key: { id: id, type: this.type } },
              })),
            },
          }),
        );
      },
      "Persistence/BatchDelete",
      {
        ObjectType: this.type,
      },
    );
  }

  @logMethodReturningPromise("BasePersistence")
  async batchGet(ids: readonly string[]): Promise<T[]> {
    return withMetrics(
      async (metricsLogger: MetricsLogger) => {
        metricsLogger.putMetric("BatchGetCount", ids.length, Unit.Count);
        if (ids.length === 0) {
          return [];
        }
        const idsCopy = [...ids];
        this.logger.debug({ ids: ids.length, type: this.type }, "Performing batch get");

        const allItems: T[] = [];
        while (idsCopy.length > 0) {
          const batchIds = [];
          while (idsCopy.length > 0 && batchIds.length < 100) {
            batchIds.push(idsCopy.pop());
          }
          this.logger.debug({ batchIds, type: this.type }, "Getting batch of items");
          const command = new BatchGetCommand({
            RequestItems: {
              [this.tableName]: {
                Keys: batchIds.map((id) => ({ id: id, type: this.type })),
              },
            },
          });
          const result = await this.docClient.send(command);

          const items = result.Responses?.[this.tableName].filter((item) => item !== undefined) as T[];

          const unprocessedKeys = result.UnprocessedKeys?.[this.tableName]?.Keys?.map((key) => key.id) ?? [];
          this.logger.debug(
            {
              unprocessedKeys: unprocessedKeys.length,
              items: items.length,
              type: this.type,
            },
            "Batch result",
          );

          allItems.push(...items);
          idsCopy.push(...unprocessedKeys);
        }

        return allItems.map((i) => this.schema.parse(i));
      },
      "Persistence/BatchGet",
      {
        ObjectType: this.type,
      },
    );
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
    this.logger.debug({ newItem }, "Creating item");

    await withMetrics(
      async () =>
        this.docClient.send(
          new PutCommand({
            TableName: this.tableName,
            Item: newItem,
          }),
        ),
      "Persistence/Create",
      {
        ObjectType: this.type,
      },
    );
    return this.schema.parse(newItem);
  }

  @logMethodReturningPromise("BasePersistence")
  async delete(id: string): Promise<void> {
    this.logger.debug({ id }, "Deleting item");

    await withMetrics(
      async () =>
        this.docClient.send(
          new DeleteCommand({
            TableName: this.tableName,
            Key: {
              id: id,
              type: this.type,
            },
          }),
        ),
      "Persistence/Delete",
      {
        ObjectType: this.type,
      },
    );
  }

  @logMethodReturningPromise("BasePersistence")
  async findBy(params: QueryParams): Promise<QueryResult<EmbeddedObject<T>>> {
    const { key, value, comparator, limit, cursor, embed } = params;

    const indexInfo = this.getIndexInfo(key);
    const hashKey = indexInfo.type === "local" ? "type" : indexInfo.hashKey;
    const { indexName, rangeKey } = indexInfo;
    const rangeCondition = rangeKey && value ? (comparator === "begins_with" ? ` AND begins_with(#rangeKey, :rk)` : ` AND #rangeKey ${comparator ?? "="} :rk`) : "";

    const config = {
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: `#hashKey = :pk${rangeCondition}`,
      ExpressionAttributeNames: (rangeKey && value
        ? {
            "#hashKey": hashKey,
            "#rangeKey": rangeKey,
          }
        : { "#hashKey": hashKey }) as Record<string, string>,
      ExpressionAttributeValues: {
        ":pk": { S: this.type },
        ...(value && {
          ":rk": typeof value === "string" ? { S: value } : typeof value === "number" ? { N: value.toString() } : value,
        }),
      },

      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, "base64").toString("ascii")) : undefined,
    } as QueryCommandInput;
    this.logger.debug(config, "Executing query");
    const result = await withMetrics(async () => this.docClient.send(new QueryCommand(config)), "Persistence/FindBy", {
      ObjectType: this.type,
      IndexName: indexName,
    });

    const items =
      result.Items?.map((item) => unmarshall(item) as T)
        .map((i) => this.schema.safeParse(i))
        .map((i) => {
          if (!i.success) {
            this.logger.warn({ err: i.error }, "Invalid item retrieved");
          }
          return i;
        })
        .filter((i) => i.success)
        .map((i) => i.data) ?? [];

    this.logger.debug({ items: items.length, hasMore: !!result.LastEvaluatedKey }, "Found items");
    return {
      items: await this.embed(items, embed, limit),
      cursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64") : undefined,
      hasMore: !!result.LastEvaluatedKey,
      count: result.Count ?? 0,
    };
  }

  @logMethodReturningPromise("BasePersistence")
  async findAllBy(params: Omit<QueryParams, "limit" | "cursor"> & { stop?: StopFn<T> }): Promise<EmbeddedObject<T>[]> {
    const { embed } = params;
    let stopped = false;
    const items: EmbeddedObject<T>[] = [];
    const result = await this.findBy({
      ...params,
      limit: undefined,
      cursor: undefined,
    });

    for (const item of result.items) {
      if (params.stop?.(item)) {
        stopped = true;
        break;
      }
      items.push(item);
    }

    while (result.hasMore && !stopped) {
      const nextResult = await this.findBy({
        ...params,
        cursor: result.cursor,
      });
      for (const item of result.items) {
        if (params.stop?.(item)) {
          stopped = true;
          break;
        }
        items.push(item);
      }
      result.cursor = nextResult.cursor;
      result.hasMore = nextResult.hasMore;
    }
    return await this.embed(items, embed);
  }

  @logMethodReturningPromise("BasePersistence")
  async get(key: string, options?: Pick<QueryParams, "embed">): Promise<EmbeddedObject<T> | undefined> {
    this.logger.debug({ key, options }, "Getting item");
    const { embed } = options ?? {};

    const result = await withMetrics(
      async () =>
        this.docClient.send(
          new GetCommand({
            TableName: this.tableName,
            Key: {
              id: key,
              type: this.type,
            },
          }),
        ),
      "Persistence/Get",
      {
        ObjectType: this.type,
      },
    );
    if (!result.Item) {
      return undefined;
    }

    const items = await this.embed([this.schema.parse(result.Item as T)], embed);
    if (!items || items.length === 0) {
      this.logger.debug("No item retrieved");
      return undefined;
    }
    this.logger.debug({ item: items[0] }, "Retrieved item");
    return items[0];
  }

  @logMethodReturningPromise("BasePersistence")
  async list(params?: Pick<QueryParams, "limit" | "cursor" | "embed">): Promise<QueryResult<EmbeddedObject<T>>> {
    const { limit, cursor, embed } = params ?? {};

    this.logger.debug({ limit, cursor, embed }, "Listing items");
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: {
        "#pk": "type",
      },
      ExpressionAttributeValues: {
        ":pk": { S: this.type },
      },
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, "base64").toString("ascii")) : undefined,
      ScanIndexForward: false,
    } as QueryCommandInput);

    const result = await withMetrics(async () => this.docClient.send(command), "Persistence/List", {
      ObjectType: this.type,
    });

    const items =
      result.Items?.map((item) => unmarshall(item) as T)
        .map((i) => this.schema.safeParse(i))
        .map((i) => {
          if (!i.success) {
            this.logger.warn({ err: i.error }, "Invalid item retrieved in list");
          }
          return i;
        })
        .filter((i) => i.success)
        .map((i) => i.data) ?? [];

    this.logger.debug({ count: items.length, hasMore: !!result.LastEvaluatedKey }, "Listed items");
    return {
      items: await this.embed(items, embed, limit),
      cursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64") : undefined,
      hasMore: !!result.LastEvaluatedKey,
      count: result.Count ?? 0,
    };
  }

  async listAll(options?: Pick<QueryParams, "embed"> & { stop?: StopFn<T> }): Promise<EmbeddedObject<T>[]> {
    const { embed, stop } = options ?? {};
    let stopped = false;
    const all: T[] = [];
    let cursor: string | undefined;
    while (true && !stopped) {
      const result = await this.list({ limit: 100, cursor });
      for (const item of result.items) {
        if (stop?.(item)) {
          stopped = true;
          break;
        }
        all.push(item);
      }
      cursor = result.cursor;
      if (!result.hasMore) {
        break;
      }
    }
    return await this.embed(all, embed);
  }

  @logMethodReturningPromise("BasePersistence")
  async put(item: T): Promise<T> {
    this.logger.debug({ item }, "Putting item");
    const parsedItem = this.schema.parse(item);
    await withMetrics(
      async () =>
        this.docClient.send(
          new PutCommand({
            TableName: this.tableName,
            Item: this.projectItem({
              ...parsedItem,
              type: this.type,
              updatedAt: new Date().toISOString(),
            }),
            ConditionExpression: "attribute_exists(id)",
          }),
        ),
      "Persistence/Put",
      {
        ObjectType: this.type,
      },
    );
    return parsedItem;
  }
}

export abstract class UnembeddingBasePersistence<T extends BaseItem> extends BasePersistence<T> {
  async embed(items: T[], embed?: Embeddable[]): Promise<EmbeddedObject<T>[]> {
    if (embed && embed.length > 0) {
      throw new HttpException(400, "This persistence does not support embed");
    }
    return items as EmbeddedObject<T>[];
  }

  async embedAll(items: T[], embed?: Embeddable[]): Promise<EmbeddedObject<T>[]> {
    if (embed && embed.length > 0) {
      throw new HttpException(400, "This persistence does not support embed");
    }
    return items as EmbeddedObject<T>[];
  }
}
