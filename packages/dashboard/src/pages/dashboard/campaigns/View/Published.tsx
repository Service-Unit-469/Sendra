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
import { useCampaigns } from "../../../../lib/hooks/campaigns";
import { useEmailsByCampaign } from "../../../../lib/hooks/emails";
import { useCurrentProject } from "../../../../lib/hooks/projects";
import { campaignOpenRatePercent } from "../../../../lib/campaignStats";
import { network } from "../../../../lib/network";

/**
 * renders the published campaign view
 */
export default function PublishedCampaign({ campaign, mutate: campaignMutate }: { campaign: Campaign; mutate: () => void }) {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const { mutate: campaignsMutate } = useCampaigns();

  const { data: emails } = useEmailsByCampaign(campaign);
  const [activeTab, setActiveTab] = useState<string>("emails");

  if (!campaign) {
    return <FullscreenLoader />;
  }

  const stats = campaign.stats ?? { total: 0, sent: 0, delivered: 0, opened: 0, errors: 0, errorDetails: [] };
  const summaryMetrics =
    stats.total > 0
      ? ([
          { label: "Recipients", value: stats.total },
          { label: "Sent", value: stats.sent },
          { label: "Open Rate", value: campaignOpenRatePercent(stats), suffix: "%" },
        ] as const)
      : emails && emails.length > 0
        ? ([
            { label: "Recipients", value: emails.length },
            {
              label: "Sent",
              value: emails.filter((e) => e.status !== "QUEUED").length,
            },
            {
              label: "Open Rate",
              value: Math.min(
                100,
                Math.round(
                  (emails.filter((e) => e.status === "OPENED").length /
                    Math.max(
                      emails.filter((e) => e.status === "DELIVERED" || e.status === "OPENED").length,
                      1,
                    )) *
                    100,
                ),
              ),
              suffix: "%",
            },
          ] as const)
        : null;

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
          {summaryMetrics && <ThreeColMetricsSummary metrics={[...summaryMetrics]} />}
          {(stats.errorDetails?.length ?? 0) > 0 && (
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-700">Queue errors</p>
              {stats.errors > (stats.errorDetails?.length ?? 0) && (
                <p className="mt-1 text-xs text-neutral-500">
                  Showing {stats.errorDetails?.length ?? 0} of {stats.errors} failures (log capped).
                </p>
              )}
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm text-neutral-600">
                {(stats.errorDetails ?? []).map((entry) => (
                  <li key={entry.contact}>
                    <Link to={`/contacts/${entry.contact}`} className="font-medium text-neutral-800 hover:underline">
                      {entry.contact}
                    </Link>
                    <span className="text-neutral-500"> — {entry.message}</span>
                  </li>
                ))}
              </ul>
            </div>
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
