import { zodResolver } from "@hookform/resolvers/zod";
import { type CampaignCreate, CampaignSchemas, defaultTemplate } from "@sendra/shared";
import { EmailEditor } from "dashboard/src/components/EmailEditor";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Card, FullscreenLoader, Input } from "../../components";
import { ContactSelector } from "../../components/ContactSelector";
import { Dashboard } from "../../layouts";
import { useCampaignsWithEmails } from "../../lib/hooks/campaigns";
import { useAllContactsWithEvents } from "../../lib/hooks/contacts";
import { useActiveProject, useActiveProjectIdentity } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const project = useActiveProject();
  const { mutate } = useCampaignsWithEmails();
  const { data: contacts } = useAllContactsWithEvents();
  const { data: projectIdentity } = useActiveProjectIdentity();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(CampaignSchemas.create),
    defaultValues: {
      recipients: [],
      subject: "",
      body: defaultTemplate,
    },
  });

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

  useEffect(() => {
    if (projectIdentity?.identity?.verified) {
      setValue("email", project?.email ?? "");
      setValue("from", project?.from ?? project?.name ?? "");
    }
  }, [projectIdentity?.identity?.verified, project, setValue]);

  if (!project || !contacts) {
    return <FullscreenLoader />;
  }

  const create = async (data: CampaignCreate) => {
    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns`, {
        method: "POST",
        body: {
          ...data,
          recipients: data.recipients.length === contacts?.filter((c) => c.subscribed).length ? ["all"] : data.recipients,
        },
      }),
      {
        loading: "Creating new campaign",
        success: () => {
          void mutate();
          return "Created new campaign";
        },
        error: "Could not create new campaign!",
      },
    );

    await router.push("/campaigns");
  };

  return (
    <Dashboard>
      <Card title={"Create a new campaign"}>
        <form onSubmit={handleSubmit(create)} className="space-y-6 sm:grid sm:grid-cols-6 sm:gap-6">
          <div className={"sm:col-span-6 sm:grid sm:grid-cols-6 sm:gap-6 space-y-6 sm:space-y-0"}>
            <Input className={"sm:col-span-6"} label={"Subject"} placeholder={`Welcome to ${project.name}!`} register={register("subject")} error={errors.subject} />

            {projectIdentity?.identity?.verified && <Input className={"sm:col-span-3"} label={"Sender Email"} placeholder={`${project.email}`} register={register("email")} error={errors.email} />}

            {projectIdentity?.identity?.verified && (
              <Input className={"sm:col-span-3"} label={"Sender Name"} placeholder={`${project.from ?? project.name}`} register={register("from")} error={errors.from} />
            )}
          </div>

          <ContactSelector
            contacts={contacts}
            disabled={false}
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
            {watch("recipients").length >= 10 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={"relative z-10 sm:col-span-6"}>
                <Alert type={"info"} title={"Automatic batching"}>
                  Your campaign will be sent out in batches of 80 recipients each. It will be delivered to all contacts {dayjs().to(dayjs().add(Math.ceil(watch("recipients").length / 80), "minutes"))}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={"sm:col-span-6"}>
            <EmailEditor initialValue={defaultTemplate} onChange={(value) => setValue("body", value)} />
            <AnimatePresence>
              {errors.body?.message && (
                <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                  {errors.body.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className={"ml-auto mt-6 flex justify-end gap-3 sm:col-span-6"}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                return router.push("/campaigns");
              }}
              className={
                "flex w-fit justify-center rounded border border-neutral-300 bg-white px-6 py-2 text-base font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              }
            >
              Cancel
            </motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5.75V18.25" />
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.25 12L5.75 12" />
              </svg>
              Create
            </motion.button>
          </div>
        </form>
      </Card>
    </Dashboard>
  );
}
