import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectSchemas, type ProjectUpdate } from "@sendra/shared";
import { Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { DangerButton } from "../../../components/Buttons/DangerButton";
import Card from "../../../components/Card/Card";
import ColorList from "../../../components/Input/ColorList/ColorList";
import Input from "../../../components/Input/Input/Input";
import SettingTabs from "../../../components/Navigation/SettingTabs/SettingTabs";
import Modal from "../../../components/Overlay/Modal/Modal";
import { deleteModalCopy } from "../../../lib/actionCopy";
import { useCurrentProject, useCurrentProjectMemberships, useProjects } from "../../../lib/hooks/projects";
import { useUser } from "../../../lib/hooks/users";
import { network } from "../../../lib/network";

/**
 *
 */
export default function ProjectPage() {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const user = useUser();
  const { data: memberships } = useCurrentProjectMemberships();
  const { mutate: projectsMutate } = useProjects();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(ProjectSchemas.update.omit({ id: true })),
    defaultValues: {
      colors: [],
    },
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    reset(project);
  }, [reset, project]);

  const update = async (data: Omit<ProjectUpdate, "id">) => {
    toast.promise(
      network.fetch(`/projects/${project.id}`, {
        method: "PUT",
        body: {
          id: project.id,
          ...data,
        },
      }),
      {
        loading: "Updating your project",
        success: "Updated your project",
        error: "Could not update your project",
      },
    );

    await projectsMutate();
  };

  const deleteProject = async () => {
    setShowDeleteModal(!showDeleteModal);

    toast.promise(
      network
        .fetch(`/projects/${project.id}`, {
          method: "DELETE",
        })
        .then(async () => {
          localStorage.removeItem("project");
          navigate("");
          window.location.reload();
        }),
      {
        loading: "Deleting your project",
        success: "Deleted your project",
        error: "Could not delete your project",
      },
    );
  };

  const projectDeleteCopy = deleteModalCopy("project", project.name);

  return (
    <>
      <Modal
        isOpen={showDeleteModal}
        onToggle={() => setShowDeleteModal(!showDeleteModal)}
        onAction={deleteProject}
        type="danger"
        action={projectDeleteCopy.action}
        title={projectDeleteCopy.title}
        description={projectDeleteCopy.description}
      />
      <SettingTabs />
      <Card title="Project details" description="Manage your project details">
        <form onSubmit={handleSubmit(update)} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input register={register("name")} label="Name" placeholder="ACME Inc." error={errors.name} />
            <Input register={register("url")} label="URL" placeholder="https://example.com" error={errors.url} />
          </div>
          <ColorList name="colors" label="Brand Colors" watch={watch} setValue={setValue} error={errors.colors} />
          <div className="flex justify-end">
            <BlackButton>Save</BlackButton>
          </div>
        </form>
      </Card>
      {memberships?.members?.find((membership) => membership.user === user?.id)?.role === "ADMIN" ? (
        <Card title="Danger zone" description="Better watch out here" className="mt-4">
          <div className="flex">
            <div className="w-2/3">
              <p className="text-sm font-bold text-neutral-500">Delete your project</p>
              <p className="text-sm text-neutral-400">Deleting your project permanently removes all associated data. This cannot be undone.</p>
            </div>
            <DangerButton className="ml-auto h-1/2" onClick={() => setShowDeleteModal(true)}>
              <Trash size={18} />
              Delete project
            </DangerButton>
          </div>
        </Card>
      ) : null}
    </>
  );
}
