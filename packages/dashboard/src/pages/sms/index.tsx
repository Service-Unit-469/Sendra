import GroupOrContacts from "dashboard/src/components/ContactSelector/GroupOrContacts";
import { useState } from "react";
import Card from "../../components/Card/Card";
import { Dashboard } from "../../layouts";

/**
 *
 */
export default function Index() {
  const [_, setRecipients] = useState<string[]>([]);

  return (
    <Dashboard>
      <Card title="Send SMS">
        <form className="space-y-6 flex flex-col gap-6">
          <GroupOrContacts onRecipientsChange={(r: string[]) => setRecipients(r)} onGroupsChange={() => {}} disabled={false} label="Recipients" selectedContacts={[]} selectedGroups={[]} />

          <textarea className="w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm" placeholder="Message" />
        </form>
      </Card>
    </Dashboard>
  );
}
