import type { Campaign } from "@sendra/shared";
import { CampaignSchema } from "@sendra/shared";
import { BasePersistence, type Embeddable, type IndexInfo } from "./BasePersistence";
import { embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class CampaignPersistence extends BasePersistence<Campaign> {
  constructor(projectId: string) {
    super(`CAMPAIGN#${projectId}`, CampaignSchema);
  }

  async embed(items: Campaign[], embed?: Embeddable[]) {
    return await embedHelper(items, "campaign", ["emails"], embed);
  }

  getIndexInfo(): IndexInfo {
    throw new HttpException(400, "No indexes implemented for CampaignPersistence");
  }

  projectItem(item: Campaign) {
    return item;
  }
}
