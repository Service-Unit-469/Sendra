import { zodResolver } from "@hookform/resolvers/zod";
import { type GroupCreate, GroupSchemas } from "@sendra/shared";
import { ContactSelector } from "dashboard/src/components/ContactSelector";
import { useAllContacts } from "dashboard/src/lib/hooks/contacts";
import { useActiveProject } from "dashboard/src/lib/hooks/projects";
import { network } from "dashboard/src/lib/network";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input, Skeleton } from "..";

export type GroupFormProps = {
  groupId?: string;
  onSuccess?: () => void;
  initialData?: GroupCreate;
  submitButtonText?: string;
  className?: string;
};

export function GroupForm({ groupId, onSuccess, initialData, submitButtonText = "Save", className = "" }: GroupFormProps) {
  const project = useActiveProject();

  const { data: contacts } = useAllContacts();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(GroupSchemas.create),
    defaultValues: initialData,
  });

  const onSubmit = useCallback(
    (group: GroupCreate) => {
      if (groupId) {
        toast.promise(
          network.fetch(`/projects/${project?.id}/groups/${groupId}`, {
            method: "PUT",
            body: {
              ...group,
              id: groupId,
            },
          }),
          {
            success: () => {
              onSuccess?.();
              return "Group Updated";
            },
            error: (error) => `Could not update group: ${error}`,
            loading: "Updating group",
          },
        );
      } else {
        toast.promise(
          network.fetch(`/projects/${project?.id}/groups`, {
            method: "POST",
            body: group,
          }),
          {
            success: () => {
              onSuccess?.();
              return "Group Created";
            },
            error: (error) => `Could not create group: ${error}`,
            loading: "Creating group",
          },
        );
      }
    },
    [groupId, project, onSuccess],
  );
  if (!contacts || !project) {
    return <Skeleton type="form" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`flex gap-2 flex-col ${className}`}>
      <Input register={register("name")} label="Name" placeholder="My Group" error={errors.name} />

      {contacts && <ContactSelector disabled={false} label="Contacts" contacts={contacts} initialSelectedContacts={initialData?.contacts} onChange={(c) => setValue("contacts", c)} />}

      <div className={"ml-auto flex justify-end gap-x-5"}>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          className={"ml-auto mt-6 flex items-center gap-x-2 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"}
        >
          <Save strokeWidth={1.5} size={18} />
          {submitButtonText}
        </motion.button>
      </div>
    </form>
  );
}
