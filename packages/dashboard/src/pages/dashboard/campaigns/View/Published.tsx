import type { Campaign, Email } from "@sendra/shared";
import dayjs from "dayjs";
import { Copy, Eye, LoaderCircle, Trash } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Badge from "../../../../components/Badge/Badge";
import { MenuButton } from "../../../../components/Buttons/MenuButton";
import Card from "../../../../components/Card/Card";
import ThreeColMetricsSummary from "../../../../components/Metrics/ThreeColMetricsSummary";
import { OnPageTabs } from "../../../../components/Navigation/Tabs/OnPageTabs";
import Table from "../../../../components/Table/Table";
import FullscreenLoader from "../../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCampaignsWithEmails } from "../../../../lib/hooks/campaigns";
import { useEmailsByCampaign } from "../../../../lib/hooks/emails";
import { useCurrentProject } from "../../../../lib/hooks/projects";
import { network } from "../../../../lib/network";

/**
 * renders the published campaign view
 */
export default function PublishedCampaign({ campaign, mutate: campaignMutate }: { campaign: Campaign; mutate: () => void }) {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const { mutate: campaignsMutate } = useCampaignsWithEmails();

  const { data: emails } = useEmailsByCampaign(campaign);
  const [activeTab, setActiveTab] = useState<string>("emails");

  if (!campaign) {
    return <FullscreenLoader />;
  }

  const duplicate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns`, {
        method: "POST",
        body: {
          ...campaign,
        },
      }),
      {
        loading: "Duplicating your campaign",
        success: () => {
          void campaignMutate();
          void campaignsMutate();
          return "Duplicated your campaign";
        },
        error: "Could not duplicate your campaign!",
      },
    );

    navigate("/campaigns");
  };

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting your campaign",
        success: () => {
          void campaignMutate();
          void campaignsMutate();
          return "Deleted your campaign";
        },
        error: "Could not delete your campaign!",
      },
    );

    navigate("/campaigns");
  };

  return (
    <>
      <Card
        title={campaign.subject}
        description={`Sent on ${dayjs(campaign.createdAt).format("MM/DD/YYYY HH:mm A")}`}
        options={
          <>
            <MenuButton onClick={duplicate}>
              <Copy size={18} />
              Duplicate
            </MenuButton>
            <MenuButton onClick={remove}>
              <Trash size={18} />
              Delete
            </MenuButton>
          </>
        }
      >
        <div className="py-4">
          {emails && emails.length > 0 && (
            <ThreeColMetricsSummary
              metrics={[
                { label: "Emails Sent", value: emails.length },
                { label: "Queued", value: emails.filter((e) => e.status === "QUEUED").length },
                { label: "Open Rate", value: emails.filter((e) => e.status === "OPENED").length / emails.length },
              ]}
            />
          )}
        </div>
      </Card>
      <OnPageTabs
        tabs={[
          { text: "Emails", onClick: () => setActiveTab("emails"), active: activeTab === "emails" },
          { text: "Preview", onClick: () => setActiveTab("preview"), active: activeTab === "preview" },
        ]}
      />

      {activeTab === "emails" && (
        <Card title="Emails">
          {emails?.length === 0 ? (
            <div className="flex items-center gap-6 rounded-sm border border-neutral-300 px-6 py-3 sm:col-span-6">
              <LoaderCircle size={20} className="animate-spin" />
              <div>
                <h1 className="text-lg font-semibold text-neutral-800">Hang on!</h1>
                <p className="text-sm text-neutral-600">We are still sending your campaign. Emails will start appearing here once they are sent.</p>
              </div>
            </div>
          ) : (
            <div className="sm:col-span-6">
              <Table
                values={(emails ?? []).map((e: Email) => {
                  return {
                    Email: e.email,
                    Status: <Badge type={e.status === "DELIVERED" ? "info" : e.status === "OPENED" ? "success" : "danger"}>{e.status.at(0)?.toUpperCase() + e.status.slice(1).toLowerCase()}</Badge>,
                    View: (
                      <Link to={`/contacts/${e.contact}`}>
                        <Eye size={20} />
                      </Link>
                    ),
                  };
                })}
              />
            </div>
          )}
        </Card>
      )}
      {activeTab === "preview" && (
        <Card title="Preview">
          <div className="h-[calc(100vh-550px)] min-h-[600px]">
            <iframe srcDoc={campaign.body.html} className="w-full h-full" title={campaign.subject ?? "Campaign preview"} />
          </div>
        </Card>
      )}
    </>
  );
}
