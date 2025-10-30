import { zodResolver } from "@hookform/resolvers/zod";
import type { TemplateCreate } from "@sendra/shared";
import { defaultTemplate, TemplateSchemas } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, Dropdown, EmailEditor, FullscreenLoader, Input, Toggle, Tooltip } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject, useActiveProjectIdentity } from "../../lib/hooks/projects";
import { useTemplates } from "../../lib/hooks/templates";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const project = useActiveProject();
  const { mutate } = useTemplates();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(TemplateSchemas.create),
    defaultValues: {
      templateType: "MARKETING",
      subject: "",
      body: defaultTemplate,
      quickEmail: false,
    },
  });
  const { data: projectIdentity } = useActiveProjectIdentity();

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

  if (!project) {
    return <FullscreenLoader />;
  }

  const create = async (data: TemplateCreate) => {
    // Validate quickEmail templates have the quickBody token
    if (data.quickEmail && !data.body.match(/\{\{\{?quickBody\}?\}\}/)) {
      toast.error("Quick email templates must include {{quickBody}} or {{{quickBody}}} token in the body");
      return;
    }

    toast.promise(network.fetch(`/projects/${project.id}/templates`, { method: "POST", body: data }), {
      loading: "Creating new template",
      success: () => {
        void mutate();

        router.push("/templates");
        return "Created new template!";
      },
      error: "Could not create new template!",
    });
  };

  return (
    <Dashboard>
      <Card title={"Create a new template"} description={"Reusable blueprints of your emails"}>
        <form onSubmit={handleSubmit(create)} className="space-y-6 sm:space-y-0 sm:grid sm:gap-6 sm:grid-cols-6">
          <Input className={"sm:col-span-4"} label={"Subject"} placeholder={`Welcome to ${project.name}!`} register={register("subject")} error={errors.subject} />

          <div className={"sm:col-span-2"}>
            <label htmlFor={"type"} className="flex items-center text-sm font-medium text-neutral-700">
              Type
              <Tooltip
                content={
                  <>
                    <p className={"mb-2 text-base font-semibold"}>What type of email is this?</p>
                    <ul className={"list-inside"}>
                      <li className={"mb-6"}>
                        <span className={"font-semibold"}>Marketing</span>
                        <br />
                        Promotional emails with a Plunk-hosted unsubscribe link
                        <br />
                        <span className={"text-neutral-400"}>(e.g. welcome emails, promotions)</span>
                      </li>
                      <li>
                        <span className={"font-semibold"}>Transactional</span>
                        <br />
                        Mission critical emails <br />
                        <span className={"text-neutral-400"}> (e.g. email verification, password reset)</span>
                      </li>
                    </ul>
                  </>
                }
              />
            </label>
            <Dropdown
              onChange={(t) => setValue("templateType", t as "MARKETING" | "TRANSACTIONAL")}
              values={[
                { name: "Marketing", value: "MARKETING" },
                { name: "Transactional", value: "TRANSACTIONAL" },
              ]}
              selectedValue={watch("templateType") ?? ""}
            />
            <AnimatePresence>
              {errors.templateType?.message && (
                <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                  {errors.templateType.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className={"sm:col-span-6"}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Toggle
                  title="Quick Email Template"
                  description="Allow simple text input instead of MJML editor. Include {{quickBody}} or {{{quickBody}}} token in your template."
                  toggled={watch("quickEmail") ?? false}
                  onToggle={() => setValue("quickEmail", !watch("quickEmail"))}
                  className="flex-grow"
                />
                <Tooltip
                  content={
                    <>
                      <p className={"mb-2 text-base font-semibold"}>What is a Quick Email Template?</p>
                      <p className={"text-sm"}>
                        Quick email templates allow you to create campaigns with a simple text editor instead of the full MJML editor.
                        <br />
                        <br />
                        Include <code className="bg-neutral-700 px-1 rounded">{"{{quickBody}}"}</code> or <code className="bg-neutral-700 px-1 rounded">{"{{{quickBody}}}"}</code> in your template
                        where you want the campaign body to be inserted.
                      </p>
                    </>
                  }
                />
              </div>
            </div>
          </div>

          {projectIdentity?.identity?.verified && <Input className={"sm:col-span-3"} label={"Sender Email"} placeholder={`${project.email}`} register={register("email")} error={errors.email} />}

          {projectIdentity?.identity?.verified && (
            <Input className={"sm:col-span-3"} label={"Sender Name"} placeholder={`${project.from ?? project.name}`} register={register("from")} error={errors.from} />
          )}

          <div className={"sm:col-span-6"}>
            <EmailEditor
              initialValue={defaultTemplate}
              onChange={(value) => {
                setValue("body", value);
              }}
            />
            <AnimatePresence>
              {errors.body?.message && (
                <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                  {errors.body.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className={"flex justify-end gap-3 sm:col-span-6"}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                return router.push("/templates");
              }}
              className={
                "flex w-fit justify-center rounded border border-neutral-300 bg-white px-6 py-2 text-base font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              }
            >
              Cancel
            </motion.button>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
              <Plus size={18} />
              Create
            </motion.button>
          </div>
        </form>
      </Card>
    </Dashboard>
  );
}
