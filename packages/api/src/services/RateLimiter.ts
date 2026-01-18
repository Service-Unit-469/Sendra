import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getPersistenceConfig, rootLogger } from "@sendra/lib";

const logger = rootLogger.child({ module: "rateLimit" });

export type RateLimitEntry = {
  count: number;
  resetTime: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetTime: number;
};

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

/**
 * Distributed rate limiter using DynamoDB to track request counts and reset times
 */
export class RateLimiter {
  constructor(private readonly config: RateLimitConfig) {}

  /**
   * Check if request should be rate limited
   * Uses a sliding window: if the window has expired, reset count to 1.
   * Otherwise, increment count only if under the limit.
   */
  async check(clientId: string): Promise<RateLimitResult> {
    const persistenceConfig = getPersistenceConfig();
    const tableName = persistenceConfig.tableNames.rateLimit;
    const docClient = DynamoDBDocumentClient.from(persistenceConfig.client);

    const { maxRequests, windowMs } = this.config;
    const now = Date.now();
    const newResetTime = now + windowMs;
    const ttl = Math.floor(newResetTime / 1000);

    try {
      // Get current state to check if window expired
      const getResult = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            clientId,
          },
        }),
      );

      const storedResetTime = getResult.Item?.resetTime as number | undefined;
      const windowExpired = !storedResetTime || storedResetTime < now;

      if (windowExpired) {
        // Window expired or doesn't exist: reset count to 1
        const result = await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              clientId,
            },
            UpdateExpression: "SET #count = :one, #resetTime = :resetTime, #ttl = :ttl",
            ExpressionAttributeNames: {
              "#count": "count",
              "#resetTime": "resetTime",
              "#ttl": "ttl",
            },
            ExpressionAttributeValues: {
              ":one": 1,
              ":resetTime": newResetTime,
              ":ttl": ttl,
            },
            ReturnValues: "ALL_NEW",
          }),
        );

        const count = (result.Attributes?.count as number) ?? 1;
        return {
          allowed: true,
          remaining: maxRequests - count,
          resetTime: newResetTime,
        };
      } else {
        // Window active: increment count only if under limit
        // Use stored resetTime for TTL to keep it aligned with window expiration
        const storedTtl = Math.floor(storedResetTime / 1000);
        const result = await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              clientId,
            },
            UpdateExpression: "ADD #count :inc SET #ttl = :ttl",
            ExpressionAttributeNames: {
              "#count": "count",
              "#ttl": "ttl",
            },
            ExpressionAttributeValues: {
              ":inc": 1,
              ":ttl": storedTtl,
              ":max": maxRequests,
            },
            // Only increment if count is less than maxRequests
            ConditionExpression: "#count < :max",
            ReturnValues: "ALL_NEW",
          }),
        );

        const count = (result.Attributes?.count as number) ?? 1;
        const remaining = Math.max(0, maxRequests - count);

        return {
          allowed: count <= maxRequests,
          remaining,
          resetTime: storedResetTime,
        };
      }
    } catch (error: unknown) {
      // Check if it's a conditional check failure (rate limit exceeded)
      if (error && typeof error === "object" && "name" in error && error.name === "ConditionalCheckFailedException") {
        logger.debug({ clientId }, "Rate limit exceeded");
        try {
          const getResult = await docClient.send(
            new GetCommand({
              TableName: tableName,
              Key: {
                clientId,
              },
            }),
          );

          const storedResetTime = (getResult.Item?.resetTime as number) ?? newResetTime;

          return {
            allowed: false,
            remaining: 0,
            resetTime: storedResetTime,
          };
        } catch {
          // Fallback if get fails
          return {
            allowed: false,
            remaining: 0,
            resetTime: newResetTime,
          };
        }
      }

      // Other errors - log and allow request (fail open for availability)
      logger.error({ err: error, clientId }, "Error checking rate limit, allowing request");
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: newResetTime,
      };
    }
  }
}
