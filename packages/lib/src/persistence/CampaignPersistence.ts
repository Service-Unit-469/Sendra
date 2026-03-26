import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Campaign } from "@sendra/shared";
import { CAMPAIGN_QUEUE_ERROR_LOG_MAX, CampaignSchema } from "@sendra/shared";
import { type MetricsLogger, Unit } from "aws-embedded-metrics";
import { withMetrics } from "../metrics";
import { BasePersistence, type Embeddable, type IndexInfo } from "./BasePersistence";
import { type EmbedLimit, embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class CampaignPersistence extends BasePersistence<Campaign> {
  private readonly dynamoTypeKey: string;

  constructor(projectId: string) {
    const dynamoTypeKey = `CAMPAIGN#${projectId}`;
    super(dynamoTypeKey, CampaignSchema);
    this.dynamoTypeKey = dynamoTypeKey;
  }

  /**
   * After campaign emails are queued: set total recipient count and reset in-flight stats for this send.
   * @param failures - Per-recipient failures (missing contact, create, or enqueue). `errors` count equals `failures.length`; `errorDetails` keeps the last CAMPAIGN_QUEUE_ERROR_LOG_MAX entries.
   */
  async setStatsAfterQueue(campaignId: string, total: number, failures: readonly { contact: string; message: string }[]): Promise<void> {
    const now = new Date().toISOString();
    const capped = failures.slice(-CAMPAIGN_QUEUE_ERROR_LOG_MAX).map((f) => ({
      contact: f.contact,
      message: f.message.length > 500 ? `${f.message.slice(0, 497)}...` : f.message,
    }));
    await withMetrics(
      async (metricsLogger: MetricsLogger) => {
        metricsLogger.setProperty("ObjectType", this.dynamoTypeKey);
        metricsLogger.putMetric("CampaignStatsAfterQueue", 1, Unit.Count);
        const result = await this.docClient.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { id: campaignId, type: this.dynamoTypeKey },
            UpdateExpression: "SET #stats = :statsMap, #updatedAt = :now",
            ExpressionAttributeNames: {
              "#stats": "stats",
              "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues: {
              ":statsMap": {
                total,
                sent: 0,
                delivered: 0,
                opened: 0,
                errors: failures.length,
                errorDetails: capped,
              },
              ":now": now,
            },
            ReturnConsumedCapacity: "TOTAL",
          }),
        );
        this.trackConsumedCapacity(result);
      },
      { Operation: "CampaignSetStatsAfterQueue" },
    );
  }

  /**
   * Atomically increment campaign stat counters (e.g. sent, delivered, opened).
   */
  async incrementStats(campaignId: string, deltas: { sent?: number; delivered?: number; opened?: number }): Promise<void> {
    const addParts: string[] = [];
    const exprNames: Record<string, string> = {
      "#stats": "stats",
      "#updatedAt": "updatedAt",
    };
    const exprValues: Record<string, number | string> = {
      ":now": new Date().toISOString(),
    };
    let n = 0;
    if (deltas.sent) {
      exprNames["#st"] = "sent";
      const v = `:inc${n++}`;
      exprValues[v] = deltas.sent;
      addParts.push(`#stats.#st ${v}`);
    }
    if (deltas.delivered) {
      exprNames["#de"] = "delivered";
      const v = `:inc${n++}`;
      exprValues[v] = deltas.delivered;
      addParts.push(`#stats.#de ${v}`);
    }
    if (deltas.opened) {
      exprNames["#op"] = "opened";
      const v = `:inc${n++}`;
      exprValues[v] = deltas.opened;
      addParts.push(`#stats.#op ${v}`);
    }
    if (addParts.length === 0) {
      return;
    }

    await withMetrics(
      async (metricsLogger: MetricsLogger) => {
        metricsLogger.setProperty("ObjectType", this.dynamoTypeKey);
        metricsLogger.putMetric("CampaignStatsIncrement", 1, Unit.Count);
        const result = await this.docClient.send(
          new UpdateCommand({
            TableName: this.tableName,
            Key: { id: campaignId, type: this.dynamoTypeKey },
            UpdateExpression: `ADD ${addParts.join(", ")} SET #updatedAt = :now`,
            ExpressionAttributeNames: exprNames,
            ExpressionAttributeValues: exprValues,
            ReturnConsumedCapacity: "TOTAL",
          }),
        );
        this.trackConsumedCapacity(result);
      },
      { Operation: "CampaignIncrementStats" },
    );
  }

  async embed(items: Campaign[], embed?: Embeddable[], embedLimit?: EmbedLimit) {
    return await embedHelper({
      items,
      key: "campaign",
      supportedEmbed: ["emails"],
      embed,
      embedLimit: embedLimit ?? "all",
    });
  }

  getIndexInfo(): IndexInfo {
    throw new HttpException(400, "No indexes implemented for CampaignPersistence");
  }

  projectItem(item: Campaign) {
    return item;
  }

  /**
   * Ensure `stats` is persisted on create (BasePersistence.put raw item before Zod defaults apply).
   */
  override async create(item: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Promise<Campaign> {
    const stats = item.stats ?? { total: 0, sent: 0, delivered: 0, opened: 0, errors: 0, errorDetails: [] };
    return super.create({ ...item, stats });
  }
}
