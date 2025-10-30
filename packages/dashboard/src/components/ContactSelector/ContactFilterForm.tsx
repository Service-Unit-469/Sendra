import type { Contact } from "@sendra/shared";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { MetadataFilterEditor, type MetadataFilterGroupType, Skeleton } from "../../components";
import { useEventTypes } from "../../lib/hooks/events";
import { useActiveProject } from "../../lib/hooks/projects";
import useFilterContacts from "./filter";

/**
 *
 */
export default function ContactFilterForm({ contacts, onSelect }: { contacts: Contact[]; onSelect: (contacts: Contact[]) => void }) {
  const project = useActiveProject();
  const { data: eventTypeData } = useEventTypes();
  const eventTypes = useMemo(() => eventTypeData?.eventTypes ?? [], [eventTypeData]);

  const [filter, setFilter] = useState<MetadataFilterGroupType>();
  const filteredContacts = useFilterContacts(contacts, filter);

  if (!project || !eventTypes) {
    return <Skeleton type="form" />;
  }

  return (
    <>
      <MetadataFilterEditor onChange={(filter) => setFilter(filter)} contacts={contacts} />

      <div className={"sm:col-span-4"}>
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            onSelect(filteredContacts);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          className={"ml-auto flex items-center justify-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}
        >
          <Plus size={18} />
          Select {filteredContacts.length} contacts
        </motion.button>
      </div>
    </>
  );
}
