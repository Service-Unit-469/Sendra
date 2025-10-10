import { zodResolver } from "@hookform/resolvers/zod";
import { type ContactCreate, type ContactUpdate, ContactSchemas } from "@sendra/shared";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { network } from "../../lib/network";

interface UseContactFormProps {
  projectId: string;
  contactId?: string;
  onSuccess?: () => void;
  initialData?: ContactCreate;
}

export function useContactForm({ projectId, contactId, onSuccess, initialData }: UseContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(ContactSchemas.create),
    defaultValues: {
      email: initialData?.email || "",
      subscribed: initialData?.subscribed ?? true,
      data: initialData?.data || {},
    },
  });

  const createContact = (contact: ContactCreate) => {
    toast.promise(
      network.fetch(`/projects/${projectId}/contacts`, {
        method: "POST",
        body: {
          ...contact,
        },
      }),
      {
        loading: "Creating new contact",
        success: () => {
          onSuccess?.();
          return "Created new contact";
        },
        error: "Could not create new contact!",
      },
    );
  };

  const updateContact = (contact: Omit<ContactUpdate, "id">) => {
    if (!contactId) return;

    toast.promise(
      network.fetch(`/projects/${projectId}/contacts/${contactId}`, {
        method: "PUT",
        body: {
          ...contact,
          id: contactId,
        },
      }),
      {
        loading: "Saving your changes",
        success: () => {
          onSuccess?.();
          return "Saved your changes";
        },
        error: "Could not save your changes!",
      },
    );
  };

  const deleteContact = async () => {
    if (!contactId) return;

    toast.promise(
      network.fetch(`/projects/${projectId}/contacts/${contactId}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting contact",
        success: "Deleted contact",
        error: "Could not delete contact!",
      },
    );
  };

  const resetForm = (newData?: typeof initialData) => {
    reset({
      email: newData?.email || initialData?.email || "",
      subscribed: newData?.subscribed ?? initialData?.subscribed ?? true,
      data: newData?.data || initialData?.data || {},
    });
  };

  return {
    register,
    handleSubmit,
    errors,
    reset: resetForm,
    watch,
    setValue,
    createContact,
    updateContact,
    deleteContact,
  };
}
