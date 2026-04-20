import dayjs from "dayjs";
import { Edit3, Plus, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/Badge/Badge";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import { ItemCard, ItemCardBody } from "../../../components/Card/ItemCard";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Empty from "../../../components/Utility/Empty/Empty";
import { useActions } from "../../../lib/hooks/actions";

export default function ActionsPage() {
  const { data: actions } = useActions();
  const navigate = useNavigate();

  return (
    <Card
      title="Actions"
      description="Repeatable automations that can be triggered by your applications"
      actions={
        <BlackButton onClick={() => navigate("/actions/new")}>
          <Plus strokeWidth={1.5} size={18} />
          New
        </BlackButton>
      }
    >
      {actions ? (
        actions.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" role="list">
            {actions
              .sort((a, b) => {
                if (a.name < b.name) {
                  return -1;
                }

                if (a.name > b.name) {
                  return 1;
                }

                return 0;
              })
              .map((a) => {
                return (
                  <ItemCard
                    key={a.id}
                    id={a.id}
                    name={a.name}
                    actionButtons={[
                      {
                        icon: <Edit3 size={18} />,
                        label: "Edit",
                        to: `/actions/${a.id}`,
                      },
                    ]}
                  >
                    <ItemCardBody icon={<Workflow size={20} />}>
                      <div className="flex items-center space-x-3">
                        <h3 className="truncate text-lg font-bold text-neutral-800">{a.name}</h3>
                      </div>
                      <div className="mb-6">
                        <h2 className="text col-span-2 truncate font-semibold text-neutral-700">Quick stats</h2>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-neutral-500" htmlFor="total-triggers">
                              Total events
                            </label>
                            <p className="mt-1 truncate text-sm text-neutral-500" id="total-triggers">
                              {a.events.length}
                            </p>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-neutral-500" htmlFor="last-activity">
                              Last activity
                            </label>
                            <p className="mt-1 truncate text-sm text-neutral-500" id="last-activity">
                              {a._embed.events.length > 0 ? "Last triggered" : "Created"}{" "}
                              {dayjs()
                                .to(
                                  a._embed.events.length > 0
                                    ? a._embed.events.sort((e1, e2) => {
                                        return e1.createdAt > e2.createdAt ? -1 : 1;
                                      })[0].createdAt
                                    : a.createdAt,
                                )
                                .toString()}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-neutral-500" htmlFor="open-rate">
                              Open rate
                            </label>
                            <p className="mt-1 truncate text-sm text-neutral-500" id="open-rate">
                              {a._embed.emails.length > 0 ? Math.round((a._embed.emails.filter((e) => e.status === "OPENED").length / a._embed.emails.length) * 100) : 0}%
                            </p>
                          </div>
                          {a.delay > 0 && (
                            <div>
                              <label className={"text-xs font-medium text-neutral-500"} htmlFor="emails-in-queue">
                                Emails in queue
                              </label>
                              <p className="mt-1 truncate text-sm text-neutral-500" id="emails-in-queue">
                                {a._embed.emails.filter((e) => e.status === "QUEUED").length}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="my-4">
                        <h2 className="col-span-2 truncate font-semibold text-neutral-700">Properties</h2>
                        <div className={"grid grid-cols-2 gap-3"}>
                          <div>
                            <label className={"text-xs font-medium text-neutral-500"} htmlFor="repeats">
                              Repeats
                            </label>
                            <p className="mt-1 truncate text-sm text-neutral-500" id="repeats">
                              <Badge type={a.runOnce ? "success" : "info"}>{a.runOnce ? "Runs once per user" : "Recurring"}</Badge>
                            </p>
                          </div>
                          <div>
                            <label className={"text-xs font-medium text-neutral-500"} htmlFor="delay">
                              Delay
                            </label>
                            <p className="mt-1 truncate text-sm text-neutral-500" id="delay">
                              <Badge type={a.delay === 0 ? "info" : "success"}>
                                {a.delay === 0 ? "Instant" : a.delay % 1440 === 0 ? `${a.delay / 1440} day delay` : a.delay % 60 === 0 ? `${a.delay / 60} hour delay` : `${a.delay} minute delay`}
                              </Badge>
                            </p>
                          </div>
                        </div>
                      </div>
                    </ItemCardBody>
                  </ItemCard>
                );
              })}
          </div>
        ) : (
          <Empty title="No actions here" description="Set up a new automation in a few clicks" />
        )
      ) : (
        <Skeleton type={"table"} />
      )}
    </Card>
  );
}
