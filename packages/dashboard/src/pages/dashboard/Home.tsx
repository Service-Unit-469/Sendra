import dayjs from "dayjs";
import { Book, Frown, Globe, LineChart, LineChartIcon, Send } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../components/Badge/Badge";
import Card from "../../components/Card/Card";
import Skeleton from "../../components/Skeleton/Skeleton";
import Table from "../../components/Table/Table";
import Empty from "../../components/Utility/Empty/Empty";
import { useCurrentProjectFeed, useCurrentProjectIdentity } from "../../lib/hooks/projects";

const TopCard = ({ children }: { children: React.ReactNode }) => {
  return <div className="border border-neutral-20 flex-1 relative bg-white p-6 transition focus-within:ring-2 focus-within:ring-inset focus-within:ring-neutral-800 rounded">{children}</div>;
};

const TopCardRightIcon = ({ icon }: { icon: React.ReactNode }) => {
  return (
    <span className="pointer-events-none absolute right-6 top-6 text-neutral-300 transition group-hover:text-neutral-400" aria-hidden="true">
      {icon}
    </span>
  );
};

const TopCardBody = ({ badge, icon, title, description, link }: { badge?: string; icon: React.ReactNode; title: string; description: string; link: string }) => {
  return (
    <>
      <div>
        <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">{icon}</span>
      </div>
      <div className="mt-4">
        {badge && <Badge type="danger">{badge}</Badge>}
        <h3 className="mt-3 text-lg font-medium">
          <Link to={link} className="focus:outline-hidden">
            <span className="absolute inset-0" aria-hidden="true" />
            {title}
          </Link>
        </h3>
        <p className="mt-2 text-sm text-neutral-500">{description}</p>
      </div>
    </>
  );
};

/**
 *
 */
export default function Home() {
  const { data: projectIdentity } = useCurrentProjectIdentity();
  const { data: feed } = useCurrentProjectFeed();

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-2 w-full justify-between">
        <TopCard>
          {projectIdentity?.identity?.verified ? (
            <TopCardBody icon={<Send size={20} />} title="Send a campaign" description="Send a broadcast to your contacts" link="/campaigns/new" />
          ) : (
            <TopCardBody badge="Important" icon={<Globe size={20} />} title="Verify your domain" description="Verify your domain before you send emails" link="/settings/identity" />
          )}
          <TopCardRightIcon icon={<Globe size={20} />} />
        </TopCard>

        <TopCard>
          <TopCardBody icon={<LineChart size={20} />} title="Analytics" description="Discover insights about your emails" link="/analytics" />
          <TopCardRightIcon icon={<LineChartIcon size={20} />} />
        </TopCard>

        <TopCard>
          <TopCardBody icon={<Book size={20} />} title="Documentation" description="Discover how to use Sendra" link="https://service-unit-469.github.io/Sendra/" />
          <TopCardRightIcon icon={<Book size={20} />} />
        </TopCard>
      </div>

      <Card title="Activity feed">
        {feed ? (
          feed.length === 0 ? (
            <Empty icon={<Frown size={24} />} title="No feed yet" description="Send an email or track an event to see it here" />
          ) : (
            <Table
              values={feed.map((f) => {
                if ("messageId" in f && f.contact) {
                  return {
                    Email: f.contact && <Link to={`/contacts/${f.contact?.id}`}>{f.contact?.email}</Link>,
                    Activity: <Badge type="info">{`Email ${f.status.toLowerCase()}`}</Badge>,
                    Type: <Badge type={"success"}>Email</Badge>,
                    Time: dayjs().to(dayjs(f.createdAt)),
                  };
                }
                if ("action" in f && f.action) {
                  return {
                    Email: f.contact && <Link to={`/contacts/${f.contact?.id}`}>{f.contact?.email}</Link>,
                    Activity: <Badge type="info">{f.action?.name}</Badge>,
                    Type: <Badge type="info">Action</Badge>,
                    Time: dayjs().to(dayjs(f.createdAt)),
                  };
                }
                if ("event" in f && f.event) {
                  return {
                    Email: f.contact && <Link to={`/contacts/${f.contact?.id}`}>{f.contact?.email}</Link>,
                    Activity: <Badge type="info">{f.event.name}</Badge>,
                    Type: <Badge type={"purple"}>Event</Badge>,
                    Time: dayjs().to(dayjs(f.createdAt)),
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
