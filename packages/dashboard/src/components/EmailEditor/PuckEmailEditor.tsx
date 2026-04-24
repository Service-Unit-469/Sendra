import type { Data, Fields } from "@measured/puck";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { toPlainText } from "@react-email/render";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emailEditorConfig } from "./config";
import { renderEmailHtml } from "./renderer";

export interface PuckEmailEditorProps {
  initialData: Data;
  fields: Fields;
  actions: (saving: boolean) => React.ReactElement;
  onChange: ({ data, html, plainText }: { data: Data; html: string; plainText: string }) => void;
}

export default function PuckEmailEditor({ initialData, onChange, actions, fields }: PuckEmailEditorProps) {
  const [data, setData] = useState<Data>(initialData);
  const [saving, setSaving] = useState(false);
  const timeout = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    try {
      setData(initialData);
    } catch (error) {
      console.error("Failed to set initial value", error);
    }
  }, [initialData]);

  const handleChange = useCallback(
    async (newData: Data) => {
      setSaving(true);
      try {
        const html = await renderEmailHtml(newData, emailEditorConfig(fields));
        setData(newData);
        const plainText = toPlainText(html);
        onChange({ data: newData, html, plainText });
      } finally {
        if (timeout.current) {
          clearTimeout(timeout.current);
        }
        timeout.current = setTimeout(() => setSaving(false), 100);
      }
    },
    [onChange, fields],
  );

  const actualActions = useMemo(() => () => <>{actions(saving)}</>, [actions, saving]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-full border rounded-lg overflow-hidden bg-white">
          <Puck config={emailEditorConfig(fields)} data={data} onChange={handleChange} overrides={{ headerActions: actualActions }} />
        </div>
      </div>
    </div>
  );
}
