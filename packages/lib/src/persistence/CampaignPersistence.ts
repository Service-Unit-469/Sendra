import type { Campaign } from "@sendra/shared";
import { CampaignSchema } from "@sendra/shared";
import { BasePersistence, type Embeddable, type IndexInfo } from "./BasePersistence";
import { type EmbedLimit, embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class CampaignPersistence extends BasePersistence<Campaign> {
  constructor(projectId: string) {
    super(`CAMPAIGN#${projectId}`, CampaignSchema);
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
}
