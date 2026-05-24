import { Trash } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { MenuButton } from "../../../components/Buttons/MenuButton";
import Card from "../../../components/Card/Card";
import { GroupForm } from "../../../components/GroupForm/Form";
import Modal from "../../../components/Overlay/Modal/Modal";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { deleteModalCopy, editActionCopy } from "../../../lib/actionCopy";
import { useGroup } from "../../../lib/hooks/groups";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

export default function EditGroupPage() {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const { id } = useParams<{ id: string }>();
  const { data: group, mutate } = useGroup(id ?? "");
  const [deleteModal, setDeleteModal] = useState(false);

  const remove = async () => {
    toast.promise(
      network.fetch(`/projects/${project.id}/groups/${group?.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting group",
        success: () => {
          navigate("/groups");
          return "Deleted group";
        },
        error: "Could not delete group!",
      },
    );
  };
  if (!group) {
    return <FullscreenLoader />;
  }

  const groupDeleteCopy = deleteModalCopy("group", group.name);

  return (
    <>
      <Modal
        isOpen={deleteModal}
        onToggle={() => setDeleteModal(false)}
        onAction={remove}
        type="danger"
        action={groupDeleteCopy.action}
        title={groupDeleteCopy.title}
        description={groupDeleteCopy.description}
      />
      <Card
        title={group.name}
        options={
          <MenuButton onClick={() => setDeleteModal(true)}>
            <Trash size={18} />
            Delete
          </MenuButton>
        }
      >
        <div className="space-y-6">
          <GroupForm onSuccess={() => void mutate()} initialData={group} groupId={group.id} submitButtonText={editActionCopy.saveChanges} />
        </div>
      </Card>
    </>
  );
}
