import { zodResolver } from "@hookform/resolvers/zod";
import type { Email } from "@sendra/shared";
import { EventSchemas } from "@sendra/shared";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { Mail, TerminalSquare, Trash, Workflow } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Badge from "../../../components/Badge/Badge";
import { MenuButton } from "../../../components/Buttons/MenuButton";
import Card from "../../../components/Card/Card";
import { ContactForm } from "../../../components/ContactForm/ContactForm";
import Input from "../../../components/Input/Input/Input";
import Modal from "../../../components/Overlay/Modal/Modal";
import Empty from "../../../components/Utility/Empty/Empty";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useContact } from "../../../lib/hooks/contacts";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

export default function ContactDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
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

    navigate("/dashboard/contacts");
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
      <Card title={"Journey"}>
        {contact._embed.events.length > 0 || contact._embed.emails.length > 0 ? (
          <div className="scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full flow-root h-96 max-h-96 overflow-y-auto pr-6">
            <ul className="-mb-8">
              {[...contact._embed.events, ...contact._embed.emails]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((t, index) => {
                  if ("messageId" in t) {
                    const email = t as Email;
                    const expanded = selectedEmail?.id === email.id;

                    return (
                      <li key={email.id} className="mb-8">
                        {contact._embed.events.length + contact._embed.emails.length - 1 !== index && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
                              <Mail size={18} />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div className="relative">
                              <p className="text-sm text-neutral-500 cursor-pointer" onClick={() => setSelectedEmail(expanded ? null : email)}>
                                Email "{email.subject}" delivered
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-neutral-500">
                              <time dateTime={dayjs(t.createdAt).format("YYYY-MM-DD")}>{dayjs().to(t.createdAt)}</time>
                            </div>
                          </div>
                        </div>
                        {/* Expanded panel for all screen sizes */}
                        {expanded && (
                          <div className="mt-4 mb-2 ml-10 rounded-sm border border-neutral-200 bg-neutral-50 p-4 text-sm">
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-700 w-20">Status</span>
                                <Badge type={"info"}>
                                  <span className={"capitalize"}>{email.status.toLowerCase()}</span>
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-700 w-20">Sent</span>
                                <span className="text-neutral-800">{dayjs(email.createdAt).format("YYYY-MM-DD HH:mm")}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-neutral-700 block mb-1">Body</span>
                                <div
                                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
                                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body.html) }}
                                  className="rounded-sm bg-white p-3 text-neutral-800 whitespace-pre-line max-h-64 overflow-y-auto"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  }

                  if ("eventType" in t) {
                    return (
                      <li className="mb-8" key={t.id}>
                        <div className="relative pb-8">
                          {contact._embed.events.length + contact._embed.emails.length - 1 !== index && (
                            <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
                          )}

                          <div className="relative flex space-x-3">
                            <div>
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
                                <Workflow size={18} />
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm text-neutral-500">{t.eventType} triggered</p>
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-neutral-500">
                                <time dateTime={dayjs(t.createdAt).format("YYYY-MM-DD")}>{dayjs().to(t.createdAt)}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
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
