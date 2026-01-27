import { useParams } from "react-router-dom";
import FullscreenLoader from "../../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCampaign } from "../../../../lib/hooks/campaigns";
import DraftCampaign from "./Draft";
import PublishedCampaign from "./Published";

/**
 * renders the correct campaign view based on the campaign status
 */
export default function ViewCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, mutate: campaignMutate } = useCampaign(id ?? "");
  if (!campaign) {
    return <FullscreenLoader />;
  }

  if (campaign.status === "DRAFT") {
    return <DraftCampaign campaign={campaign} mutate={campaignMutate} />;
  }
  return <PublishedCampaign campaign={campaign} mutate={campaignMutate} />;
}
