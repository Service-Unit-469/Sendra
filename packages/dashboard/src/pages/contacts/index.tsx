import { type Contact, type Trigger } from "@sendra/shared";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Edit2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, ContactForm, Dropdown, Empty, FullscreenLoader, Modal, Skeleton, Table } from "../../components";
import { Dashboard } from "../../layouts";
import { searchContacts, useContactsWithTriggers } from "../../lib/hooks/contacts";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";

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

  if (!project || !user) {
    return <FullscreenLoader />;
  }

  const handleContactSuccess = () => {
    resetContacts();
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
      <Modal isOpen={contactModal} onToggle={() => setContactModal(s => !s)} onAction={() => {}} type={"info"} title={"Create new contact"} hideActionButtons={true}>
        <ContactForm
          projectId={project.id}
          showEmailField={true}
          submitButtonText="Create"
          onSuccess={handleContactSuccess}
        />
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
                placeholder={"Search by email"}
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
