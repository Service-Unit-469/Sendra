import { zodResolver } from "@hookform/resolvers/zod";
import { type GroupCreate, GroupSchemas } from "@sendra/shared";
import Tippy from "@tippyjs/react";
import { motion } from "framer-motion";
import { Eye, Save } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAllContacts } from "../../lib/hooks/contacts";
import { useCurrentProject } from "../../lib/hooks/projects";
import { network } from "../../lib/network";
import ContactSelector from "../ContactSelector/ContactSelector";
import Input from "../Input/Input/Input";
import Skeleton from "../Skeleton/Skeleton";

export type GroupFormProps = {
  groupId?: string;
  onSuccess?: () => void;
  initialData?: GroupCreate;
  submitButtonText?: string;
  className?: string;
};

const CONTACT_PREVIEW_PAGE_SIZE = 10;

export function GroupForm({ groupId, onSuccess, initialData, submitButtonText = "Save", className = "" }: GroupFormProps) {
  const project = useCurrentProject();

  const { data: contacts } = useAllContacts();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(initialData?.contacts ?? []);
  const [previewCount, setPreviewCount] = useState(CONTACT_PREVIEW_PAGE_SIZE);

  const contactsById = useMemo(() => new Map((contacts ?? []).map((contact) => [contact.id, contact])), [contacts]);
  const selectedContacts = useMemo(() => selectedContactIds.map((contactId) => contactsById.get(contactId)).filter((contact) => contact !== undefined), [selectedContactIds, contactsById]);

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

      <ContactSelector
        disabled={false}
        label="Contacts"
        contacts={contacts}
        initialSelectedContacts={initialData?.contacts}
        onChange={(contactIds) => {
          setSelectedContactIds(contactIds);
          setPreviewCount(CONTACT_PREVIEW_PAGE_SIZE);
          setValue("contacts", contactIds, { shouldDirty: true, shouldValidate: true });
        }}
      />

      <div className="rounded-sm border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
        <div className="font-medium">Total contacts: {selectedContacts.length}</div>
        {selectedContacts.length === 0 && <div className="mt-1 text-xs text-neutral-600">No contacts selected</div>}
        <div className="mt-2">
          <Tippy
            maxWidth={420}
            interactive={true}
            hideOnClick={false}
            disabled={selectedContacts.length === 0}
            className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-800 shadow-md"
            content={
              <div className="w-72">
                <p className="mb-2 text-xs font-medium text-neutral-500">
                  Showing {Math.min(previewCount, selectedContacts.length)} of {selectedContacts.length}
                </p>
                <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                  {selectedContacts.slice(0, previewCount).map((contact) => (
                    <li key={contact.id} className="truncate text-neutral-700">
                      {contact.email}
                    </li>
                  ))}
                </ul>
                {previewCount < selectedContacts.length && (
                  <button
                    type="button"
                    className="mt-2 rounded-sm border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                    onClick={() => setPreviewCount((current) => Math.min(current + CONTACT_PREVIEW_PAGE_SIZE, selectedContacts.length))}
                  >
                    Load more
                  </button>
                )}
              </div>
            }
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-sm border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={selectedContacts.length === 0}
            >
              <Eye size={14} />
              Preview contacts
            </button>
          </Tippy>
        </div>
      </div>

      <div className={"ml-auto flex justify-end gap-x-5"}>
        <motion.button
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          className={"ml-auto mt-6 flex items-center gap-x-2 rounded-sm bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"}
        >
          <Save strokeWidth={1.5} size={18} />
          {submitButtonText}
        </motion.button>
      </div>
    </form>
  );
}
