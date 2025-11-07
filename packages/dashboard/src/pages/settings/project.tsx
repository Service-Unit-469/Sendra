import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectSchemas, type ProjectUpdate } from "@sendra/shared";
import { network } from "dashboard/src/lib/network";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BlackButton } from "../../components/Buttons/BlackButton";
import Card from "../../components/Card/Card";
import ColorList from "../../components/Input/ColorList/ColorList";
import Input from "../../components/Input/Input/Input";
import SettingTabs from "../../components/Navigation/SettingTabs/SettingTabs";
import Modal from "../../components/Overlay/Modal/Modal";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import { Dashboard } from "../../layouts";
import { useActiveProject, useActiveProjectMemberships, useProjects } from "../../lib/hooks/projects";
import { useUser } from "../../lib/hooks/users";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const activeProject = useActiveProject();
  const { data: user } = useUser();
  const { data: memberships } = useActiveProjectMemberships();
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
    if (!activeProject) {
      return;
    }

    reset(activeProject);
  }, [reset, activeProject]);

  if (!activeProject || !memberships || !user) {
    return <FullscreenLoader />;
  }

  const update = async (data: Omit<ProjectUpdate, "id">) => {
    toast.promise(
      network.fetch(`/projects/${activeProject.id}`, {
        method: "PUT",
        body: {
          id: activeProject.id,
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
        .fetch(`/projects/${activeProject.id}`, {
          method: "DELETE",
        })
        .then(async () => {
          localStorage.removeItem("project");
          await router.push("/");
          window.location.reload();
        }),
      {
        loading: "Deleting your project",
        success: "Deleted your project",
        error: "Could not delete your project",
      },
    );
  };

  return (
    <>
      <Modal
        isOpen={showDeleteModal}
        onToggle={() => setShowDeleteModal(!showDeleteModal)}
        onAction={deleteProject}
        type="danger"
        title="Are you sure?"
        description="All data associated with this project will also be permanently deleted. This action cannot be reversed!"
      />
      <Dashboard>
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
        {memberships.members.find((membership) => membership.user === user.id)?.role === "ADMIN" ? (
          <Card title="Danger zone" description="Better watch out here" className="mt-4">
            <div className="flex">
              <div className="w-2/3">
                <p className="text-sm font-bold text-neutral-500">Delete your project</p>
                <p className="text-sm text-neutral-400">Deleting your project may have unwanted consequences. All data associated with this project will get deleted and can not be recovered! </p>
              </div>
              <button
                className="ml-auto h-1/2 self-center rounded-sm bg-red-500 px-6 py-2 text-sm font-medium text-white transition ease-in-out hover:bg-red-600"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete project
              </button>
            </div>
          </Card>
        ) : null}
      </Dashboard>
    </>
  );
}
