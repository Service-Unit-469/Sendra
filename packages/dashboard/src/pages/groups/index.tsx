import { useAllGroups } from "dashboard/src/lib/hooks/groups";
import dayjs from "dayjs";
import { Edit2, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BlackButton, Card, Empty, FullscreenLoader, GroupForm, Modal, Skeleton, Table } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";

export default function Index() {
  const project = useActiveProject();
  const { data: user } = useUser();
  const { data: groups, mutate: mutateGroups } = useAllGroups();

  const [groupModal, setGroupModal] = useState(false);
  const [query, setQuery] = useState<string>("");

  const filteredGroups = useMemo(() => {
    if (!groups) return null;
    if (!query) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(query.toLowerCase()));
  }, [groups, query]);

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
            <div className="grid w-full gap-3 md:w-fit md:grid-cols-2">
              <input
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                type="search"
                placeholder="Filter groups"
                value={query}
                className="rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
              />
              <BlackButton onClick={() => setGroupModal(true)}>
                <Plus strokeWidth={1.5} size={18} />
                New
              </BlackButton>
            </div>
          }
        >
          {!filteredGroups && <Skeleton type={"table"} />}
          {filteredGroups && filteredGroups.length === 0 && <Empty title="No groups" description={query ? "No groups match your filter" : "Create a new group to start grouping your contacts"} />}
          {filteredGroups && filteredGroups.length > 0 && (
            <Table
              values={filteredGroups
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((g) => {
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
