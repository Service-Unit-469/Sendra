import { Trash } from "lucide-react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { Card, FullscreenLoader, GroupForm, Table } from "../../components";
import { Dashboard } from "../../layouts";
import { useGroup, useGroupContacts } from "../../lib/hooks/groups";
import { useActiveProject } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { data: group, mutate } = useGroup(router.query.id as string);
  const { data: groupContacts } = useGroupContacts(router.query.id as string);

  if (!group || !groupContacts || !router.isReady || !project) {
    return <FullscreenLoader />;
  }
  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/groups/${group.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting group",
        success: "Deleted group",
        error: "Could not delete group!",
      },
    );

    await router.push("/groups");
  };

  return (
    <Dashboard>
      <Card
        title={group.name}
        options={
          <button onClick={remove} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1}>
            <Trash />
            Delete
          </button>
        }
      >
        <div className="space-y-6">
          <GroupForm onSuccess={() => void mutate()} initialData={group} groupId={group.id} submitButtonText="Save" />
        </div>
      </Card>
      <Card title="Contacts">
        <Table
          values={groupContacts.contacts?.map((c) => {
            return {
              Email: c.email,
              Subscribed: c.subscribed,
            };
          })}
        />
      </Card>
    </Dashboard>
  );
}
