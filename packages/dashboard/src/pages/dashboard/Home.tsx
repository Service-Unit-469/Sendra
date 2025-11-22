import dayjs from "dayjs";
import { Book, Eye, Frown, Globe, LineChart, LineChartIcon, Send } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../components/Badge/Badge";
import Card from "../../components/Card/Card";
import Skeleton from "../../components/Skeleton/Skeleton";
import Table from "../../components/Table/Table";
import Empty from "../../components/Utility/Empty/Empty";
import { useCurrentProjectFeed, useCurrentProjectIdentity } from "../../lib/hooks/projects";

/**
 *
 */
export default function Home() {
  const { data: projectIdentity } = useCurrentProjectIdentity();
  const { data: feed } = useCurrentProjectFeed();

  return (
    <>
      <div className="divide-y divide-neutral-200 overflow-hidden rounded-sm border border-neutral-200 bg-neutral-200 lg:grid lg:grid-cols-3 lg:gap-px lg:divide-y-0">
        <div className="group relative rounded-tl rounded-tr bg-white p-6 transition focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 lg:rounded-tr-none">
          {projectIdentity?.identity?.verified ? (
            <>
              <div>
                <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
                  <Send size={20} />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <Link to="/dashboard/campaigns/new" className="focus:outline-hidden">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Send a campaign
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-neutral-500">Send a broadcast to your contacts</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
                  <Globe size={20} />
                </span>
              </div>
              <div className="mt-8">
                <Badge type={"danger"}>Important</Badge>
                <h3 className="mt-3 text-lg font-medium">
                  <Link to="/dashboard/settings/identity" className="focus:outline-hidden">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Verify your domain
                  </Link>
                </h3>
                <p className="mt-2 text-sm text-neutral-500">Verify your domain before you send emails</p>
              </div>
            </>
          )}

          <span className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400" aria-hidden="true">
            <Globe size={20} />
          </span>
        </div>

        <div className="group relative bg-white p-6 transition focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 lg:rounded-tr">
          <div>
            <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
              <LineChart size={20} />
            </span>
          </div>
          <div className="mt-2 flex h-4/6 flex-col justify-end">
            <h3 className="text-lg font-medium">
              <Link to="/dashboard/analytics" className="focus:outline-hidden">
                <span className="absolute inset-0" aria-hidden="true" />
                Analytics
              </Link>
            </h3>
            <p className="mt-2 text-sm text-neutral-500">Discover insights about your emails</p>
          </div>
          <span className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400" aria-hidden="true">
            <LineChartIcon size={20} />
          </span>
        </div>

        <div className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 lg:rounded-bl">
          <div>
            <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
              <Book size={20} />
            </span>
          </div>
          <div className="mt-2 flex h-4/6 flex-col justify-end">
            <h3 className="text-lg font-medium">
              <a href="https://github.com/Service-Unit-469/Sendra/blob/main/docs/index.md" target="_blank" className="focus:outline-hidden" rel="noreferrer">
                <span className="absolute inset-0" aria-hidden="true" />
                Documentation
              </a>
            </h3>
            <p className="mt-2 text-sm text-neutral-500">Discover how to use Sendra</p>
          </div>
          <span className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400" aria-hidden="true">
            <Book size={20} />
          </span>
        </div>
      </div>

      <Card title={"Activity feed"}>
        {feed ? (
          feed.length === 0 ? (
            <Empty icon={<Frown size={24} />} title={"No feed yet"} description={"Send an email or track an event to see it here"} />
          ) : (
            <Table
              values={feed.map((f) => {
                if ("messageId" in f && f.contact) {
                  return {
                    Email: f.contact?.email,
                    Activity: <Badge type={"info"}>{`Email ${f.status.toLowerCase()}`}</Badge>,
                    Type: <Badge type={"success"}>Email</Badge>,
                    Time: dayjs().to(dayjs(f.createdAt)),
                    View: f.contact && (
                      <Link to={`/dashboard/contacts/${f.contact?.id}`}>
                        <Eye size={20} />
                      </Link>
                    ),
                  };
                }
                if ("action" in f && f.action) {
                  return {
                    Email: f.contact?.email,
                    Activity: <Badge type={"info"}>{f.action?.name}</Badge>,
                    Type: <Badge type={"info"}>Action</Badge>,
                    Time: dayjs().to(dayjs(f.createdAt)),
                    View: f.contact && (
                      <Link to={`/dashboard/contacts/${f.contact.id}`}>
                        <Eye size={20} />
                      </Link>
                    ),
                  };
                }
                if ("event" in f && f.event) {
                  return {
                    Email: f.contact?.email,
                    Activity: <Badge type={"info"}>{f.event.name}</Badge>,
                    Type: <Badge type={"purple"}>Event</Badge>,
                    Time: dayjs().to(dayjs(f.createdAt)),
                    View: f.contact && (
                      <Link to={`/dashboard/contacts/${f.contact?.id}`}>
                        <Eye size={20} />
                      </Link>
                    ),
                  };
                }

                return {};
              })}
            />
          )
        ) : (
          <Skeleton type={"table"} />
        )}
      </Card>
    </>
  );
}
