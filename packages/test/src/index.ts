import { CreateTableCommand, DynamoDBClient, UpdateTimeToLiveCommand, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import { install, start, stop } from "aws-dynamodb-local";
import { pickPort } from "pick-port";

const DATA_TABLE_NAME = "test-sendra-data-table";
const RATE_LIMIT_TABLE_NAME = "test-sendra-rate-limit-table";
let port: number;

const initializeDynamoDB = async (client: DynamoDBClient) => {
  const createTableCommand = new CreateTableCommand({
    TableName: DATA_TABLE_NAME,
    KeySchema: [
      { AttributeName: "type", KeyType: "HASH" },
      { AttributeName: "id", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "type", AttributeType: "S" },
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
      { AttributeName: "messageId", AttributeType: "S" },
      { AttributeName: "i_attr1", AttributeType: "S" },
      { AttributeName: "i_attr2", AttributeType: "S" },
      { AttributeName: "i_attr3", AttributeType: "S" },
      { AttributeName: "i_attr4", AttributeType: "S" },
    ],
    LocalSecondaryIndexes: [
      {
        IndexName: "ATTR_1",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "i_attr1", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "ATTR_2",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "i_attr2", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "ATTR_3",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "i_attr3", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "ATTR_4",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "i_attr4", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "BY_EMAIL",
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" },
          { AttributeName: "type", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
      {
        IndexName: "BY_MESSAGE_ID",
        KeySchema: [
          { AttributeName: "messageId", KeyType: "HASH" },
          { AttributeName: "type", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,
          WriteCapacityUnits: 1,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1,
    },
  });

  await client.send(createTableCommand);
  // Wait for table to be active
  await waitUntilTableExists(
    {
      client,
      maxWaitTime: 30,
    },
    {
      TableName: DATA_TABLE_NAME,
    },
  );

  await client.send(
    new CreateTableCommand({
      TableName: RATE_LIMIT_TABLE_NAME,
      KeySchema: [{ AttributeName: "clientId", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "clientId", AttributeType: "S" }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    }),
  );
  await waitUntilTableExists(
    {
      client,
      maxWaitTime: 30,
    },
    {
      TableName: RATE_LIMIT_TABLE_NAME,
    },
  );
  await client.send(
    new UpdateTimeToLiveCommand({
      TableName: RATE_LIMIT_TABLE_NAME,
      TimeToLiveSpecification: {
        AttributeName: "ttl",
        Enabled: true,
      },
    }),
  );
};

export const startupDynamoDB = async () => {
  port = await pickPort({
    type: "tcp",
  });
  await install();
  await start({ port, docker: true });

  const { vi } = await import("vitest");

  vi.stubEnv("PERSISTENCE_PROVIDER", "local");
  vi.stubEnv("DATA_TABLE_NAME", DATA_TABLE_NAME);
  vi.stubEnv("RATE_LIMIT_TABLE_NAME", RATE_LIMIT_TABLE_NAME);
  vi.stubEnv("AWS_REGION", "us-east-1");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "dummy");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "dummy");
  vi.stubEnv("AWS_ENDPOINT", `http://localhost:${port}`);

  // Initialize table
  const client = new DynamoDBClient({
    endpoint: `http://localhost:${port}`,
    region: "us-east-1",
    credentials: {
      accessKeyId: "dummy",
      secretAccessKey: "dummy",
    },
  });
  await initializeDynamoDB(client);

  return {
    port,
    client,
  };
};

export const stopDynamoDB = async () => {
  await stop(port);
  const { vi } = await import("vitest");
  vi.unstubAllEnvs();
};
