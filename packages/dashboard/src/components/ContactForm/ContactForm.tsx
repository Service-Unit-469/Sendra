import type { ContactCreate } from "@sendra/shared";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useState } from "react";
import { ContactMetadataForm } from "../ContactMetadataForm/ContactMetadataForm";
import Input from "../Input/Input/Input";
import Toggle from "../Input/Toggle/Toggle";
import { useContactForm } from "./useContactForm";

export type ContactFormProps = {
  projectId: string;
  contactId?: string;
  onSuccess?: () => void;
  initialData?: ContactCreate;
  showEmailField?: boolean;
  submitButtonText?: string;
  className?: string;
};

export function ContactForm({ projectId, contactId, onSuccess, initialData, showEmailField = true, submitButtonText = "Save", className = "" }: ContactFormProps) {
  const [data, setData] = useState<ContactCreate["data"]>(initialData?.data ?? {});

  const { register, handleSubmit, errors, watch, setValue, createContact, updateContact } = useContactForm({
    projectId,
    contactId,
    onSuccess,
    initialData,
  });

  const onSubmit = (contact: ContactCreate) => {
    if (contactId) {
      updateContact({ ...contact, data });
    } else {
      createContact({ ...contact, data });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 sm:grid sm:gap-x-5 sm:space-y-9 sm:grid-cols-2 ${className}`}>
      {showEmailField && (
        <div className={"col-span-2"}>
          <Input register={register("email")} label={"Email"} placeholder={"hello@email.com"} error={errors.email} />
        </div>
      )}

      <div className={"col-span-2"}>
        <ContactMetadataForm initialData={initialData?.data || {}} onDataChange={setData} />
      </div>

      <div className={"col-span-2"}>
        <Toggle
          title={"Subscribed"}
          description={watch("subscribed") ? "This contact has opted-in to receive marketing emails" : "This contact prefers not to receive marketing emails"}
          toggled={watch("subscribed") ?? false}
          onToggle={() => setValue("subscribed", !watch("subscribed"))}
        />
      </div>

      <div className={"col-span-2 ml-auto flex justify-end gap-x-5"}>
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
