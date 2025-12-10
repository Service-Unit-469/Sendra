import { toPlainText } from "@react-email/render";
import { useEffect, useState } from "react";
import { RichTextEditorField } from "./Fields/RichTextEditor";

export interface QuickEmailEditorProps {
  templateHtml: string;
  templatePlainText?: string;
  initialContent?: string;
  actions: () => React.ReactElement;
  onChange: ({ data, html, plainText }: { data: string; html: string; plainText: string }) => void;
}

export default function QuickEmailEditor({ templateHtml, templatePlainText, initialContent = "", onChange, actions }: QuickEmailEditorProps) {
  const [content, setContent] = useState<string>("");
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    // Merge content into template and update preview
    const mergedHtml = templateHtml.replace(/\{\{\{?quickBody\}\}\}?/g, content || "");
    const mergedPlainText = templatePlainText?.replace(/\{\{\{?quickBody\}\}\}?/g, toPlainText(content) || "");

    setPreview(mergedHtml);

    // Notify parent of changes
    onChange({
      data: JSON.stringify({ quickBody: content }),
      html: mergedHtml,
      plainText: mergedPlainText || toPlainText(mergedHtml),
    });
  }, [content, templateHtml, templatePlainText, onChange]);

  useEffect(() => {
    setContent(initialContent || "");
  }, [initialContent]);

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-6">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-neutral-800">Edit Campaign Content</h1>
        <div className="flex items-center gap-3">{actions()}</div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden px-6">
        <div className="flex w-1/2 flex-col gap-4">
          <div className="rounded-sm border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-800">Campaign Content</h2>
            <RichTextEditorField value={content} onChange={(value) => setContent(value || "")} name="quickBody" id="quickBody" label="Message Content" />
          </div>
        </div>

        <div className="flex w-1/2 flex-col gap-4">
          <div className="flex-1 overflow-hidden rounded-sm border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-neutral-800">Preview</h2>
            </div>
            <div className="h-[calc(100%-3rem)] overflow-auto p-4">
              <iframe srcDoc={preview} className="h-full w-full border-0" title="Email Preview" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
