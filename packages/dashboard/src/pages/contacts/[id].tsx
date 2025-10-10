// @ts-nocheck
// React Hook Form messes up our types, ignore the entire file

import { zodResolver } from "@hookform/resolvers/zod";
import type { Email } from "@sendra/shared";
import { EventSchemas } from "@sendra/shared";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import { Trash } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge, Card, ContactForm, Empty, FullscreenLoader, Input, Modal } from "../../components";
import Trigger from "../../icons/Trigger";
import { Dashboard } from "../../layouts";
import { useContact } from "../../lib/hooks/contacts";
import { useActiveProject } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

export default function Index() {
  const router = useRouter();
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [eventModal, setEventModal] = useState(false);
  const project = useActiveProject();
  const { data: contact, mutate } = useContact(router.query.id as string);

  const {
    register: eventRegister,
    handleSubmit: eventHandleSubmit,
    formState: { errors: eventErrors },
    reset: eventReset,
  } = useForm<EventValues>({
    resolver: zodResolver(EventSchemas.track.pick({ event: true })),
  });

  if (!contact || !router.isReady) {
    return <FullscreenLoader />;
  }

  const create = (data: EventValues) => {
    toast.promise(
      network.fetch(`/projects/${project.id}/track`, {
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

    await router.push("/contacts");
  };

  return (
    <>
      <Modal
        isOpen={eventModal}
        onToggle={() => setEventModal(!eventModal)}
        onAction={eventHandleSubmit(create)}
        type={"info"}
        action={"Trigger"}
        title={"Trigger event"}
        description={`Trigger an event for ${contact.email}`}
        icon={<Trigger />}
      >
        <Input register={eventRegister("event")} label={"Event"} placeholder={"signup"} error={eventErrors.event} />
      </Modal>
      <Dashboard>
        <Card
          title={""}
          options={
            <>
              <button onClick={() => setEventModal(true)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1}>
                <Trigger />
                Trigger event
              </button>
              <button onClick={remove} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1}>
                <Trash />
                Delete
              </button>
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
          {contact.triggers.length > 0 || contact.emails.length > 0 ? (
            <div className="scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 scrollbar-thumb-rounded-full scrollbar-track-rounded-full flow-root h-96 max-h-96 overflow-y-auto pr-6">
              <ul className="-mb-8">
                {[...contact.triggers, ...contact.emails]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((t, index) => {
                    if (t.messageId) {
                      const email = t as Email;
                      const expanded = selectedEmail?.id === email.id;

                      return (
                        <li key={email.id} className="mb-8">
                          {contact.triggers.length + contact.emails.length - 1 !== index && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
                                <svg
                                  className={"h-5 w-5"}
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  strokeWidth="1.5"
                                  stroke="currentColor"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                  <rect x="3" y="5" width="18" height="14" rx="2" />
                                  <polyline points="3 7 12 13 21 7" />
                                </svg>
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div className="relative">
                                <p className="text-sm text-neutral-500 cursor-pointer" onClick={() => setSelectedEmail(expanded ? null : email)}>
                                  Transactional email {email.subject} delivered
                                </p>
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-neutral-500">
                                <time dateTime={dayjs(t.createdAt).format("YYYY-MM-DD")}>{dayjs().to(t.createdAt)}</time>
                              </div>
                            </div>
                          </div>
                          {/* Expanded panel for all screen sizes */}
                          {expanded && (
                            <div className="mt-4 mb-2 ml-10 rounded border border-neutral-200 bg-neutral-50 p-4 text-sm">
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
                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.body) }}
                                    className="rounded bg-white p-3 text-neutral-800 whitespace-pre-line max-h-64 overflow-y-auto"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    }

                    if (t.action) {
                      return (
                        <li className="mb-8" key={t.id}>
                          <div className="relative pb-8">
                            {contact.triggers.length + contact.emails.length - 1 !== index && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />}

                            <div className="relative flex space-x-3">
                              <div>
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
                                  <svg
                                    className={"h-5 w-5"}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M16 21h3c.81 0 1.48 -.67 1.48 -1.48l.02 -.02c0 -.82 -.69 -1.5 -1.5 -1.5h-3v3z" />
                                    <path d="M16 15h2.5c.84 -.01 1.5 .66 1.5 1.5s-.66 1.5 -1.5 1.5h-2.5v-3z" />
                                    <path d="M4 9v-4c0 -1.036 .895 -2 2 -2s2 .964 2 2v4" />
                                    <path d="M2.99 11.98a9 9 0 0 0 9 9m9 -9a9 9 0 0 0 -9 -9" />
                                    <path d="M8 7h-4" />
                                  </svg>
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                <div>
                                  <p className="text-sm text-neutral-500">{t.action.name} triggered</p>
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

                    if (t.event) {
                      return (
                        <li className="mb-8" key={t.id}>
                          <div className="relative pb-8">
                            {contact.triggers.length + contact.emails.length - 1 !== index && <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-800 ring-8 ring-white">
                                  {t.event.template ? (
                                    <svg
                                      className={"h-5 w-5"}
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      strokeWidth="1.5"
                                      stroke="currentColor"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      {t.event.name.includes("delivered") ? (
                                        <>
                                          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                          <rect x="3" y="5" width="18" height="14" rx="2" />
                                          <polyline points="3 7 12 13 21 7" />
                                        </>
                                      ) : (
                                        <>
                                          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                          <polyline points="3 9 12 15 21 9 12 3 3 9" />
                                          <path d="M21 9v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" />
                                          <line x1="3" y1="19" x2="9" y2="13" />
                                          <line x1="15" y1="13" x2="21" y2="19" />
                                        </>
                                      )}
                                    </svg>
                                  ) : t.event.campaign ? (
                                    <svg
                                      className={"h-5 w-5"}
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      strokeWidth="1.5"
                                      stroke="currentColor"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M13 5h8" />
                                      <path d="M13 9h5" />
                                      <path d="M13 15h8" />
                                      <path d="M13 19h5" />
                                      <rect x="3" y="4" width="6" height="6" rx="1" />
                                      <rect x="3" y="14" width="6" height="6" rx="1" />
                                    </svg>
                                  ) : (
                                    <svg
                                      className={"h-5 w-5"}
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      strokeWidth="1.5"
                                      stroke="currentColor"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M8 9l3 3l-3 3" />
                                      <line x1="13" y1="15" x2="16" y2="15" />
                                      <rect x="3" y="4" width="18" height="16" rx="2" />
                                    </svg>
                                  )}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                <div>
                                  <p className="text-sm text-neutral-500">
                                    {t.event.template || t.event.campaign
                                      ? `${t.event.name.charAt(0).toUpperCase()}${t.event.name
                                          .replaceAll("-", " ")
                                          .slice(1)
                                          .replace(/(delivered|opened)$/, "")}`
                                      : t.event.name}{" "}
                                    {t.event.template
                                      ? t.event.name.endsWith("delivered")
                                        ? "delivered"
                                        : "opened"
                                      : t.event.campaign
                                        ? t.event.name.endsWith("delivered")
                                          ? "delivered"
                                          : "opened"
                                        : "triggered"}
                                  </p>
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
            <Empty title={"No triggers"} description={"This contact has not yet triggered any events or actions"} />
          )}
        </Card>
      </Dashboard>
    </>
  );
}
