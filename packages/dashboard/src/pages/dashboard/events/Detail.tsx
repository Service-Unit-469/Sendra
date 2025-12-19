import dayjs from "dayjs";
import { TerminalSquare, User } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Card from "../../../components/Card/Card";
import Empty from "../../../components/Utility/Empty/Empty";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useEvent } from "../../../lib/hooks/events";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event } = useEvent(id ?? "");
  
  if (!event) {
    return <FullscreenLoader />;
  }

  return (
    <Card title={event.eventType}>
      <div className="space-y-6">
        <div className={"flex items-center gap-6"}>
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
            <TerminalSquare className="h-10 w-10 text-neutral-800" />
          </span>
          <div>
            <h1 className={"text-2xl font-semibold text-neutral-800"}>{event.eventType}</h1>
            <p className="text-sm text-neutral-500 mt-1">Event details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-neutral-500" htmlFor="event-type">
              Event Type
            </label>
            <p className="mt-1 text-sm font-medium text-neutral-800" id="event-type">
              {event.eventType}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-500" htmlFor="created-at">
              Created At
            </label>
            <p className="mt-1 text-sm font-medium text-neutral-800" id="created-at">
              {dayjs(event.createdAt).format("YYYY-MM-DD HH:mm:ss")}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{dayjs().to(event.createdAt)}</p>
          </div>

          {event._embed?.contact && (
            <div>
              <label className="text-xs font-medium text-neutral-500" htmlFor="contact">
                Contact
              </label>
              <div className="mt-1">
                <Link to={`/contacts/${event._embed.contact.id}`} className="flex items-center gap-2 text-sm font-medium text-neutral-800 hover:text-neutral-600 transition-colors">
                  <User size={16} />
                  {event._embed.contact.email}
                </Link>
              </div>
            </div>
          )}

          {event.relationType && (
            <div>
             {event.relationType === "ACTION" ? <Link to={`/actions/${event.relation}`}>Related Action</Link> : <Link to={`/campaigns/${event.relation}`}>Related Campaign</Link>}
            </div>
          )}

          {event.data && Object.keys(event.data).length > 0 ? (
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-neutral-500 block mb-2" htmlFor="event-data">
                Event Data
              </label>
              <dl className="rounded-sm border border-neutral-200 bg-white divide-y divide-neutral-200">
                {Object.entries(event.data).map(([key, value]) => {
                  const displayValue = typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value ?? "");
                  const isComplexValue = typeof value === "object" && value !== null;

                  return (
                    <div key={key} className="px-4 py-3 hover:bg-neutral-50 transition-colors">
                      <dt className="text-xs font-semibold text-neutral-700 mb-1">{key}</dt>
                      <dd className="text-sm text-neutral-800">
                        {isComplexValue ? (
                          <pre className="text-xs text-neutral-700 whitespace-pre-wrap break-words font-mono bg-neutral-50 p-2 rounded border border-neutral-200">{displayValue}</pre>
                        ) : (
                          <span className="break-words">{displayValue}</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-neutral-500 block mb-2" htmlFor="event-data">
                Event Data
              </label>
              <Empty title="No event data" description="This event does not have any additional data" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
