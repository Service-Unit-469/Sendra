import { zodResolver } from "@hookform/resolvers/zod";
import type { Email, Event } from "@sendra/shared";
import { EventSchemas } from "@sendra/shared";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { Mail, TerminalSquare, Trash, Workflow } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Badge from "../../../components/Badge/Badge";
import { MenuButton } from "../../../components/Buttons/MenuButton";
import Card from "../../../components/Card/Card";
import { ContactForm } from "../../../components/ContactForm/ContactForm";
import Input from "../../../components/Input/Input/Input";
import ThreeColMetricsSummary from "../../../components/Metrics/ThreeColMetricsSummary";
import Modal from "../../../components/Overlay/Modal/Modal";
import Empty from "../../../components/Utility/Empty/Empty";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useContact } from "../../../lib/hooks/contacts";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

type JourneyItemProps = {
  icon: React.ReactNode;
  title: string;
  item: Email | Event;
  detail: React.ReactNode;
  selectedItemId: string | null;
  supportsExpansion?: boolean;
  setSelectedItemId: (id: string | null) => void;
};

const LabeledItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="font-semibold text-neutral-700 w-20">{label}</span>
    <span className="text-neutral-800">{value}</span>
  </div>
);

const JourneyItem = ({ icon, title, item, detail, selectedItemId, supportsExpansion = true, setSelectedItemId }: JourneyItemProps) => {
  const expanded = selectedItemId === item.id;
  return (
    <li key={item.id} className="mb-8">
      <div className="relative flex space-x-3">
        <div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">{icon}</span>
        </div>
        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
          <div className="relative">
            <p className={`text-sm text-neutral-500 ${supportsExpansion ? "cursor-pointer" : ""}`} onClick={() => supportsExpansion && setSelectedItemId(expanded ? null : item.id)}>
              {title}
            </p>
          </div>
          <div className="whitespace-nowrap text-right text-sm text-neutral-500">
            <time dateTime={dayjs(item.createdAt).format("YYYY-MM-DD")}>{dayjs().to(item.createdAt)}</time>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 mb-2 ml-10 rounded-sm border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <div className="space-y-4">{detail}</div>
        </div>
      )}
    </li>
  );
};

