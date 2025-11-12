import type { Data, Fields } from "@measured/puck";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { toPlainText } from "@react-email/render";
import { useCallback, useEffect, useState } from "react";
import { emailEditorConfig, initialEmailData } from "./config";
import { renderEmailHtml } from "./renderer";

export interface PuckEmailEditorProps {
  initialData: Data;
  fields: Fields;
  actions: () => React.ReactElement;
  onChange: ({ data, html, plainText }: { data: Data; html: string; plainText: string }) => void;
}

export default function PuckEmailEditor({ initialData, onChange, actions, fields }: PuckEmailEditorProps) {
  const [data, setData] = useState<Data>(initialEmailData);

  useEffect(() => {
    if (!initialData) {
      setData(initialEmailData);
      return;
    }

    try {
      setData(initialData);
    } catch (error) {
      console.error("Failed to set initial value:", error);
      setData(initialEmailData);
    }
  }, [initialData]);

  const handleChange = useCallback(
    async (newData: Data) => {
      setData(newData);
      const html = await renderEmailHtml(newData, emailEditorConfig(fields));
      const plainText = toPlainText(html);
      onChange({ data: newData, html, plainText });
    },
    [onChange, fields],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-full border rounded-lg overflow-hidden bg-white">
          <Puck config={emailEditorConfig(fields)} data={data} onChange={handleChange} overrides={{ headerActions: actions }} />
        </div>
      </div>
    </div>
  );
}
