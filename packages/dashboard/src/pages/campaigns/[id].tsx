import { zodResolver } from "@hookform/resolvers/zod";
import type { CampaignUpdate, Email } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { Ring } from "@uiball/loaders";
import { EmailEditor } from "dashboard/src/components/EmailEditor";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Badge, Card, Dropdown, FullscreenLoader, Input, Modal, Table } from "../../components";
import { ContactSelector } from "../../components/ContactSelector";
import Send from "../../icons/Send";
import { Dashboard } from "../../layouts";
import { useCampaign, useCampaignsWithEmails } from "../../lib/hooks/campaigns";
import { useAllContactsWithEvents } from "../../lib/hooks/contacts";
import { useEmailsByCampaign } from "../../lib/hooks/emails";
import { useActiveProject, useActiveProjectIdentity } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { mutate: campaignsMutate } = useCampaignsWithEmails();
  const { data: campaign, mutate: campaignMutate } = useCampaign(router.query.id as string);
  const { data: contacts } = useAllContactsWithEvents();
  const { data: emails } = useEmailsByCampaign(campaign?.id);
  const { data: projectIdentity } = useActiveProjectIdentity();

  const [confirmModal, setConfirmModal] = useState(false);
  const [delay, setDelay] = useState(0);

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

  if (!project || !campaign || !contacts || (watch("body") as string | undefined) === undefined) {
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
              <button onClick={duplicate} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M6.5 15.25V15.25C5.5335 15.25 4.75 14.4665 4.75 13.5V6.75C4.75 5.64543 5.64543 4.75 6.75 4.75H13.5C14.4665 4.75 15.25 5.5335 15.25 6.5V6.5"
                  />
                  <rect width="10.5" height="10.5" x="8.75" y="8.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" rx="2" />
                </svg>
                Duplicate
              </button>
              <button onClick={remove} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M6.75 7.75L7.59115 17.4233C7.68102 18.4568 8.54622 19.25 9.58363 19.25H14.4164C15.4538 19.25 16.319 18.4568 16.4088 17.4233L17.25 7.75"
                  />
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9.75 7.5V6.75C9.75 5.64543 10.6454 4.75 11.75 4.75H12.25C13.3546 4.75 14.25 5.64543 14.25 6.75V7.5"
                  />
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 7.75H19" />
                </svg>
                Delete
              </button>
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

            <ContactSelector
              contacts={contacts}
              disabled={campaign.status !== "DRAFT"}
              label="Recipients"
              onChange={(recipients) =>
                setValue(
                  "recipients",
                  recipients.map((r) => r.id),
                )
              }
            />
            <AnimatePresence>
              {(errors.recipients as FieldError | undefined)?.message && (
                <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                  {(errors.recipients as FieldError | undefined)?.message}
                </motion.p>
              )}
            </AnimatePresence>

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
              <EmailEditor initialValue={campaign.body} onChange={(value) => setValue("body", value)} />
              <AnimatePresence>
                {errors.body?.message && (
                  <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                    {errors.body.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className={"ml-auto mt-6 sm:flex justify-end sm:gap-x-5 sm:col-span-6"}>
              {campaign.status === "DRAFT" ? (
                <>
                  <motion.button
                    onClick={handleSubmit(sendTest)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    className={"ml-auto mt-6 flex items-center gap-x-0.5 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"}
                  >
                    <Send />
                    Send test to {project.name}'s members
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.preventDefault();
                      setConfirmModal(true);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    className={"ml-auto mt-6 flex items-center gap-x-0.5 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"}
                  >
                    <Send />
                    Save & Send
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    className={"ml-auto mt-6 flex items-center gap-x-2 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"}
                  >
                    <Save strokeWidth={1.5} size={18} />
                    Save
                  </motion.button>
                </>
              ) : null}
            </div>
          </form>
        </Card>
      </Dashboard>
    </>
  );
}
