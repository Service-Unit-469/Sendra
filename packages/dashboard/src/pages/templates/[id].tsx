import { zodResolver } from "@hookform/resolvers/zod";
import type { TemplateUpdate } from "@sendra/shared";
import { TemplateSchemas, type TemplateStyles } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { Save } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, Dropdown, Editor, FullscreenLoader, Input, Tooltip } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject } from "../../lib/hooks/projects";
import { useTemplate, useTemplates } from "../../lib/hooks/templates";
import { network } from "../../lib/network";
import Trash from "../../icons/Trash";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { mutate } = useTemplates();
  const { data: template } = useTemplate(router.query.id as string);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(TemplateSchemas.update),
    defaultValues: {
      body: undefined,
    },
  });

  useEffect(() => {
    if (!template) {
      return;
    }

    reset(template);
  }, [reset, template]);

  useEffect(() => {
    watch((value, { name, type }) => {
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

  if (!router.isReady) {
    return <FullscreenLoader />;
  }

  if (!project || !template || (watch("body") as string | undefined) === undefined) {
    return <FullscreenLoader />;
  }

  const update = (data: Omit<TemplateUpdate, "id">) => {
    toast.promise(
      network.fetch(`/projects/${project.id}/templates/${template.id}`, {
        method: "PUT",
        body: {
          id: template.id,
          ...data,
        },
      }),
      {
        loading: "Saving your template",
        success: () => {
          void mutate();

          return "Saved your template";
        },
        error: "Could not save your template!",
      },
    );
  };

  const duplicate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/templates`, {
        method: "POST",
        body: {
          ...template,
          id: undefined,
        },
      }),
      {
        loading: "Duplicating your template",
        success: () => {
          void mutate();
          return "Duplicated your template";
        },
        error: "Could not duplicate your template!",
      },
    );

    await router.push("/templates");
  };

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (template.actions.length > 0) {
      return toast.error("You cannot delete a template that is linked to an action!");
    }

    toast.promise(
      network.fetch(`/projects/${project.id}/templates/${template.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting your template",
        success: () => {
          void mutate();
          return "Deleted your template";
        },
        error: "Could not delete your template!",
      },
    );

    await router.push("/templates");
  };

  return (
    <Dashboard>
      <Card
        title={"Update your template"}
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
              <Trash />
              Delete
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit(update)} className="space-y-6 sm:space-y-0 sm:grid sm:gap-6 sm:grid-cols-6">
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
                        Promotional emails with a hosted unsubscribe link
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
                icon={
                  <>
                    <path d="M12 16v.01" />
                    <path d="M12 13a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
                    <circle cx="12" cy="12" r="9" />
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

          {project.verified && <Input className={"sm:col-span-3"} label={"Sender Email"} placeholder={`${project.email}`} register={register("email")} error={errors.email} />}

          {project.verified && <Input className={"sm:col-span-3"} label={"Sender Name"} placeholder={`${project.from ?? project.name}`} register={register("from")} error={errors.from} />}

          <div className={"sm:col-span-6"}>
            <Editor
              value={watch("body")}
              mode={watch("style") ?? "SIMPLE"}
              modeSwitcher
              onChange={(value, type) => {
                setValue("style", type as TemplateStyles);
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
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-2 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
              <Save strokeWidth={1.5} size={18} />
              Save
            </motion.button>
          </div>
        </form>
      </Card>
    </Dashboard>
  );
}
