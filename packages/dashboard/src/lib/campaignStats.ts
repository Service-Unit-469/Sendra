import type { Campaign } from "@sendra/shared";

type CampaignStats = NonNullable<Campaign["stats"]>;

/**
 * Open rate uses delivered count when SES has reported deliveries; otherwise falls back to sent.
 * Result is capped at 100% so display stays sane if counters drift.
 */
export function campaignOpenRatePercent(stats: CampaignStats): number {
  const denom = stats.delivered > 0 ? stats.delivered : stats.sent;
  if (denom <= 0) return 0;
  return Math.min(100, Math.round((stats.opened / denom) * 100));
}
