import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Edit3, LayoutTemplate, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../../components/Badge/Badge";
import Card from "../../../components/Card/Card";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Empty from "../../../components/Utility/Empty/Empty";
import { useTemplates } from "../../../lib/hooks/templates";

/**
 *
 */
export default function Index() {
  const { data: templates } = useTemplates();

  return (
    <Card
      title="Templates"
      description="Reusable blueprints of your emails"
      actions={
        <Link to="/dashboard/templates/new">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-1 rounded-sm bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
            <Plus strokeWidth={1.5} size={18} />
            New
          </motion.button>
        </Link>
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
                  <div className="col-span-1 divide-y divide-neutral-200 rounded-sm border border-neutral-200 bg-white" key={t.id}>
                    <div className="flex w-full items-center justify-between space-x-6 p-6">
                      <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
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
                            to={`/dashboard/templates/${t.id}`}
                            className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center rounded-bl border border-transparent py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
                          >
                            <Edit3 size={18} />

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
          <Empty title="No templates here" description="Try creating a new email template" />
        )
      ) : (
        <Skeleton type="table" />
      )}
    </Card>
  );
}
