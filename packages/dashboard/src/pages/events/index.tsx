import { zodResolver } from "@hookform/resolvers/zod";
import { EventSchemas } from "@sendra/shared";
import dayjs from "dayjs";
import { Plus, TerminalSquare } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { toast } from "sonner";
import Badge from "../../components/Badge/Badge";
import { BlackButton } from "../../components/Buttons/BlackButton";
import Card from "../../components/Card/Card";
import Input from "../../components/Input/Input/Input";
import Modal from "../../components/Overlay/Modal/Modal";
import Skeleton from "../../components/Skeleton/Skeleton";
import Table from "../../components/Table/Table";
import Empty from "../../components/Utility/Empty/Empty";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import { Dashboard } from "../../layouts";
import { useAllContacts } from "../../lib/hooks/contacts";
import { type EventType, useEventTypesWithEvents } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

interface EventValues {
  event: string;
}

/**
 *
 */
export default function Index() {
  const project = useActiveProject();
  const { data: user } = useUser();
  const { data: contacts } = useAllContacts();
  const { data: eventTypeData, mutate } = useEventTypesWithEvents();
  const eventTypes = useMemo(() => eventTypeData?.eventTypes ?? [], [eventTypeData]);

  const [eventModal, setEventModal] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(EventSchemas.track.pick({ event: true })),
  });

  const lastActivity = useCallback((e: EventType) => {
    if (!e._embed || e._embed?.events.length === 0) {
      return "N/A";
    }
    return dayjs(
      e._embed.events.sort((a, b) => {
        return b.createdAt > a.createdAt ? 1 : -1;
      })[0].createdAt,
    ).format("MM/YYYY");
  }, []);

  if (!project || !user) {
    return <FullscreenLoader />;
  }

  const create = (data: EventValues) => {
    toast.promise(
      network.fetch(`/projects/${project.id}/track`, {
        method: "POST",
        body: {
          ...data,
          email: user.email,
          subscribed: true,
        },
      }),
      {
        loading: "Creating new event",
        success: () => {
          void mutate();
          reset();
          return "Created new event";
        },
        error: "Could not create new event!",
      },
    );

    setEventModal(false);
  };

  return (
    <>
      <Modal
        isOpen={eventModal}
        onToggle={() => setEventModal(!eventModal)}
        onAction={handleSubmit(create)}
        type="info"
        action="Trigger"
        title="Create a new event"
        description="Trigger a new event to send out emails to your contacts"
        icon={<TerminalSquare />}
      >
        <Input register={register("event")} label={"Event"} placeholder={"user-signup"} error={errors.event} />
      </Modal>

      <Dashboard>
        <Card
          title={"Events"}
          description={"View the events your application has sent to Sendra"}
          actions={
            <BlackButton onClick={() => setEventModal(true)}>
              <Plus strokeWidth={1.5} size={18} />
              New
            </BlackButton>
          }
        >
          {eventTypes && contacts ? (
            eventTypes.length > 0 ? (
              <Table
                values={eventTypes
                  .sort((a, b) => {
                    const aTrigger = a._embed.events.length > 0 ? a._embed.events.sort()[0].createdAt : a.name;

                    const bTrigger = b._embed.events.length > 0 ? b._embed.events.sort()[0].createdAt : b.name;

                    return bTrigger > aTrigger ? 1 : -1;
                  })
                  .map((e) => {
                    return {
                      Event: e.name,
                      "Triggered by users": (
                        <Badge
                          type={"info"}
                        >{`${e._embed.events.length > 0 ? Math.round(([...new Map(e._embed.events.map((t) => [t.contact, t])).values()].length / contacts.length) * 100) : 0}%`}</Badge>
                      ),
                      "Total triggers": e._embed.events.length,
                      Timeline: (
                        <>
                          <ResponsiveContainer width={100} height={40}>
                            <AreaChart
                              width={100}
                              height={40}
                              data={Object.entries(
                                e._embed.events.reduce(
                                  (acc, cur) => {
                                    const date = dayjs(cur.createdAt).format("MM/YYYY");

                                    if (acc[date]) {
                                      acc[date] += 1;
                                    } else {
                                      acc[date] = 1;
                                    }

                                    return acc;
                                  },
                                  {} as Record<string, number>,
                                ),
                              )
                                .sort((a, b) => {
                                  // day is the month with year e.g 01/2021
                                  const aDay = a[0];
                                  const bDay = b[0];

                                  return aDay > bDay ? 1 : -1;
                                })
                                .map(([day, count]) => {
                                  return {
                                    day,
                                    count,
                                  };
                                })}
                              margin={{
                                top: 5,
                                right: 0,
                                left: 0,
                              }}
                            >
                              <defs>
                                <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.4} />
                                  <stop offset="100%" stopColor="#93c5fd" stopOpacity={0} />
                                </linearGradient>
                              </defs>

                              <YAxis axisLine={false} fill={"#fff"} tickSize={0} width={5} interval={0} />

                              <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#gradientFill)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </>
                      ),
                      "Last Activity": lastActivity(e),
                      Trigger: (
                        <button
                          onClick={() => {
                            toast.promise(
                              network.fetch(`/projects/${project.id}/track`, {
                                method: "POST",
                                body: {
                                  email: user.email,
                                  event: e.name,
                                  subscribed: true,
                                },
                              }),
                              {
                                loading: "Creating new trigger",
                                success: () => {
                                  void mutate();
                                  return "Trigger created";
                                },
                                error: "Could not create new trigger!",
                              },
                            );
                          }}
                          className={"flex items-center text-center text-sm font-medium transition hover:text-neutral-800"}
                        >
                          <TerminalSquare size={18} />
                        </button>
                      ),
                    };
                  })}
              />
            ) : (
              <Empty title={"No events"} description={"You have not yet posted an event to Sendra"} />
            )
          ) : (
            <Skeleton type={"table"} />
          )}
        </Card>
        <Card title="Template events" description="Events linked to your templates">
          {eventTypes && contacts ? (
            eventTypes.length > 0 ? (
              <Table
                values={eventTypes
                  .sort((a, b) => {
                    const aTrigger = a._embed.events.length > 0 ? a._embed.events.sort()[0].createdAt : a.name;

                    const bTrigger = b._embed.events.length > 0 ? b._embed.events.sort()[0].createdAt : b.name;

                    return bTrigger > aTrigger ? 1 : -1;
                  })
                  .map((e) => {
                    return {
                      Event: e.name,
                      "Triggered by users": (
                        <Badge
                          type={"info"}
                        >{`${e._embed.events.length > 0 ? Math.round(([...new Map(e._embed.events.map((t) => [t.contact, t])).values()].length / contacts.length) * 100) : 0}%`}</Badge>
                      ),
                      "Total times triggered": e._embed.events.length,
                      "Last Activity": lastActivity(e),
                    };
                  })}
              />
            ) : (
              <Empty title={"No template events"} description={"All delivery tracking for templates can be found here"} />
            )
          ) : (
            <Skeleton type={"table"} />
          )}
        </Card>
      </Dashboard>
    </>
  );
}
