import { useAllGroups } from "dashboard/src/lib/hooks/groups";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Edit2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, Empty, FullscreenLoader, GroupForm, Modal, Skeleton, Table } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";

export default function Index() {
  const project = useActiveProject();
  const { data: user } = useUser();
  const { data: groups, mutate: mutateGroups } = useAllGroups();

  const [groupModal, setGroupModal] = useState(false);

  if (!project || !user) {
    return <FullscreenLoader />;
  }

  return (
    <>
      <Modal
        isOpen={groupModal}
        onToggle={() => setGroupModal((s) => !s)}
        onAction={() => {
          setGroupModal(false);
          void mutateGroups();
        }}
        type="info"
        title="Create new group"
        hideActionButtons={true}
      >
        <GroupForm
          onSuccess={() => {
            setGroupModal(false);
            void mutateGroups();
          }}
        />
      </Modal>
      <Dashboard>
        <Card
          title="Groups"
          description="View and manage your contact groups"
          actions={
            <motion.button
              onClick={() => setGroupModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className={"flex items-center justify-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}
            >
              <Plus strokeWidth={1.5} size={18} />
              New
            </motion.button>
          }
        >
          {!groups && <Skeleton type={"table"} />}
          {groups && groups.length === 0 && <Empty title="No groups" description="Create a new group to start grouping your contacts" />}
          {groups && groups.length > 0 && (
            <Table
              values={groups.map((g) => {
                return {
                  Name: g.name,
                  "Last Updated": dayjs().to(g.updatedAt).toString(),
                  Members: g.contacts.length,
                  Edit: (
                    <Link href={`/groups/${g.id}`} className="transition hover:text-neutral-800">
                      <Edit2 size={18} />
                    </Link>
                  ),
                };
              })}
            />
          )}
        </Card>
      </Dashboard>
    </>
  );
}
