import dayjs from "dayjs";
import { Edit2, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import { ContactForm } from "../../../components/ContactForm/ContactForm";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Modal from "../../../components/Overlay/Modal/Modal";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Table from "../../../components/Table/Table";
import Empty from "../../../components/Utility/Empty/Empty";
import { useContacts } from "../../../lib/hooks/contacts";
import { useCurrentProject } from "../../../lib/hooks/projects";

export default function Index() {
  const [query, setQuery] = useState<string>();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const project = useCurrentProject();
  const { data: contacts, size, setSize, mutate: mutateContacts, isLoading, isValidating } = useContacts();

  const hasMore = useMemo(() => {
    if (!contacts || contacts.length === 0 || isLoading || isValidating) {
      return false;
    }
    return Boolean(contacts[contacts.length - 1].cursor);
  }, [contacts, isLoading, isValidating]);

  const filterContacts = useMemo(() => {
    return (
      contacts
        ?.flatMap((c) => c.items)
        .filter((contact) => {
          let allowed = true;
          if (query) {
            allowed = allowed && (contact.email.toLowerCase().includes(query.toLowerCase()) || Object.values(contact.data).some((v) => JSON.stringify(v).toLowerCase().includes(query.toLowerCase())));
          }
          if (statusFilter !== "all") {
            return allowed && (statusFilter === "subscribed" ? contact.subscribed : !contact.subscribed);
          }
          return allowed;
        }) ?? []
    );
  }, [contacts, query, statusFilter]);

  const resetContacts = useCallback(() => {
    mutateContacts();
  }, [mutateContacts]);

  const [contactModal, setContactModal] = useState(false);

  const handleContactSuccess = () => {
    resetContacts();
    setContactModal(false);
  };

  const renderContacts = () => {
    if (!contacts) {
      return <Skeleton type={"table"} />;
    }

    if (contacts) {
      if (filterContacts.length > 0) {
        return (
          <>
            <Table
              values={filterContacts
                .sort((a, b) => {
                  const aTrigger = a.updatedAt;
                  const bTrigger = b.updatedAt;
                  return bTrigger > aTrigger ? 1 : -1;
                })
                .map((u) => {
                  return {
                    Email: u.email,
                    "Last Updated": dayjs().to(u.updatedAt).toString(),
                    Subscribed: u.subscribed,
                    Edit: (
                      <Link to={`/contacts/${u.id}`} className="transition hover:text-neutral-800" aria-label="Edit contact">
                        <Edit2 size={18} />
                      </Link>
                    ),
                  };
                })}
            />
            <nav className="flex items-center justify-between py-3" aria-label="Pagination">
              <div className="hidden sm:block">
                <p className="text-sm text-neutral-700">
                  Showing <span className="font-medium">{filterContacts.length}</span> contacts
                </p>
              </div>
              <div className="flex flex-1 justify-between gap-1 sm:justify-end">
                {hasMore && (
                  <button onClick={() => setSize(size + 1)} className={"flex w-28 items-center justify-center gap-x-0.5 rounded-sm bg-neutral-800 py-2 text-center text-sm font-medium text-white"}>
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
      <Modal isOpen={contactModal} onToggle={() => setContactModal((s) => !s)} onAction={() => {}} type={"info"} title={"Create new contact"} hideActionButtons={true}>
        <ContactForm projectId={project.id} showEmailField={true} submitButtonText="Create" onSuccess={handleContactSuccess} />
      </Modal>

      <Card
        title="Contacts"
        description="View and manage your contacts"
        actions={
          <div className="grid w-full gap-3 md:w-fit md:grid-cols-3">
            <input
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              type="search"
              placeholder="Filter contacts"
              className="rounded-sm border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
              aria-label="Filter contacts by email"
            />

            <Dropdown
              ariaLabel="Filter contacts by status"
              onChange={(v) => setStatusFilter(v)}
              values={[
                { name: "All", value: "all" },
                { name: "Subscribed", value: "subscribed" },
                { name: "Unsubscribed", value: "unsubscribed" },
              ]}
              selectedValue={statusFilter}
            />
            <BlackButton onClick={() => setContactModal(true)}>
              <Plus strokeWidth={1.5} size={18} />
              New
            </BlackButton>
          </div>
        }
      >
        {renderContacts()}
      </Card>
    </>
  );
}
