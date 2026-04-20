import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Edit3, LayoutTemplate, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../../components/Badge/Badge";
import Card from "../../../components/Card/Card";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Empty from "../../../components/Utility/Empty/Empty";
import { useTemplates } from "../../../lib/hooks/templates";
import { ItemCard, ItemCardBody } from "../../../components/Card/ItemCard";

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
        <Link to="/templates/new">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} className={"flex items-center gap-x-1 rounded-sm bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}>
            <Plus strokeWidth={1.5} size={18} />
            New
          </motion.button>
        </Link>
      }
    >
      {templates ? (
        templates.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" role="list">
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
                  <ItemCard key={t.id} id={t.id} name={t.subject} actionButtons={[
                    {
                      icon: <Edit3 size={18} />,
                      label: "Edit",
                      to: `/templates/${t.id}`,
                    },
                  ]}>
                    <ItemCardBody icon={<LayoutTemplate size={20} />}>
                      <div className="flex items-center space-x-3">
                        <h3 className="truncate text-sm font-medium text-neutral-800">{t.subject}</h3>
                        {t._embed.actions.length > 0 && <Badge type="success">Active</Badge>}
                      </div>
                      <p className="mt-1 truncate text-sm text-neutral-500">Last edited {dayjs().to(t.updatedAt)}</p>
                    </ItemCardBody>
                  </ItemCard>
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
