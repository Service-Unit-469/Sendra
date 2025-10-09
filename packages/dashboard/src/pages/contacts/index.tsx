import { zodResolver } from "@hookform/resolvers/zod";
import { type Contact, type ContactCreate, ContactSchemas, type Trigger } from "@sendra/shared";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { Edit2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Card, Dropdown, Empty, FullscreenLoader, Modal, Skeleton, Table, Toggle } from "../../components";
import { Dashboard } from "../../layouts";
import { searchContacts, useContactsWithTriggers } from "../../lib/hooks/contacts";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";
import Trash from "../../icons/Trash";

/**
 *
 */
export default function Index() {
  const [cursor, setCursor] = useState<string>();
  const [query, setQuery] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const project = useActiveProject();
  const { data: user } = useUser();
  const { data: contacts, mutate: mutateContacts } = useContactsWithTriggers(cursor);
  const { data: search } = searchContacts(query);

  const [allContacts, setAllContacts] = useState<(Contact & { triggers: Trigger[] })[]>([]);

  useEffect(() => {
    if (contacts) {
      setAllContacts((current) => [...(current ?? []), ...contacts.items]);
    }
  }, [contacts]);

  const resetContacts = useCallback(() => {
    setAllContacts([]);
    setCursor(undefined);
    mutateContacts();
  }, [mutateContacts]);

  const [contactModal, setContactModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(ContactSchemas.create),
    defaultValues: {
      data: {},
      subscribed: true,
    },
  });

  const {
    register: dataRegister,
    control,
    getValues: getDataValues,
    reset: dataReset,
  } = useForm({
    resolver: zodResolver(
      z.object({
        data: z
          .array(
            z.object({
              value: z.object({ key: z.string(), value: z.string() }),
            }),
          )
          .min(0),
      }),
    ),
    defaultValues: {
      data: [{ value: { key: "", value: "" } }],
    },
  });

  const { fields, append: fieldAppend, remove: fieldRemove } = useFieldArray({ control, name: "data" });

  if (!project || !user) {
    return <FullscreenLoader />;
  }

  const create = (data: ContactCreate) => {
    const entries = getDataValues().data.map(({ value }) => [value.key, value.value]);
    let dataObject = {};

    entries.forEach(([key, value]) => {
      Object.assign(dataObject, { [key]: value });
    });

    dataObject = Object.fromEntries(Object.entries(dataObject).filter(([, value]) => value !== ""));

    toast.promise(
      network.fetch(`/projects/${project.id}/contacts`, {
        method: "POST",
        body: {
          ...data,
          data: dataObject,
        },
      }),
      {
        loading: "Creating new contact",
        success: () => {
          resetContacts();
          return "Created new contacts";
        },
        error: "Could not create new contact!",
      },
    );

    reset();
    dataReset();

    setContactModal(false);
  };

  const renderContacts = () => {
    if (!allContacts && !search) {
      return <Skeleton type={"table"} />;
    }

    if (query && !search) {
      return <Skeleton type={"table"} />;
    }

    if (search && query !== undefined) {
      const filtered = search.contacts.filter((c) => (statusFilter === "all" ? true : statusFilter === "subscribed" ? c.subscribed : !c.subscribed));

      if (filtered.length > 0) {
        return (
          <Table
            values={filtered
              .sort((a, b) => {
                const aTrigger = a.triggers.length > 0 ? a.triggers.sort()[0].createdAt : a.createdAt;

                const bTrigger = b.triggers.length > 0 ? b.triggers.sort()[0].createdAt : b.createdAt;

                return bTrigger > aTrigger ? 1 : -1;
              })
              .map((u) => {
                return {
                  Email: u.email,
                  "Last Activity": dayjs()
                    .to(
                      [...u.triggers, ...u.emails].length > 0
                        ? [...u.triggers, ...u.emails].sort((a, b) => {
                          return a.createdAt > b.createdAt ? -1 : 1;
                        })[0].createdAt
                        : u.createdAt,
                    )
                    .toString(),
                  Subscribed: u.subscribed,
                  Edit: (
                    <Link href={`/contacts/${u.id}`} className={"transition hover:text-neutral-800"}>
                      <Edit2 size={18} />
                    </Link>
                  ),
                };
              })}
          />
        );
      }
      return (
        <Empty
          icon={
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19.25 19.25L15.5 15.5M4.75 11C4.75 7.54822 7.54822 4.75 11 4.75C14.4518 4.75 17.25 7.54822 17.25 11C17.25 14.4518 14.4518 17.25 11 17.25C7.54822 17.25 4.75 14.4518 4.75 11Z"
              />
            </svg>
          }
          title={"No contacts found"}
          description={`Your query ${query} did not return any contacts`}
        />
      );
    }

    if (allContacts) {
      const filtered = allContacts.filter((c) => (statusFilter === "all" ? true : statusFilter === "subscribed" ? c.subscribed : !c.subscribed));

      if (filtered.length > 0) {
        return (
          <>
            <Table
              values={filtered
                .sort((a, b) => {
                  const aTrigger = a.triggers.length > 0 ? a.triggers.sort()[0].createdAt : a.createdAt;

                  const bTrigger = b.triggers.length > 0 ? b.triggers.sort()[0].createdAt : b.createdAt;

                  return bTrigger > aTrigger ? 1 : -1;
                })
                .map((u) => {
                  return {
                    Email: u.email,
                    "Last Activity": dayjs()
                      .to(
                        u.triggers.length > 0
                          ? u.triggers.sort((a, b) => {
                            return a.createdAt > b.createdAt ? -1 : 1;
                          })[0].createdAt
                          : u.createdAt,
                      )
                      .toString(),
                    Subscribed: u.subscribed,
                    Edit: (
                      <Link href={`/contacts/${u.id}`} className={"transition hover:text-neutral-800"}>
                        <Edit2 size={18} />
                      </Link>
                    ),
                  };
                })}
            />
            <nav className="flex items-center justify-between py-3" aria-label="Pagination">
              <div className="hidden sm:block">
                <p className="text-sm text-neutral-700">
                  Showing <span className="font-medium">{allContacts.length}</span> contacts
                </p>
              </div>
              <div className="flex flex-1 justify-between gap-1 sm:justify-end">
                {contacts?.cursor && (
                  <button
                    onClick={() => setCursor(contacts.cursor)}
                    className={"flex w-28 items-center justify-center gap-x-0.5 rounded bg-neutral-800 py-2 text-center text-sm font-medium text-white"}
                  >
                    Load More
                  </button>
                )}
              </div>
            </nav>
          </>
        );
      }
      return <Empty title={"No contacts"} description={"New contacts will automatically be added when they trigger an event"} />;
    }
  };

  return (
    <>
      <Modal isOpen={contactModal} onToggle={() => setContactModal(!contactModal)} onAction={handleSubmit(create)} type={"info"} action={"Create"} title={"Create new contact"}>
        <div>
          <label htmlFor={"email"} className="block text-sm font-medium text-neutral-700">
            Email
          </label>
          <div className="mt-1">
            <input
              type={"text"}
              autoComplete={"off"}
              className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
              placeholder={"hello@email.com"}
              {...register("email")}
            />
          </div>
          <AnimatePresence>
            {errors.email?.message && (
              <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className={"my-6"}>
          <div className={"grid sm:col-span-2"}>
            <div className={"grid items-center gap-3 sm:grid-cols-9"}>
              <label htmlFor={"data"} className="block text-sm font-medium text-neutral-700 sm:col-span-8">
                Metadata
              </label>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  fieldAppend({ value: { key: "", value: "" } });
                }}
                className={
                  "ml-auto flex w-full items-center justify-center gap-x-0.5 rounded border border-neutral-200 bg-white py-1 text-center text-sm text-neutral-700 transition ease-in-out hover:bg-neutral-50 sm:col-span-1"
                }
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 5.75V18.25" />
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.25 12L5.75 12" />
                </svg>
              </button>
            </div>

            {fields.length > 0 ? (
              fields.map((field, index) => {
                return (
                  <div key={field.id}>
                    <div className="grid w-full grid-cols-9 items-end gap-3">
                      <div className={"col-span-4"}>
                        <label htmlFor={"data"} className="text-xs font-light">
                          Key
                        </label>
                        <input
                          type={"text"}
                          placeholder={"Key"}
                          className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                          key={field.id}
                          {...dataRegister(`data.${index}.value.key`)}
                        />
                      </div>
                      <div className={"col-span-4"}>
                        <label htmlFor={"data"} className="text-xs font-light">
                          Value
                        </label>
                        <input
                          type={"text"}
                          placeholder={"Value"}
                          className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                          key={field.id}
                          {...dataRegister(`data.${index}.value.value`)}
                        />
                      </div>
                      <button
                        className={"col-span-1 flex h-10 items-center justify-center rounded bg-red-100 text-sm text-red-800 transition hover:bg-red-200"}
                        onClick={(e) => {
                          e.preventDefault();
                          fieldRemove(index);
                        }}
                      >
                        <Trash />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className={"text-sm text-neutral-500"}>No fields added</p>
            )}
          </div>
          <AnimatePresence>
            {(errors.data as FieldError | undefined)?.message && (
              <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                {(errors.data as FieldError | undefined)?.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className={"mt-3"}>
          <Toggle
            title={"Subscribed"}
            description={watch("subscribed") ? "This contact has opted-in to receive marketing emails" : "This contact prefers not to receive marketing emails"}
            toggled={watch("subscribed") ?? false}
            onToggle={() => setValue("subscribed", !watch("subscribed"))}
          />
        </div>
      </Modal>
      <Dashboard>
        <Card
          title={"Contacts"}
          description={"View and manage your contacts"}
          actions={
            <div className={"grid w-full gap-3 md:w-fit md:grid-cols-3"}>
              <input
                onChange={(e) => setQuery(e.target.value)}
                autoComplete={"off"}
                type="search"
                placeholder={"Search email or metadata"}
                className={"rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
              />

              <Dropdown
                onChange={(v) => setStatusFilter(v)}
                values={[
                  { name: "All", value: "all" },
                  { name: "Subscribed", value: "subscribed" },
                  { name: "Unsubscribed", value: "unsubscribed" },
                ]}
                selectedValue={statusFilter}
              />

              <motion.button
                onClick={() => setContactModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className={"flex items-center justify-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}
              >
                <Plus strokeWidth={1.5} size={18} />
                New
              </motion.button>
            </div>
          }
        >
          {renderContacts()}
        </Card>
      </Dashboard>
    </>
  );
}
