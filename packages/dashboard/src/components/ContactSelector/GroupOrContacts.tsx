import { useAllContactsWithEvents } from "dashboard/src/lib/hooks/contacts";
import { useAllGroups } from "dashboard/src/lib/hooks/groups";
import { useCallback, useState } from "react";
import { Dropdown, MultiselectDropdown } from "../Input";
import { ContactSelector } from ".";

const ContactSelectorWrapper = ({ onRecipientsChange, onGroupsChange, disabled, label, selectedContacts }: GroupOrContactsProps) => {
  const { data: contacts } = useAllContactsWithEvents();

  onGroupsChange([]);
  return <ContactSelector contacts={contacts ?? []} disabled={disabled} label={label} onChange={onRecipientsChange} initialSelectedContacts={selectedContacts} />;
};

const GroupSelector = ({ onRecipientsChange, onGroupsChange, disabled, selectedGroups = [] }: GroupOrContactsProps) => {
  const { data: groups } = useAllGroups();
  if (!groups) {
    return null;
  }
  return (
    <>
      <label htmlFor="groups" className="block text-sm font-medium text-neutral-700">
        Groups
      </label>
      <MultiselectDropdown
        values={groups.map((g) => ({ name: g.name, value: g.id })) ?? []}
        disabled={disabled}
        selectedValues={selectedGroups}
        onChange={(selectedGroups) => {
          const contacts = new Set(selectedGroups.map((sg) => groups.find((g) => g.id === sg)).flatMap((g) => g?.contacts ?? []));
          onRecipientsChange([...contacts]);
          onGroupsChange(selectedGroups);
        }}
      />
    </>
  );
};

export type GroupOrContactsProps = {
  onRecipientsChange: (value: string[]) => void;
  onGroupsChange: (value: string[]) => void;
  selectedGroups?: string[];
  selectedContacts?: string[];
  disabled: boolean;
  label: string;
};

export default function GroupOrContacts({ onRecipientsChange, onGroupsChange, disabled, label, selectedContacts, selectedGroups }: GroupOrContactsProps) {
  const [selectedValue, setSelectedValue] = useState<string>(selectedGroups || !selectedContacts || selectedContacts.length === 0 ? "group" : "contacts");
  const [recipients, setRecipients] = useState<string[]>(selectedContacts ?? []);

  const handleRecipientsChange = useCallback(
    (value: string[]) => {
      setRecipients(value);
      onRecipientsChange(value);
    },
    [onRecipientsChange],
  );

  return (
    <div className="sm:col-span-6 flex flex-col gap-2">
      <label htmlFor="recipients" className="block text-sm font-medium text-neutral-700">
        Select recipients by:
      </label>
      <Dropdown
        values={[
          { name: "Group", value: "group" },
          { name: "Contacts", value: "contacts" },
        ]}
        selectedValue={selectedValue}
        onChange={(v) => setSelectedValue(v)}
      />
      {selectedValue === "group" && <GroupSelector onRecipientsChange={handleRecipientsChange} onGroupsChange={onGroupsChange} disabled={disabled} label={label} selectedGroups={selectedGroups} />}
      {selectedValue === "contacts" && (
        <ContactSelectorWrapper onRecipientsChange={handleRecipientsChange} onGroupsChange={onGroupsChange} disabled={disabled} label={label} selectedContacts={selectedContacts} />
      )}
      <div>Total recipients: {recipients?.length}</div>
    </div>
  );
}
