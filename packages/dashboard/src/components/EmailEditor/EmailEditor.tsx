import type { Data, Fields } from "@measured/puck";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { toPlainText } from "@react-email/render";
import { useCallback, useEffect, useRef, useState } from "react";
import { emailEditorConfig } from "./config";
import { renderEmailHtml } from "./renderer";

export interface PuckEmailEditorProps {
  initialData: Data;
  fields: Fields;
  actions: () => React.ReactElement;
  onChange: ({ data, html, plainText }: { data: Data; html: string; plainText: string }) => void;
}

export default function PuckEmailEditor({ initialData, onChange, actions, fields }: PuckEmailEditorProps) {
  const [data, setData] = useState<Data>(initialData);
  const initialDataRef = useRef<string>(JSON.stringify(initialData));

  useEffect(() => {
    try {
      // Only reset if the actual data content has changed, not just the reference
      const currentInitialData = JSON.stringify(initialData);
      if (currentInitialData !== initialDataRef.current) {
        initialDataRef.current = currentInitialData;
        setData(initialData);
      }
    } catch (error) {
      console.error("Failed to set initial value", error);
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
