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
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Input from "../../../components/Input/Input/Input";
import Modal from "../../../components/Overlay/Modal/Modal";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Empty from "../../../components/Utility/Empty/Empty";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCampaignsWithEmails } from "../../../lib/hooks/campaigns";
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
  const { data: campaigns, mutate: campaignsMutate } = useCampaignsWithEmails();
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
            data: JSON.stringify({ quickBody: "" }),
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
      <Modal isOpen={newCampaignModal} onToggle={() => setNewCampaignModal((s) => !s)} onAction={() => {}} type={"info"} title={"Create new campaign"} hideActionButtons={true}>
        <form onSubmit={handleCreateSubmit(createCampaign)} className="flex flex-col gap-6">
          <div>
            <Input className={"sm:col-span-6"} label={"Subject"} placeholder={`Welcome to ${project.name}!`} register={register("subject")} error={errors.subject} />
          </div>
          <div>
            <label htmlFor="template" className={"text-sm font-medium text-neutral-700"}>
              Template
              <Dropdown className={"w-full"} values={templates.map((t) => ({ name: t.subject, value: t.id }))} selectedValue={watch("template") ?? ""} onChange={(v) => setValue("template", v)} />
              <ErrorAlert message={errors.template?.message} />
            </label>
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
            <div className={"grid grid-cols-1 gap-6 sm:grid-cols-2"}>
              {campaigns.map((c) => {
                return (
                  <div className="col-span-1 divide-y divide-neutral-200 rounded-sm border border-neutral-200 bg-white" key={c.id}>
                    <div className="flex w-full items-center justify-between space-x-6 p-6">
                      <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
                        <Send size={20} />
                      </span>
                      <div className="flex-1 truncate">
                        <div className="flex items-center space-x-3">
                          <h3 className="truncate text-lg font-bold text-neutral-800">{c.subject}</h3>
                        </div>
                        <div className={"mb-6"}>
                          <h2 className={"text col-span-2 truncate font-semibold text-neutral-700"}>Quick Stats</h2>
                          <div className={"grid grid-cols-2 gap-3"}>
                            {c.status === "DELIVERED" ? (
                              <>
                                <div>
                                  <label className={"text-xs font-medium text-neutral-500"} htmlFor="open-rate">
                                    Open rate
                                  </label>
                                  <p className="mt-1 truncate text-sm text-neutral-500" id="open-rate">
                                    {c._embed.emails?.length && c._embed.emails?.length > 0
                                      ? Math.round((c._embed.emails.filter((e) => e.status === "OPENED").length / c._embed.emails.filter((e) => e.status !== "QUEUED").length) * 100)
                                      : 0}
                                    %
                                  </p>
                                </div>

                                {c._embed.emails?.length && c._embed.emails?.length > 0 && (
                                  <div>
                                    <label htmlFor="emails-in-queue" className={"text-xs font-medium text-neutral-500"}>
                                      Emails in queue
                                    </label>
                                    <p className="mt-1 truncate text-sm text-neutral-500" id="emails-in-queue">
                                      {c._embed.emails.filter((e) => e.status === "QUEUED").length}
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
                        </div>
                        <div className={"my-4"}>
                          <h2 className={"col-span-2 truncate font-semibold text-neutral-700"}>Properties</h2>
                          <div className={"grid grid-cols-2 gap-3"}>
                            <div>
                              <label htmlFor="recipients" className={"text-xs font-medium text-neutral-500"}>
                                Recipients
                              </label>
                              <p id="recipients" className="mt-1 truncate text-sm text-neutral-500">
                                {c.recipients.length}
                              </p>
                            </div>

                            <div>
                              <label htmlFor="status" className={"text-xs font-medium text-neutral-500"}>
                                Status
                              </label>
                              <p id="status" className="mt-1 truncate text-sm text-neutral-500">
                                {c.status === "DRAFT" ? <Badge type={"info"}>Draft</Badge> : <Badge type={"success"}>Sent</Badge>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="-mt-px flex divide-x divide-neutral-200">
                        <div className="flex w-0 flex-1">
                          <Link
                            to={`/dashboard/campaigns/${c.id}`}
                            className="relative inline-flex w-0 flex-1 items-center justify-center rounded-bl rounded-br py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
                          >
                            {c.status === "DELIVERED" ? <Eye size={18} /> : <Edit2 size={18} />}
                            <span className="ml-3">{c.status === "DELIVERED" ? "View" : "Edit"}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title={"No campaigns found"} description={"Send your contacts emails in bulk with a few clicks"} />
          )
        ) : (
          <Skeleton type={"table"} />
        )}
      </Card>
    </>
  );
}
