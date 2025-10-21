import { zodResolver } from "@hookform/resolvers/zod";
import type { TemplateCreate } from "@sendra/shared";
import { TemplateSchemas } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { CircleHelp, Plus } from "lucide-react";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, Dropdown, FullscreenLoader, Input, Tooltip } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject } from "../../lib/hooks/projects";
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
  } = useForm({
    resolver: zodResolver(TemplateSchemas.create),
    defaultValues: {
      templateType: "MARKETING",
      subject: "",
      body: "",
      channel: "SMS",
    },
  });


  if (!project) {
    return <FullscreenLoader />;
  }

  const create = async (data: TemplateCreate) => {
    toast.promise(network.fetch(`/projects/${project.id}/templates`, { method: "POST", body: data }), {
      loading: "Creating new template",
      success: () => {
        void mutate();

        return "Created new template!";
      },
      error: "Could not create new template!",
    });

    await router.push("/templates");
  };

  return (
    <Dashboard>
      <Card title="Create a new SMS template" description="Reusable blueprints of your SMS messages">
        <form onSubmit={handleSubmit(create)} className="space-y-6 sm:space-y-0 sm:grid sm:gap-6 sm:grid-cols-6">
          <Input className="sm:col-span-4" label="Subject" placeholder={`Welcome to ${project.name}!`} register={register("subject")} error={errors.subject} />

          <div className="sm:col-span-2">
            <label htmlFor="type" className="flex items-center text-sm font-medium text-neutral-700">
              Type
              <Tooltip
                content={
                  <>
                    <p className="mb-2 text-base font-semibold">What type of SMS is this?</p>
                    <ul className="list-inside">
                      <li className={"mb-6"}>
                        <span className="font-semibold">Marketing</span>
                        <br />
                        Promotional texts with a Sendra-hosted unsubscribe link
                        <br />
                        <span className="text-neutral-400">(e.g. welcome texts, promotions)</span>
                      </li>
                      <li>
                        <span className="font-semibold">Transactional</span>
                        <br />
                        Mission critical texts <br />
                        <span className="text-neutral-400"> (e.g. email verification, password reset)</span>
                      </li>
                    </ul>
                  </>
                }
                icon={<CircleHelp />}
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
            <textarea className="w-full rounded-md border border-neutral-300 p-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2" rows={10} placeholder="Your SMS template here" {...register("body")} />
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
              <Plus />
              Create
            </motion.button>
          </div>
        </form>
      </Card>
    </Dashboard>
  );
}
