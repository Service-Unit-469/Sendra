import { Ring } from "@uiball/loaders";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Users2, XIcon } from "lucide-react";
import { useState } from "react";
import { MultiselectDropdown } from "../Input";
import ContactFilterForm from "./ContactFilterForm";
import type { ContactWithEvents } from "./types";

export default function ContactSelector({
  contacts,
  initialSelectedContacts,
  disabled,
  label,
  onChange,
}: {
  contacts: ContactWithEvents[];
  initialSelectedContacts?: string[];
  disabled: boolean;
  label: string;
  onChange: (value: string[]) => void;
}) {
  const [advancedSelector, setAdvancedSelector] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<ContactWithEvents[]>(contacts.filter((c) => initialSelectedContacts?.includes(c.id)) ?? []);

  return (
    <>
      {contacts && (
        <>
          <div className="sm:col-span-3">
            <label htmlFor="recipients" className="block text-sm font-medium text-neutral-700">
              {label}
            </label>
            <MultiselectDropdown
              disabled={disabled}
              onChange={(c) => {
                const sc = contacts.filter((ac) => c.includes(ac.id));
                setSelectedContacts(sc);
                onChange(sc.map((c) => c.id));
              }}
              values={contacts
                .filter((c) => c.subscribed)
                .map((c) => {
                  return { name: c.email, value: c.id };
                })}
              selectedValues={selectedContacts.map((c) => c.id)}
            />
            <AnimatePresence>
              {selectedContacts.length === 0 && (
                <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                  No contacts selected
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className={"grid gap-6 sm:col-span-3 sm:grid-cols-2"}>
            {!disabled && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();

                    if (selectedContacts.length > 0) {
                      return setSelectedContacts([]);
                    }

                    setSelectedContacts(contacts.filter((c) => c.subscribed));
                  }}
                  className={
                    "mt-6 flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-8 py-1 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                  }
                >
                  {selectedContacts.length === 0 ? <Users2 size={18} /> : <XIcon size={18} />}
                  {selectedContacts.length === 0 ? "All contacts" : "Clear selection"}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setAdvancedSelector(!advancedSelector);
                  }}
                  className={
                    "mt-6 flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-8 py-1 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                  }
                >
                  {advancedSelector ? <XIcon size={18} /> : <Search size={18} />}
                  {advancedSelector ? "Close" : "Advanced"}
                </button>
              </>
            )}
          </div>

          <AnimatePresence>
            {advancedSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="grid gap-6 sm:col-span-6 sm:grid-cols-4 relative z-20 rounded border border-neutral-300 px-6 py-6"
              >
                <ContactFilterForm contacts={contacts} onSelect={(contacts) => setSelectedContacts(contacts)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
      {!contacts && !disabled && (
        <div className={"flex items-center gap-6 rounded border border-neutral-300 px-8 py-3 sm:col-span-6"}>
          <Ring size={20} />
          <div>
            <h1 className={"text-lg font-semibold text-neutral-800"}>Hang on!</h1>
            <p className={"text-sm text-neutral-600"}>We're still loading your contacts. This might take up to a minute.</p>
          </div>
        </div>
      )}
    </>
  );
}
