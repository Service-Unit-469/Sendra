import type { Contact } from "@sendra/shared";
import { Check, Hammer, Send } from "lucide-react";
import { useCallback, useState } from "react";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { SecondaryButton } from "../../../components/Buttons/SecondaryButton";
import Card from "../../../components/Card/Card";
import GroupOrContacts from "../../../components/ContactSelector/GroupOrContacts";
import { StyledLabel } from "../../../components/Label/StyledLabel";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useAllContacts } from "../../../lib/hooks/contacts";
import { useCurrentProjectSms } from "../../../lib/hooks/projects";

const GroupButton = ({
  group,
  contacts,
  clicked,
  message,
  phoneField,
  onGroupClick,
}: {
  group: string;
  contacts: Contact[];
  clicked: boolean;
  message: string;
  phoneField: string;
  onGroupClick: (group: string) => void;
}) => {
  const handleSend = useCallback(() => {
    onGroupClick(group);
    const phoneNumbers = contacts.map((c) => c.data[phoneField] as string)
      .map((n) => encodeURIComponent(n.replace(/\s-\(\)+/g, "")))
      .filter((n) => !!n)
      .join(",");
    window.open(`sms:${phoneNumbers}?&body=${encodeURIComponent(message)}`, "_blank");
  }, [contacts, phoneField, message, onGroupClick, group]);

  if (clicked) {
    return (
      <SecondaryButton type="button" onClick={handleSend}>
        <Check strokeWidth={1.5} size={18} />
        Group {parseInt(group, 10) + 1} ({contacts.length} contacts)
      </SecondaryButton>
    );
  }
  return (
    <BlackButton type="button" onClick={handleSend}>
      <Send strokeWidth={1.5} size={18} />
      Group {parseInt(group, 10) + 1} ({contacts.length} contacts)
    </BlackButton>
  );
};

type ContactGroups = Record<string, { contacts: Contact[]; clicked: boolean }>;

/**
 *
 */
export default function SmsPage() {
  const [message, setMessage] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [_, setGroups] = useState<string[]>([]);
  const { data: contacts } = useAllContacts();
  const { data: smsConfig } = useCurrentProjectSms();
  const [contactGroups, setContactGroups] = useState<ContactGroups>({});

  const handlePrepareMessages = () => {
    if (!smsConfig || !contacts) {
      return;
    }
    const newContacts: ContactGroups = {};
    let group = 0;
    let currentGroup: Contact[] = [];
    for (const contact of contacts.filter((c) => recipients.includes(c.id) && (c.data[smsConfig.phoneField ?? ""] as string))) {
      if (currentGroup.length >= smsConfig.groupSize) {
        newContacts[String(group)] = { contacts: [...currentGroup], clicked: false };
        group++;
        currentGroup = [];
      }
      currentGroup.push(contact);
    }
    newContacts[String(group)] = { contacts: [...currentGroup], clicked: false };
    setContactGroups(newContacts);
  };

  if (!contacts || !smsConfig) {
    return <FullscreenLoader />;
  }

  return (
    <Card title="Send SMS" description="Easily send SMS to contacts">
      <div className="flex flex-col gap-8">
        <div>
          <GroupOrContacts onRecipientsChange={setRecipients} onGroupsChange={setGroups} disabled={false} label="Send to" />
        </div>
        <div>
          <StyledLabel>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[150px] max-h-[400px] focus:outline-none rounded-sm border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
              placeholder="Enter message here..."
            />
          </StyledLabel>
        </div>

        <div className="flex justify-end gap-2">
          <BlackButton type="button" onClick={handlePrepareMessages}>
            <Hammer strokeWidth={1.5} size={18} />
            Prepare messages
          </BlackButton>
        </div>
        {Object.entries(contactGroups).length > 0 && (
          <>
            <hr className="my-4" />
            <div>
              <div className="flex flex-col gap-2">
                {Object.entries(contactGroups).map(([group, { contacts, clicked }]) => (
                  <div key={group}>
                    <GroupButton
                      group={group}
                      contacts={contacts}
                      clicked={clicked}
                      message={message}
                      phoneField={smsConfig?.phoneField ?? ""}
                      onGroupClick={(g) => setContactGroups((prev) => ({ ...prev, [g]: { contacts: prev[g]?.contacts ?? [], clicked: true } }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
