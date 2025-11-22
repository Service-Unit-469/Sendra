import { zodResolver } from "@hookform/resolvers/zod";
import type { Action, ActionCreate } from "@sendra/shared";
import { ActionSchemas } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Card from "../../../components/Card/Card";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Input from "../../../components/Input/Input/Input";
import MultiselectDropdown from "../../../components/Input/MultiselectDropdown/MultiselectDropdown";
import Toggle from "../../../components/Input/Toggle/Toggle";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useActions } from "../../../lib/hooks/actions";
import { useEventTypes } from "../../../lib/hooks/events";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { useTemplates } from "../../../lib/hooks/templates";
import { network } from "../../../lib/network";

export default function NewAction() {
  const project = useCurrentProject();
  const { mutate } = useActions();
  const { data: templates } = useTemplates();
  const { data: eventTypeData } = useEventTypes();
  const navigate = useNavigate();

  const eventTypes = useMemo(() => eventTypeData?.eventTypes ?? [], [eventTypeData]);

  const [delay, setDelay] = useState<{
    delay: number;
    unit: "MINUTES" | "HOURS" | "DAYS";
  }>({
    delay: 0,
    unit: "MINUTES",
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(ActionSchemas.create),
    defaultValues: {
      template: undefined,
      events: [],
      notevents: [],
      runOnce: false,
    },
  });

  useEffect(() => {
    switch (delay.unit) {
      case "MINUTES":
        setValue("delay", delay.delay);
        break;
      case "HOURS":
        setValue("delay", delay.delay * 60);
        break;
      case "DAYS":
        setValue("delay", delay.delay * 24 * 60);
        break;
    }
  }, [delay, setValue]);

  if (!templates || !eventTypes) {
    return <FullscreenLoader />;
  }

  const create = async (data: ActionCreate) => {
    toast.promise(network.fetch<Action, ActionCreate>(`/projects/${project.id}/actions`, { method: "POST", body: data }), {
      loading: "Creating new action",
      success: () => {
        void mutate();
        return "Created new action";
      },
      error: "Could not create new action!",
    });

    navigate("/dashboard/actions");
  };

  return (
    <Card title="Create a new action">
      <form onSubmit={handleSubmit(create)} className="mx-auto my-3 max-w-xl space-y-6">
        <Input label={"Name"} placeholder={"Onboarding Flow"} register={register("name")} error={errors.name} />

        <div>
          <label htmlFor={"events"} className="block text-sm font-medium text-neutral-700">
            Run on triggers
          </label>
          <MultiselectDropdown
            onChange={(e) => setValue("events", e)}
            values={eventTypes
              .filter((e) => !watch("notevents")?.includes(e.name))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((e) => {
                return {
                  name: e.name,
                  value: e.name,
                };
              })}
            selectedValues={watch("events")}
          />
          <AnimatePresence>
            {(errors.events as FieldError | undefined)?.message && (
              <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                {(errors.events as FieldError | undefined)?.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label htmlFor={"events"} className="block text-sm font-medium text-neutral-700">
            Exclude contacts with triggers
          </label>
          <MultiselectDropdown
            onChange={(e) => setValue("notevents", e)}
            values={eventTypes
              .filter((e) => !watch("events").includes(e.name))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((e) => {
                return {
                  name: e.name,
                  value: e.name,
                };
              })}
            selectedValues={watch("notevents")}
          />
          <AnimatePresence>
            {(errors.notevents as FieldError | undefined)?.message && (
              <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                {(errors.notevents as FieldError | undefined)?.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label htmlFor={"template"} className="block text-sm font-medium text-neutral-700">
            Template
          </label>
          <Dropdown
            onChange={(t) => setValue("template", t)}
            values={templates.map((t) => {
              return { name: t.subject, value: t.id };
            })}
            selectedValue={watch("template")}
          />
          <AnimatePresence>
            {errors.template?.message && (
              <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                {errors.template.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label htmlFor={"template"} className="block text-sm font-medium text-neutral-800">
            Delay before sending
          </label>
          <div className={"grid grid-cols-6 gap-4"}>
            <div className={"col-span-2 mt-1"}>
              <input
                type={"number"}
                autoComplete={"off"}
                min={0}
                className={"block w-full rounded-sm border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                placeholder={"0"}
                value={delay.delay}
                onChange={(e) =>
                  setDelay({
                    ...delay,
                    delay: Number.parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
            <div className={"col-span-4"}>
              <Dropdown
                onChange={(t) =>
                  setDelay({
                    ...delay,
                    unit: t as "MINUTES" | "HOURS" | "DAYS",
                  })
                }
                values={[
                  { name: "Minutes", value: "MINUTES" },
                  { name: "Hours", value: "HOURS" },
                  { name: "Days", value: "DAYS" },
                ]}
                selectedValue={delay.unit}
              />
            </div>
          </div>
        </div>

        <div>
          <Toggle
            title={"Run once"}
            description={"Toggle this on if you want to run this action only once per contact."}
            toggled={watch("runOnce") ?? false}
            onToggle={() => setValue("runOnce", !watch("runOnce"))}
          />
        </div>

        <div className={"flex justify-end gap-3"}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              navigate("/dashboard/actions");
            }}
            className={
              "flex w-fit justify-center rounded-sm border border-neutral-300 bg-white px-6 py-2 text-base font-medium text-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
            }
          >
            Cancel
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className={"flex items-center gap-x-0.5 rounded-sm bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}
          >
            <Plus size={18} />
            Create
          </motion.button>
        </div>
      </form>
    </Card>
  );
}