export default function ContactDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [eventModal, setEventModal] = useState(false);
  const project = useCurrentProject();
  const { data: contact, mutate } = useContact(id ?? "");

  const {
    register: eventRegister,
    handleSubmit: eventHandleSubmit,
    formState: { errors: eventErrors },
    reset: eventReset,
  } = useForm({
    resolver: zodResolver(EventSchemas.track.pick({ event: true })),
  });

  if (!contact) {
    return <FullscreenLoader />;
  }

  const create = (data: { event: string }) => {
    toast.promise(
      network.fetch(`/projects/${project?.id}/track`, {
        method: "POST",
        body: {
          ...data,
          email: contact.email,
        },
      }),
      {
        loading: "Creating new event",
        success: () => {
          void mutate();
          eventReset();
          return "Created new event";
        },
        error: "Could not create new event!",
      },
    );

    setEventModal(false);
  };

  const handleContactUpdateSuccess = () => {
    void mutate();
  };

  // Calculate metrics
  const totalEmails = contact._embed.emails.length;
  const openedEmails = contact._embed.emails.filter((email) => email.status === "OPENED").length;
  const clickEvents = contact._embed.events.filter((event) => event.eventType === "email.click");
  const uniqueClickedEmails = new Set(clickEvents.filter((event) => event.email).map((event) => event.email)).size;
  const openRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;
  const clickRate = totalEmails > 0 ? (uniqueClickedEmails / totalEmails) * 100 : 0;

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/contacts/${contact.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting contact",
        success: "Deleted contact",
        error: "Could not delete contact!",
      },
    );

    navigate("/contacts");
  };

  return (
    <>
      <Modal
        isOpen={eventModal}
        onToggle={() => setEventModal(!eventModal)}
        onAction={eventHandleSubmit(create)}
        type="info"
        action="Trigger"
        title="Trigger event"
        description={`Trigger an event for ${contact.email}`}
        icon={<TerminalSquare />}
      >
        <Input register={eventRegister("event")} label={"Event"} placeholder={"signup"} error={eventErrors.event} />
      </Modal>
      <Card
        title={""}
        options={
          <>
            <MenuButton onClick={() => setEventModal(true)}>
              <TerminalSquare size={18} />
              Trigger event
            </MenuButton>
            <MenuButton onClick={remove}>
              <Trash size={18} />
              Delete
            </MenuButton>
          </>
        }
      >
        <div className="space-y-6">
          <div className={"flex items-center gap-6"}>
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
              <span className="text-xl font-semibold leading-none text-neutral-800">{contact.email[0].toUpperCase()}</span>
            </span>
            <h1 className={"text-2xl font-semibold text-neutral-800"}>
              {contact.email[0].toUpperCase()}
              {contact.email.slice(1)}
            </h1>
          </div>

          <ContactForm
            projectId={project.id}
            contactId={contact.id}
            onSuccess={handleContactUpdateSuccess}
            initialData={{
              email: contact.email,
              subscribed: contact.subscribed,
              data: contact.data,
            }}
            showEmailField={false}
            submitButtonText="Save"
          />
        </div>
      </Card>
      <Card title="Metrics Summary">
        <ThreeColMetricsSummary
          metrics={[
            { label: "Emails Sent", value: totalEmails },
            { label: "Open Rate", value: openRate },
            { label: "Click Rate", value: clickRate },
          ]}
        />
      </Card>
      <Card title={"Journey"}>
        {contact._embed.events.length > 0 || contact._embed.emails.length > 0 ? (
          <div className="scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full flow-root h-96 max-h-96 overflow-y-auto pr-6">
            <ul className="-mb-8">
              {[...contact._embed.events, ...contact._embed.emails]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((t) => {
                  if ("messageId" in t) {
                    return (
                      <JourneyItem
                        key={t.id}
                        icon={<Mail size={18} />}
                        selectedItemId={selectedItemId}
                        setSelectedItemId={setSelectedItemId}
                        title={`Email "${t.subject}" delivered`}
                        item={t}
                        detail={
                          <>
                            <LabeledItem
                              label="Status"
                              value={
                                <Badge type="info">
                                  <span className={"capitalize"}>{t.status.toLowerCase()}</span>
                                </Badge>
                              }
                            />
                            <LabeledItem label="Sent" value={dayjs(t.createdAt).format("YYYY-MM-DD HH:mm")} />
                            <LabeledItem
                              label="Body"
                              value={
                                <div
                                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t.body.html) }}
                                  className="rounded-sm bg-white p-3 text-neutral-800 whitespace-pre-line max-h-64 overflow-y-auto w-full"
                                />
                              }
                            />
                          </>
                        }
                      />
                    );
                  }
                  if ("eventType" in t) {
                    return (
                      <JourneyItem
                        key={t.id}
                        icon={<Workflow size={18} />}
                        title={`${t.eventType} triggered`}
                        item={t}
                        detail={
                          <>
                            {t.relationType && (
                              <LabeledItem
                                label="Related"
                                value={t.relationType === "ACTION" ? <Link to={`/actions/${t.relation}`}>Related Action</Link> : <Link to={`/campaigns/${t.relation}`}>Related Campaign</Link>}
                              />
                            )}
                            {t.data &&
                              Object.entries(t.data).map(([key, value]) => (
                                <LabeledItem key={key} label={key} value={typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? "")} />
                              ))}
                          </>
                        }
                        selectedItemId={selectedItemId}
                        supportsExpansion={Boolean(t.relationType || (t.data && Object.keys(t.data).length > 0))}
                        setSelectedItemId={setSelectedItemId}
                      />
                    );
                  }
                  return null;
                })}
            </ul>
          </div>
        ) : (
          <Empty title="No triggers" description="This contact has not yet triggered any events or actions" />
        )}
      </Card>
    </>
  );
}
