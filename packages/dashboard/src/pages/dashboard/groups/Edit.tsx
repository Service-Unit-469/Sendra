import { Trash } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { MenuButton } from "../../../components/Buttons/MenuButton";
import Card from "../../../components/Card/Card";
import { GroupForm } from "../../../components/GroupForm/Form";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useGroup } from "../../../lib/hooks/groups";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

export default function EditGroupPage() {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const { id } = useParams<{ id: string }>();
  const { data: group, mutate } = useGroup(id ?? "");

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/groups/${group?.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting group",
        success: "Deleted group",
        error: "Could not delete group!",
      },
    );

    navigate("/dashboard/groups");
  };
  if (!group) {
    return <FullscreenLoader />;
  }

  return (
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
  );
}
