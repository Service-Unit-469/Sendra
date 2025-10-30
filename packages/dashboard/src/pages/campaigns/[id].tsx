import { zodResolver } from "@hookform/resolvers/zod";
import type { CampaignUpdate, Email } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { Ring } from "@uiball/loaders";
import GroupOrContacts from "dashboard/src/components/ContactSelector/GroupOrContacts";
import { EmailEditor } from "dashboard/src/components/EmailEditor";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Eye, Save, Send, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Badge, BlackButton, Card, Dropdown, ErrorAlert, FullscreenLoader, Input, MenuButton, Modal, SimpleRichTextEditor, Table } from "../../components";
import { Dashboard } from "../../layouts";
import { useCampaign, useCampaignsWithEmails } from "../../lib/hooks/campaigns";
import { useEmailsByCampaign } from "../../lib/hooks/emails";
import { useActiveProject, useActiveProjectIdentity } from "../../lib/hooks/projects";
import { useTemplate } from "../../lib/hooks/templates";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { mutate: campaignsMutate } = useCampaignsWithEmails();
  const { data: campaign, mutate: campaignMutate } = useCampaign(router.query.id as string);

  const { data: emails } = useEmailsByCampaign(campaign?.id);
  const { data: projectIdentity } = useActiveProjectIdentity();
  const { data: template } = useTemplate(campaign?.template ?? "");

  const [confirmModal, setConfirmModal] = useState(false);
  const [delay, setDelay] = useState(0);

  const isQuickEmail = template?.quickEmail ?? false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(CampaignSchemas.update.omit({ id: true })),
    defaultValues: { recipients: [], body: undefined },
  });

  useEffect(() => {
    if (!campaign) {
      return;
    }

    reset({
      ...campaign,
      recipients: campaign.recipients,
    });
  }, [reset, campaign]);

  useEffect(() => {
    watch((value, { name }) => {
      if (name === "email") {
        if (value.email && project?.email && !value.email.endsWith(project.email.split("@")[1])) {
          setError("email", {
            type: "manual",
            message: `The sender address must end with @${project.email?.split("@")[1]}`,
          });
        } else {
          clearErrors("email");
        }
      }
    });
  }, [watch, project, setError, clearErrors]);

  const saveCampaign = useCallback(
    async (data: Omit<CampaignUpdate, "id">) => {
      if (data.email?.trim() === "") {
        delete data.email;
      }
      if (!project || !campaign) {
        return;
      }

      await network.fetch(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "PUT",
        body: {
          id: campaign.id,
          ...data,
        },
      });
    },
    [project, campaign],
  );

  if (!router.isReady) {
    return <FullscreenLoader />;
  }

  if (!project || !campaign || (watch("body") as string | undefined) === undefined) {
    return <FullscreenLoader />;
  }

  const send = async (data: Omit<CampaignUpdate, "id">) => {
    setConfirmModal(false);

    toast.success("Saved your campaign. Starting delivery now, please hold on!");

    await saveCampaign(data);

    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        body: {
          id: campaign.id,
          live: true,
          delay,
        },
      }),

      {
        loading: "Starting delivery...",
        success: () => {
          void campaignMutate();
          void campaignsMutate();

          return `Started delivery of your campaign to ${watch("recipients").length} recipients`;
        },
        error: () => {
          return "Could not send your campaign!";
        },
      },
    );
  };

  const sendTest = async (data: Omit<CampaignUpdate, "id">) => {
    await saveCampaign(data);

    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        body: {
          live: false,
          delay: 0,
        },
      }),
      {
        loading: "Sending you a test campaign",
        success: "Sent all project members a test campaign",
        error: "Could not send your campaign!",
      },
    );
  };

  const update = (data: Omit<CampaignUpdate, "id">) => {
    toast.promise(saveCampaign(data), {
      loading: "Saving your campaign",
      success: () => {
        void campaignMutate();
        void campaignsMutate();
        return "Saved your campaign";
      },
      error: "Could not save your campaign!",
    });
  };

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

    await router.push("/campaigns");
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

    await router.push("/campaigns");
  };

  return (
    <>
      <Modal
        isOpen={confirmModal}
        onToggle={() => setConfirmModal(!confirmModal)}
        onAction={handleSubmit(send)}
        type={"info"}
        title={"Send campaign"}
        description={`Once you start sending this campaign to ${watch("recipients").length} contacts, you can no longer make changes or undo it.`}
      >
        <label htmlFor="campaign-delay" className="block text-sm font-medium text-neutral-700">
          Delay
        </label>
        <Dropdown
          inModal={true}
          onChange={(val) => setDelay(Number.parseInt(val, 10))}
          values={[
            {
              name: "Send immediately",
              value: "0",
            },
            {
              name: "In an hour",
              value: "60",
            },
            {
              name: "In 6 hours",
              value: "360",
            },
            {
              name: "In 12 hours",
              value: "720",
            },
            {
              name: "In 24 hours",
              value: "1440",
            },
          ]}
          selectedValue={delay.toString()}
        />
      </Modal>
      <Dashboard>
        <Card
          title={campaign.status !== "DRAFT" ? "View campaign" : "Update campaign"}
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
          <form onSubmit={handleSubmit(update)} className="space-y-6 sm:space-y-0 sm:space-6 sm:grid sm:gap-6 sm:grid-cols-6">
            <div className={"sm:col-span-6 grid sm:grid-cols-6 gap-6"}>
              <Input className={"sm:col-span-6"} label={"Subject"} placeholder={`Welcome to ${project.name}!`} register={register("subject")} error={errors.subject} />

              {projectIdentity?.identity?.verified && <Input className={"sm:col-span-3"} label={"Sender Email"} placeholder={`${project.email}`} register={register("email")} error={errors.email} />}

              {projectIdentity?.identity?.verified && (
                <Input className={"sm:col-span-3"} label={"Sender Name"} placeholder={`${project.from ?? project.name}`} register={register("from")} error={errors.from} />
              )}
            </div>

            <GroupOrContacts
              onRecipientsChange={(r: string[]) => setValue("recipients", r)}
              onGroupsChange={(g: string[]) => setValue("groups", g)}
              disabled={campaign.status !== "DRAFT"}
              label="Recipients"
              selectedContacts={campaign.recipients}
              selectedGroups={campaign.groups}
            />

            <ErrorAlert message={(errors.recipients as FieldError | undefined)?.message} />

            <AnimatePresence>
              {watch("recipients").length >= 10 && campaign.status !== "DELIVERED" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={"relative z-10 sm:col-span-6"}>
                  <Alert type={"info"} title={"Automatic batching"}>
                    Your campaign will be sent out in batches of 80 recipients each. It will be delivered to all contacts{" "}
                    {dayjs().to(dayjs().add(Math.ceil(watch("recipients").length / 80), "minutes"))}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {campaign.status !== "DRAFT" &&
              (emails?.length === 0 ? (
                <div className={"flex items-center gap-6 rounded border border-neutral-300 px-6 py-3 sm:col-span-6"}>
                  <Ring size={20} />
                  <div>
                    <h1 className={"text-lg font-semibold text-neutral-800"}>Hang on!</h1>
                    <p className={"text-sm text-neutral-600"}>We are still sending your campaign. Emails will start appearing here once they are sent.</p>
                  </div>
                </div>
              ) : (
                <div className={"max-h-[400px] overflow-x-hidden overflow-y-scroll rounded border border-neutral-200 sm:col-span-6"}>
                  <Table
                    values={(emails ?? []).map((e: Email) => {
                      return {
                        Email: e.email,
                        Status: (
                          <Badge type={e.status === "DELIVERED" ? "info" : e.status === "OPENED" ? "success" : "danger"}>{e.status.at(0)?.toUpperCase() + e.status.slice(1).toLowerCase()}</Badge>
                        ),
                        View: (
                          <Link href={`/contacts/${e.contact}`}>
                            <Eye size={20} />
                          </Link>
                        ),
                      };
                    })}
                  />
                </div>
              ))}

            <div className={"sm:col-span-6"}>
              {isQuickEmail ? (
                <div>
                  <label htmlFor="body" className="block text-sm font-medium text-neutral-700 mb-2">
                    Email Body
                  </label>
                  {template && (
                    <p className="text-xs text-neutral-500 mb-2">
                      Using quick email template: <strong>{template.subject}</strong>
                    </p>
                  )}
                  <SimpleRichTextEditor
                    initialValue={campaign.body}
                    onChange={(value) => setValue("body", value)}
                    placeholder="Enter your email content here. It will be inserted into the template."
                  />
                </div>
              ) : (
                <EmailEditor initialValue={campaign.body} onChange={(value) => setValue("body", value)} />
              )}
              <ErrorAlert message={errors.body?.message} />
            </div>

            <div className={"ml-auto mt-6 sm:flex justify-end sm:gap-x-5 sm:col-span-6"}>
              {campaign.status === "DRAFT" ? (
                <>
                  <BlackButton onClick={handleSubmit(sendTest)}>
                    <Send />
                    Send test to {project.name}'s members
                  </BlackButton>
                  <BlackButton
                    onClick={(e) => {
                      e.preventDefault();
                      setConfirmModal(true);
                    }}
                  >
                    <Send />
                    Save & Send
                  </BlackButton>
                  <BlackButton>
                    <Save strokeWidth={1.5} size={18} />
                    Save
                  </BlackButton>
                </>
              ) : null}
            </div>
          </form>
        </Card>
      </Dashboard>
    </>
  );
}
