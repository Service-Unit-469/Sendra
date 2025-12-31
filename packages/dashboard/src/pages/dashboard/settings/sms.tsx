import type { SmsConfig } from "@sendra/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import { StyledInput } from "../../../components/Input/Input/StyledInput";
import Toggle from "../../../components/Input/Toggle/Toggle";
import { StyledLabel } from "../../../components/Label/StyledLabel";
import SettingTabs from "../../../components/Navigation/SettingTabs/SettingTabs";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useAllContacts } from "../../../lib/hooks/contacts";
import { useCurrentProject, useCurrentProjectSms } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

/**
 *
 */
export default function SmsSettingsPage() {
  const project = useCurrentProject();
  const { data: sms, mutate: smsMutate } = useCurrentProjectSms();
  const { data: contacts } = useAllContacts();
  const [currentSmsConfig, setCurrentSmsConfig] = useState<SmsConfig>({ enabled: false, groupSize: 20, phoneField: "" });

  useEffect(() => {
    if (sms) {
      setCurrentSmsConfig(sms);
    }
  }, [sms]);

  const fields = useMemo(() => {
    const fields = new Set<string>();
    contacts?.forEach((c) => void Object.keys(c.data).forEach((k) => void fields.add(k)));
    return [{ name: "Select parameter", value: "" }, ...[...fields].map((k) => ({ name: k, value: k }))];
  }, [contacts]);

  useEffect(() => {
    const phoneField = [...fields].find((f) => f.value.toLowerCase().includes("phone"));
    if (phoneField) {
      setCurrentSmsConfig((prev) => ({ ...prev, phoneField: phoneField.value }));
    }
  }, [fields]);

  const onSubmit = useCallback(async () => {
    toast.promise(
      network
        .fetch(`/projects/${project.id}/sms`, {
          method: "PUT",
          body: currentSmsConfig,
        })
        .then(() => smsMutate()),
      {
        loading: "Updating your SMS settings",
        success: "Updated your SMS settings",
        error: "Could not update your SMS settings",
      },
    );
  }, [project.id, smsMutate, currentSmsConfig]);

  if (!sms || !contacts) {
    return <FullscreenLoader />;
  }
  return (
    <>
      <SettingTabs />
      <Card title="SMS settings" description="Manage your SMS settings">
        <div className="flex flex-col gap-4">
          <Toggle
            title="Enabled"
            description="Toggle this on if you want to send SMS to your contacts"
            toggled={currentSmsConfig.enabled}
            onToggle={() => setCurrentSmsConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
          />
          <Dropdown onChange={(v) => setCurrentSmsConfig((prev) => ({ ...prev, phoneField: v }))} values={fields} selectedValue={currentSmsConfig.phoneField ?? ""} />
          <div>
            <StyledLabel>
              Group size
              <StyledInput value={currentSmsConfig.groupSize} onChange={(e) => setCurrentSmsConfig((prev) => ({ ...prev, groupSize: parseInt(e.target.value, 10) }))} placeholder="20" type="number" />
            </StyledLabel>
          </div>
          <div className="flex justify-end">
            <BlackButton type="submit" onClick={() => onSubmit()}>
              Save
            </BlackButton>
          </div>
        </div>
      </Card>
    </>
  );
}
