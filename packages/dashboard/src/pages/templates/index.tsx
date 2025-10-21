import dayjs from "dayjs";
import { motion } from "framer-motion";
import { LayoutTemplate, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Card, Empty, Skeleton } from "../../components";
import { Dashboard } from "../../layouts";
import { useTemplates } from "../../lib/hooks/templates";
import { useActiveProject } from "../../lib/hooks/projects";

/**
 *
 */
export default function Index() {
  const { data: templates } = useTemplates();
  const activeProject = useActiveProject();

  return (
    <Dashboard>
      <Card
        title={"Templates"}
        description={"Reusable blueprints of your emails"}
        actions={
          <>
            <Link href={"templates/new-email"} passHref>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
                <Plus strokeWidth={1.5} size={18} />
                New Email
              </motion.button>
            </Link>
            {activeProject?.sms?.enabled && (
              <Link href={"templates/new-sms"} passHref>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
                  <Plus strokeWidth={1.5} size={18} />
                  New Sms
                </motion.button>
              </Link>
            )}
          </>
        }
      >
        {templates ? (
          templates.length > 0 ? (
            <div className={"grid grid-cols-1 gap-6 lg:grid-cols-3"}>
              {templates
                .sort((a, b) => {
                  if (a._embed.actions.length > 0 && b._embed.actions.length === 0) {
                    return -1;
                  }
                  if (a._embed.actions.length === 0 && b._embed.actions.length > 0) {
                    return 1;
                  }
                  if (a.subject < b.subject) {
                    return -1;
                  }
                  if (a.subject > b.subject) {
                    return 1;
                  }
                  return 0;
                })
                .map((t) => {
                  return (
                    <div className="col-span-1 divide-y divide-neutral-200 rounded border border-neutral-200 bg-white" key={t.id}>
                      <div className="flex w-full items-center justify-between space-x-6 p-6">
                        <span className="inline-flex rounded bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
                          <LayoutTemplate size={20} />
                        </span>
                        <div className="flex-1 truncate">
                          <div className="flex items-center space-x-3">
                            <h3 className="truncate text-sm font-medium text-neutral-800">{t.subject}</h3>
                            {t._embed.actions.length > 0 && <Badge type={"success"}>Active</Badge>}
                          </div>
                          <p className="mt-1 truncate text-sm text-neutral-500">Last edited {dayjs().to(t.updatedAt)}</p>
                        </div>
                      </div>
                      <div>
                        <div className="-mt-px flex divide-x divide-neutral-200">
                          <div className="flex w-0 flex-1">
                            <Link
                              href={`/templates/${t.id}`}
                              className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center rounded-bl border border-transparent py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
                            >
                              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.5"
                                  d="M4.75 19.25L9 18.25L18.2929 8.95711C18.6834 8.56658 18.6834 7.93342 18.2929 7.54289L16.4571 5.70711C16.0666 5.31658 15.4334 5.31658 15.0429 5.70711L5.75 15L4.75 19.25Z"
                                />
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.25 19.25H13.75" />
                              </svg>

                              <span className="ml-3">Edit</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <Empty title={"No templates here"} description={"Try creating a new email blueprint for your actions"} />
          )
        ) : (
          <Skeleton type={"table"} />
        )}
      </Card>
    </Dashboard>
  );
}
