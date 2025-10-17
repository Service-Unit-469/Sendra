import { CreateTableCommand, DescribeTableCommand, DynamoDBClient, waitUntilTableExists } from "@aws-sdk/client-dynamodb";
import dynamodbLocal from "aws-dynamodb-local";
import { pickPort } from "pick-port";

let port: number;

export const getDynamoDB = async () => {
  port = await pickPort({
    type: "tcp",
  });
  await dynamodbLocal.install();
  await dynamodbLocal.start({ port });
  return {
    port,
    url: `http://localhost:${port}`,
  };
};

export const initializeDynamoDB = async (client: DynamoDBClient, tableName: string) => {
  const createTableCommand = new CreateTableCommand({
    TableName: tableName,
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
      TableName: tableName,
    }
  );
};


export const stopDynamoDB = async () => {
  await dynamodbLocal.stop(port);
};
