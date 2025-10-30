import { Trash } from "lucide-react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { Card, FullscreenLoader, GroupForm, MenuButton } from "../../components";
import { Dashboard } from "../../layouts";
import { useGroup } from "../../lib/hooks/groups";
import { useActiveProject } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { data: group, mutate } = useGroup(router.query.id as string);

  if (!group || !router.isReady || !project) {
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
          <MenuButton onClick={remove}>
            <Trash size={18} />
            Delete
          </MenuButton>
        }
      >
        <div className="space-y-6">
          <GroupForm onSuccess={() => void mutate()} initialData={group} groupId={group.id} submitButtonText="Save" />
        </div>
      </Card>
    </Dashboard>
  );
}
