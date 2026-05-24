import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, Eye, Plus, Save, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import z from "zod";
import { ErrorAlert } from "../../../components/Alert/ErrorAlert";
import Badge from "../../../components/Badge/Badge";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import { ItemCard, ItemCardBody } from "../../../components/Card/ItemCard";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Input from "../../../components/Input/Input/Input";
import { StyledLabel } from "../../../components/Label/StyledLabel";
import Modal from "../../../components/Overlay/Modal/Modal";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Empty from "../../../components/Utility/Empty/Empty";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { campaignOpenRatePercent } from "../../../lib/campaignStats";
import { useCampaigns } from "../../../lib/hooks/campaigns";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { useTemplates } from "../../../lib/hooks/templates";
import { network } from "../../../lib/network";

const createCampaignFormSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  template: z.string().optional(),
});

/**
 *
 */
export default function Index() {
  const { data: campaigns, mutate: campaignsMutate } = useCampaigns();
  const { data: templates } = useTemplates();
  const [newCampaignModal, setNewCampaignModal] = useState<boolean>(false);
  const project = useCurrentProject();

  const {
    register,
    handleSubmit: handleCreateSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(createCampaignFormSchema),
    defaultValues: {
      subject: "",
      template: undefined as string | undefined,
    },
  });

  if (!templates) {
    return <FullscreenLoader />;
  }

  const createCampaign = async (data: z.infer<typeof createCampaignFormSchema>) => {
    toast.promise(
      async () => {
        const template = templates.find((t) => t.id === data.template);
        if (!template) {
          throw new Error("Template is required");
        }

        let campaignBody: {
          data: string;
          html: string;
          plainText: string;
        };
        if (template.quickEmail) {
          // For quick email templates, start with template HTML containing {{quickBody}} token
          // The editor will replace this with actual content
          campaignBody = {
            data: "",
            html: template.body.html,
            plainText: template.body.plainText,
          };
        } else {
          // For regular templates, copy the template body as-is
          campaignBody = template.body;
        }

        await network.fetch(`/projects/${project.id}/campaigns`, {
          method: "POST",
          body: {
            subject: data.subject,
            template: data.template || undefined,
            body: campaignBody,
            email: template.email,
            from: template.from,
            recipients: [],
            groups: [],
          },
        });
      },
      {
        loading: "Creating new campaign",
        success: () => {
          void campaignsMutate();
          return "Created new campaign";
        },
        error: "Could not create new campaign!",
      },
    );

    setNewCampaignModal(false);
  };

  return (
    <>
      <Modal isOpen={newCampaignModal} onToggle={() => setNewCampaignModal((s) => !s)} onAction={() => {}} type="info" title={"Create new campaign"} hideActionButtons={true}>
        <form onSubmit={handleCreateSubmit(createCampaign)} className="flex flex-col gap-6">
          <div>
            <Input className="sm:col-span-6" label="Subject" placeholder={`Welcome to ${project.name}!`} register={register("subject")} error={errors.subject} />
          </div>
          <div>
            <StyledLabel>
              Template
              <Dropdown
                ariaLabel="Select a Template"
                className="w-full"
                disabled={templates.length === 0}
                values={templates.map((t) => ({
                  name: t.subject,
                  value: t.id,
                }))}
                selectedValue={watch("template") ?? ""}
                onChange={(v) => setValue("template", v)}
              />
              <ErrorAlert message={errors.template?.message} />
            </StyledLabel>
          </div>

          <div className={"col-span-2 ml-auto flex justify-end gap-x-5"}>
            <BlackButton>
              <Save strokeWidth={1.5} size={18} />
              Create Campaign
            </BlackButton>
          </div>
        </form>
      </Modal>
      <Card
        title="Campaigns"
        description="Send your contacts emails in bulk with a few clicks"
        actions={
          <BlackButton onClick={() => setNewCampaignModal(true)}>
            <Plus strokeWidth={1.5} size={18} />
            New
          </BlackButton>
        }
      >
        {campaigns ? (
          campaigns.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2" role="list">
              {campaigns.map((c) => {
                const stats = c.stats ?? {
                  total: 0,
                  sent: 0,
                  delivered: 0,
                  opened: 0,
                  errors: 0,
                  errorDetails: [],
                };
                const queued = Math.max(stats.total - stats.sent, 0);
                const openRatePct = campaignOpenRatePercent(stats);
                const button = {
                  to: `/campaigns/${c.id}`,
                  icon: c.status === "DELIVERED" ? <Eye size={18} /> : <Edit2 size={18} />,
                  label: c.status === "DELIVERED" ? "View" : "Edit",
                };
                return (
                  <ItemCard key={c.id} actionButtons={[button]} id={c.id} name={c.subject}>
                    <ItemCardBody icon={<Send size={20} />}>
                      <div className="flex items-center space-x-3">
                        <h3 className="truncate text-lg font-bold text-neutral-800">{c.subject}</h3>
                      </div>
                      <div className="mb-6">
                        <h2 className={"text col-span-2 truncate font-semibold text-neutral-700"}>Quick Stats</h2>
                        <div className="grid grid-cols-2 gap-3">
                          {c.status === "DELIVERED" ? (
                            <>
                              <div>
                                <label className={"text-xs font-medium text-neutral-500"} htmlFor="open-rate">
                                  Open rate
                                </label>
                                <p className="mt-1 truncate text-sm text-neutral-500" id="open-rate">
                                  {openRatePct}%
                                </p>
                              </div>

                              {stats.total > 0 && (
                                <div>
                                  <label htmlFor="emails-in-queue" className={"text-xs font-medium text-neutral-500"}>
                                    Pending send
                                  </label>
                                  <p className="mt-1 truncate text-sm text-neutral-500" id="emails-in-queue">
                                    {queued}
                                  </p>
                                </div>
                              )}
                              {stats.errors > 0 && (
                                <div>
                                  <label htmlFor="queue-errors" className={"text-xs font-medium text-neutral-500"}>
                                    Queue errors
                                  </label>
                                  <p className="mt-1 truncate text-sm text-neutral-500" id="queue-errors">
                                    {stats.errors}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <label className={"text-xs font-medium text-neutral-500"} htmlFor="open-rate">
                                Open rate
                              </label>
                              <p className="mt-1 truncate text-sm text-neutral-500" id="open-rate">
                                Awaiting delivery
                              </p>
                            </div>
                          )}
                        </div>
                        {c.status === "DELIVERED" && (stats.errorDetails?.length ?? 0) > 0 && (
                          <div className="mt-3 border-t border-neutral-100 pt-3">
                            <p className="text-xs font-medium text-neutral-500">Queue error details</p>
                            {stats.errors > (stats.errorDetails?.length ?? 0) && (
                              <p className="mt-1 text-xs text-neutral-400">
                                Showing {stats.errorDetails?.length ?? 0} of {stats.errors} failures (log capped).
                              </p>
                            )}
                            <ul className="mt-2 max-h-28 space-y-1.5 overflow-y-auto text-xs text-neutral-600">
                              {(stats.errorDetails ?? []).map((entry) => (
                                <li key={entry.contact}>
                                  <Link to={`/contacts/${entry.contact}`} className="font-medium text-neutral-700 hover:underline">
                                    {entry.contact}
                                  </Link>
                                  <span className="text-neutral-500"> — {entry.message}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="my-4">
                        <h2 className="col-span-2 truncate font-semibold text-neutral-700">Properties</h2>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="recipients" className="text-xs font-medium text-neutral-500">
                              Recipients
                            </label>
                            <p id="recipients" className="mt-1 truncate text-sm text-neutral-500">
                              {c.recipients.length}
                            </p>
                          </div>

                          <div>
                            <label htmlFor="status" className="text-xs font-medium text-neutral-500">
                              Status
                            </label>
                            <p id="status" className="mt-1 truncate text-sm text-neutral-500">
                              {c.status === "DRAFT" ? <Badge type="info">Draft</Badge> : <Badge type="success">Sent</Badge>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </ItemCardBody>
                  </ItemCard>
                );
              })}
            </div>
          ) : (
            <Empty title="No campaigns found" description="Send your contacts emails in bulk with a few clicks" />
          )
        ) : (
          <Skeleton type="table" />
        )}
      </Card>
    </>
  );
}
