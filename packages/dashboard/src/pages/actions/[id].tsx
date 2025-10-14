import { zodResolver } from "@hookform/resolvers/zod";
import { ActionSchemas, type ActionUpdate } from "@sendra/shared";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Save, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge, Card, Dropdown, Empty, FullscreenLoader, Input, MultiselectDropdown, Toggle } from "../../components";
import { Dashboard } from "../../layouts";
import { useAction, useActions, useRelatedActions } from "../../lib/hooks/actions";
import { useEventTypes } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import { useTemplates } from "../../lib/hooks/templates";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { mutate } = useActions();
  const { data: templates } = useTemplates();
  const { data: eventTypes } = useEventTypes();
  const { data: action } = useAction(router.query.id as string);
  const { data: related } = useRelatedActions(router.query.id as string);

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
    watch,
    reset,
    setValue,
  } = useForm({
    defaultValues: { events: [], notevents: [], name: "", template: "", delay: 0, runOnce: false },
    resolver: zodResolver(ActionSchemas.update.omit({ id: true })),
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

  useEffect(() => {
    if (!action) {
      return;
    }

    if (action.delay !== 0) {
      if (action.delay % 1440 === 0) {
        setDelay({ unit: "DAYS", delay: action.delay / 1440 });
      } else if (action.delay % 60 === 0) {
        setDelay({ unit: "HOURS", delay: action.delay / 60 });
      } else {
        setDelay({ unit: "MINUTES", delay: action.delay });
      }
    }

    reset({
      ...action,
      template: action.template,
      delay: 0,
      events: action.events,
      notevents: action.notevents,
    });
  }, [reset, action]);

  if (!router.isReady) {
    return <FullscreenLoader />;
  }

  if (!project || !action || !templates || !eventTypes || !related) {
    return <FullscreenLoader />;
  }

  const updateAction = (data: Omit<ActionUpdate, "id">) => {
    toast.promise(
      network.fetch(`/projects/${project.id}/actions/${action.id}`, {
        method: "PUT",
        body: {
          ...data,
          id: action.id,
        },
      }),
      {
        loading: "Saving your action",
        success: () => {
          void mutate();
          return "Saved your action";
        },
        error: "Could not save your action!",
      },
    );
  };

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(network.fetch(`/projects/${project.id}/actions/${action.id}`, { method: "DELETE" }), {
      loading: "Deleting your action",
      success: () => {
        void mutate();
        return "Deleted your action";
      },
      error: "Could not delete your action!",
    });

    await router.push("/actions");
  };

  return (
    <Dashboard>
      <Card
        title={"Edit your action"}
        actions={
          <button onClick={remove} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-800 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1}>
            <Trash />
            Delete
          </button>
        }
      >
        <form onSubmit={handleSubmit(updateAction)} className="mx-auto my-3 max-w-xl space-y-6">
          <Input label={"Name"} placeholder={"Onboarding Flow"} register={register("name")} error={errors.name} />

          <div>
            <label htmlFor={"events"} className="block text-sm font-medium text-neutral-800">
              Run on triggers
            </label>
            <MultiselectDropdown
              onChange={(e) => setValue("events", e)}
              values={eventTypes
                .filter((e) => !watch("notevents")?.includes(e.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((e) => {
                  return {
                    name: e.name,
                    value: e.id,
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
            <label htmlFor={"events"} className="block text-sm font-medium text-neutral-800">
              Exclude contacts with events
            </label>
            <MultiselectDropdown
              onChange={(e) => setValue("notevents", e)}
              values={eventTypes
                .filter((e) => !watch("events").includes(e.id))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((e) => {
                  return {
                    name: e.name,
                    value: e.id,
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
            <label htmlFor={"template"} className="block text-sm font-medium text-neutral-800">
              Template
            </label>
            <div className={"grid gap-6 sm:grid-cols-6"}>
              <div className={"sm:col-span-4"}>
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
              <Link href={`/templates/${action.template}`} passHref className={"sm:col-span-2"}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  className={"flex h-full w-full items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white text-center text-sm font-medium text-neutral-800"}
                >
                  <svg className={"h-5 w-5"} fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M4.75 19.25L9 18.25L18.2929 8.95711C18.6834 8.56658 18.6834 7.93342 18.2929 7.54289L16.4571 5.70711C16.0666 5.31658 15.4334 5.31658 15.0429 5.70711L5.75 15L4.75 19.25Z"
                    />
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.25 19.25H13.75" />
                  </svg>
                  Edit
                </motion.button>
              </Link>
            </div>
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
                  className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
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
                return router.push("/actions");
              }}
              className={
                "flex w-fit justify-center rounded border border-neutral-300 bg-white px-6 py-2 text-base font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
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
      <Card title={"Related Actions"}>
        <div className={"grid gap-3 sm:grid-cols-2"}>
          {related.length > 0 ? (
            related
              .sort((a, b) => {
                if (a.delay < b.delay) {
                  return -1;
                }
                if (a.delay > b.delay) {
                  return 1;
                }
                return 0;
              })
              .map((r) => {
                return (
                  <Link href={`/actions/${r.id}`} key={r.id}>
                    <div className={"flex items-center gap-6 rounded border border-solid border-neutral-200 bg-white px-8 py-4"}>
                      <div>
                        <span className="inline-flex rounded bg-neutral-100 p-4 text-neutral-800 ring-4 ring-white">
                          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeWidth={"1.5"} d="M16 21h3c.81 0 1.48 -.67 1.48 -1.48l.02 -.02c0 -.82 -.69 -1.5 -1.5 -1.5h-3v3z" />
                            <path strokeWidth={"1.5"} d="M16 15h2.5c.84 -.01 1.5 .66 1.5 1.5s-.66 1.5 -1.5 1.5h-2.5v-3z" />
                            <path strokeWidth={"1.5"} d="M4 9v-4c0 -1.036 .895 -2 2 -2s2 .964 2 2v4" />
                            <path strokeWidth={"1.5"} d="M2.99 11.98a9 9 0 0 0 9 9m9 -9a9 9 0 0 0 -9 -9" />
                            <path strokeWidth={"1.5"} d="M8 7h-4" />
                          </svg>
                        </span>
                      </div>
                      <div className={"text-sm"}>
                        <p className={"text-base font-semibold leading-tight text-neutral-800"}>{r.name}</p>
                        <p className={"text-neutral-500"}>
                          Runs after {r.events.filter((e) => action.events.filter((a) => a === e).length > 0).map((e) => eventTypes.find((event) => event.id === e)?.name)} and{" "}
                          {
                            r.events.filter((e) => {
                              return action.events.filter((a) => a === e).length === 0;
                            }).length
                          }{" "}
                          other events
                        </p>
                        <div className={"mt-1"}>
                          {r.delay === action.delay ? (
                            <Badge type={"info"}>Same delay</Badge>
                          ) : r.delay > action.delay ? (
                            <Badge type={"info"}>{`${dayjs.duration(r.delay - action.delay, "minutes").humanize()} after this action`}</Badge>
                          ) : (
                            <Badge type={"info"}>{`${dayjs.duration(action.delay - r.delay, "minutes").humanize()} before this action`}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
          ) : (
            <div className={"sm:col-span-3"}>
              <Empty title={"No related actions"} description={"Easy access to all actions that share events"} />
            </div>
          )}
        </div>
      </Card>
    </Dashboard>
  );
}
