import Tippy from "@tippyjs/react";
import { Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAllContacts } from "../../lib/hooks/contacts";
import { useAllGroups } from "../../lib/hooks/groups";
import Dropdown from "../Input/Dropdown/Dropdown";
import MultiselectDropdown from "../Input/MultiselectDropdown/MultiselectDropdown";
import { StyledLabel } from "../Label/StyledLabel";
import Skeleton from "../Skeleton/Skeleton";
import ContactSelector from "./ContactSelector";

const RECIPIENT_PREVIEW_PAGE_SIZE = 10;

export type GroupOrContactsProps = {
  onRecipientsChange: (value: string[]) => void;
  onGroupsChange: (value: string[]) => void;
  disabled: boolean;
  label: string;
  selectedGroups?: string[];
  selectedContacts?: string[];
};

export default function GroupOrContacts({ onRecipientsChange, onGroupsChange, disabled, label, selectedContacts, selectedGroups }: GroupOrContactsProps) {
  const [selectedValue, setSelectedValue] = useState<string>(selectedGroups && selectedGroups.length > 0 ? "group" : "contacts");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(selectedGroups ?? []);
  const [directContactIds, setDirectContactIds] = useState<string[]>(selectedContacts ?? []);
  const [previewCount, setPreviewCount] = useState(RECIPIENT_PREVIEW_PAGE_SIZE);
  const onRecipientsChangeRef = useRef(onRecipientsChange);
  const shouldLoadGroups = selectedValue === "group" || selectedGroupIds.length > 0;
  const shouldLoadContacts = selectedValue === "contacts" || directContactIds.length > 0 || selectedGroupIds.length > 0;
  const { data: contacts } = useAllContacts(shouldLoadContacts);
  const { data: groups } = useAllGroups(shouldLoadGroups);

  const contactsById = useMemo(() => new Map((contacts ?? []).map((contact) => [contact.id, contact])), [contacts]);

  const groupRecipientIds = useMemo(() => {
    if (!groups || selectedGroupIds.length === 0) {
      return [];
    }

    const selectedContactIds = new Set(selectedGroupIds.flatMap((groupId) => groups.find((group) => group.id === groupId)?.contacts ?? []));
    return [...selectedContactIds].filter((contactId) => {
      const contact = contactsById.get(contactId);
      return contact ? contact.subscribed : true;
    });
  }, [groups, selectedGroupIds, contactsById]);

  const recipients = useMemo(() => {
    const allRecipientIds = new Set([...groupRecipientIds, ...directContactIds]);
    return [...allRecipientIds].filter((contactId) => {
      const contact = contactsById.get(contactId);
      return contact ? contact.subscribed : true;
    });
  }, [groupRecipientIds, directContactIds, contactsById]);

  const recipientContacts = useMemo(() => recipients.map((contactId) => contactsById.get(contactId)).filter((contact) => contact !== undefined), [recipients, contactsById]);

  const groupNamesByContactId = useMemo(() => {
    const contactSources = new Map<string, string[]>();

    if (!groups || selectedGroupIds.length === 0) {
      return contactSources;
    }

    for (const groupId of selectedGroupIds) {
      const group = groups.find((currentGroup) => currentGroup.id === groupId);

      if (!group) {
        continue;
      }

      for (const contactId of group.contacts ?? []) {
        const sourceGroups = contactSources.get(contactId) ?? [];
        sourceGroups.push(group.name);
        contactSources.set(contactId, sourceGroups);
      }
    }

    return contactSources;
  }, [groups, selectedGroupIds]);

  const handleRecipientsChange = useCallback((value: string[]) => {
    setDirectContactIds(value);
    setPreviewCount(RECIPIENT_PREVIEW_PAGE_SIZE);
  }, []);

  useEffect(() => {
    onRecipientsChangeRef.current = onRecipientsChange;
  }, [onRecipientsChange]);

  useEffect(() => {
    onRecipientsChangeRef.current(recipients);
  }, [recipients]);

  useEffect(() => {
    setSelectedGroupIds(selectedGroups ?? []);
    setPreviewCount(RECIPIENT_PREVIEW_PAGE_SIZE);
  }, [selectedGroups]);

  useEffect(() => {
    setDirectContactIds(selectedContacts ?? []);
    setPreviewCount(RECIPIENT_PREVIEW_PAGE_SIZE);
  }, [selectedContacts]);

  const selectedGroupsLabel = useMemo(() => {
    if (!groups || selectedGroupIds.length === 0) {
      return "None";
    }
    return selectedGroupIds
      .map((groupId) => groups.find((group) => group.id === groupId)?.name)
      .filter((name) => Boolean(name))
      .join(", ");
  }, [groups, selectedGroupIds]);

  return (
    <div className="sm:col-span-6 flex flex-col gap-2">
      <StyledLabel>
        Select recipients by
        <Dropdown
          values={[
            { name: "Group", value: "group" },
            { name: "Contacts", value: "contacts" },
          ]}
          selectedValue={selectedValue}
          onChange={(v) => setSelectedValue(v)}
        />
      </StyledLabel>

      {selectedValue === "group" && (
        <StyledLabel>
          Groups
          {groups ? (
            <MultiselectDropdown
              values={[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((group) => ({ name: group.name, value: group.id }))}
              disabled={disabled}
              selectedValues={selectedGroupIds}
              onChange={(newSelectedGroupIds) => {
                setSelectedGroupIds(newSelectedGroupIds);
                setPreviewCount(RECIPIENT_PREVIEW_PAGE_SIZE);
                onGroupsChange(newSelectedGroupIds);
              }}
            />
          ) : (
            <Skeleton type="input" />
          )}
        </StyledLabel>
      )}

      {selectedValue === "contacts" &&
        (contacts ? <ContactSelector contacts={contacts} disabled={disabled} label={label} onChange={handleRecipientsChange} initialSelectedContacts={directContactIds} /> : <Skeleton type="input" />)}

      <div className="rounded-sm border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
        <div className="font-medium">Total recipients: {recipients.length}</div>
        <div className="mt-1 text-xs text-neutral-600">Groups: {selectedGroupIds.length}</div>
        <div className="text-xs text-neutral-600">Direct contacts: {Math.max(directContactIds.length - groupRecipientIds.filter((id) => directContactIds.includes(id)).length, 0)}</div>
        <div className="text-xs text-neutral-600">Selected groups: {selectedGroupsLabel || "None"}</div>
        <div className="mt-2">
          <Tippy
            maxWidth={420}
            interactive={true}
            hideOnClick={false}
            disabled={recipientContacts.length === 0}
            className="rounded-md border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-800 shadow-md"
            content={
              <div className="w-72">
                <p className="mb-2 text-xs font-medium text-neutral-500">
                  Showing {Math.min(previewCount, recipientContacts.length)} of {recipientContacts.length}
                </p>
                <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                  {recipientContacts.slice(0, previewCount).map((contact) => (
                    <li key={contact.id} className="truncate text-neutral-700">
                      {contact.email}
                      {(groupNamesByContactId.get(contact.id)?.length ?? 0) > 0 && ` (from ${groupNamesByContactId.get(contact.id)?.join(", ")})`}
                    </li>
                  ))}
                </ul>
                {previewCount < recipientContacts.length && (
                  <button
                    type="button"
                    className="mt-2 rounded-sm border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                    onClick={() => setPreviewCount((current) => Math.min(current + RECIPIENT_PREVIEW_PAGE_SIZE, recipientContacts.length))}
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
              disabled={recipientContacts.length === 0}
            >
              <Eye size={14} />
              Preview recipients
            </button>
          </Tippy>
        </div>
      </div>
    </div>
  );
}
