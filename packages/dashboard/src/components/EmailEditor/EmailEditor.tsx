import Delimiter from "@editorjs/delimiter";
import EditorJS, { type OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import Image from "@editorjs/image";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import Quote from "@editorjs/quote";
import { Edit, Eye } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { editorJsToMjml, mjmlToEditorJs } from "../../lib/editorjs-to-mjml";
import EmailButton from "../../lib/editorjs-tools/EmailButton";
import EmailDivider from "../../lib/editorjs-tools/EmailDivider";
import EmailSpacer from "../../lib/editorjs-tools/EmailSpacer";
import { injectContentIntoTemplate } from "../../lib/template-utils";

export interface EmailEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  templateMjml?: string; // Optional template MJML for preview
}

export default function DefaultEditor({ initialValue, onChange, templateMjml }: EmailEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isInitialized = useRef(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [currentMjml, setCurrentMjml] = useState<string>("");
  const [mjml2html, setMjml2html] = useState<((mjml: string, options?: { validationLevel?: string }) => { html: string; errors: Array<{ message: string }> }) | null>(null);

  // Load mjml-browser dynamically on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("mjml-browser").then((module) => {
        // biome-ignore lint/suspicious/noExplicitAny: because it's a dynamic import
        setMjml2html(() => module.default as any);
      });
    }
  }, []);

  // Initialize currentMjml from initialValue on mount
  useEffect(() => {
    if (initialValue) {
      // Try to parse as JSON and convert to MJML for preview
      try {
        const editorData: OutputData = JSON.parse(initialValue);
        const mjml = editorJsToMjml(editorData);
        setCurrentMjml(mjml);
      } catch {
        // If parsing fails, might be legacy MJML - use as is
        setCurrentMjml(initialValue);
      }
    }
  }, [initialValue]);

  const handleChange = useCallback(
    async (api: { saver: { save: () => Promise<OutputData> } }) => {
      try {
        const outputData = await api.saver.save();
        // Store the Editor.js JSON directly
        const jsonString = JSON.stringify(outputData);
        // Also convert to MJML for preview
        const mjml = editorJsToMjml(outputData);
        setCurrentMjml(mjml);
        onChange(jsonString);
      } catch (error) {
        console.error("Error saving editor data:", error);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (!holderRef.current || isInitialized.current) {
      return;
    }

    // Parse initial data
    let initialData: OutputData;
    try {
      if (initialValue.trim().startsWith("{")) {
        // Try to parse as Editor.js JSON (preferred format)
        initialData = JSON.parse(initialValue);
      } else if (initialValue.includes("<mjml>") || initialValue.includes("<mj-")) {
        // Legacy MJML - convert to Editor.js
        initialData = mjmlToEditorJs(initialValue);
      } else {
        // Empty or invalid - start fresh
        initialData = {
          time: Date.now(),
          blocks: [],
          version: "2.28.0",
        };
      }
    } catch (_e) {
      // If parsing fails, start with empty editor
      initialData = {
        time: Date.now(),
        blocks: [],
        version: "2.28.0",
      };
    }

    const editor = new EditorJS({
      holder: holderRef.current,
      data: initialData,
      onChange: handleChange,
      tools: {
        header: {
          // @ts-expect-error - Editor.js type compatibility issue
          class: Header,
          config: {
            placeholder: "Enter a header",
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2,
          },
          inlineToolbar: true,
        },
        paragraph: {
          // @ts-expect-error - Editor.js type compatibility issue
          class: Paragraph,
          inlineToolbar: true,
        },
        list: {
          class: List,
          inlineToolbar: true,
        },
        image: {
          class: Image,
          config: {
            uploader: {
              async uploadByFile(file: File) {
                // In production, implement your image upload logic here
                // For now, we'll use a data URL
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    resolve({
                      success: 1,
                      file: {
                        url: e.target?.result as string,
                      },
                    });
                  };
                  reader.readAsDataURL(file);
                });
              },
              async uploadByUrl(url: string) {
                return {
                  success: 1,
                  file: {
                    url,
                  },
                };
              },
            },
          },
        },
        quote: Quote,
        delimiter: Delimiter,
        emailButton: EmailButton,
        emailDivider: EmailDivider,
        emailSpacer: EmailSpacer,
      },
      placeholder: "Start writing your email content...",
      minHeight: 400,
    });

    editorRef.current = editor;
    isInitialized.current = true;

    return () => {
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        isInitialized.current = false;
      }
    };
  }, [handleChange, initialValue]);

  // Update preview when content or template changes
  useEffect(() => {
    if (templateMjml && currentMjml && mjml2html) {
      try {
        // currentMjml is already in MJML format (converted in the initial effect)
        const fullMjml = injectContentIntoTemplate(templateMjml, currentMjml);
        const result = mjml2html(fullMjml, { validationLevel: "soft" });
        setPreviewHtml(result.html);
      } catch (error) {
        console.error("Error generating preview:", error);
      }
    }
  }, [currentMjml, templateMjml, mjml2html]);

  // Update iframe when preview changes
  useEffect(() => {
    if (iframeRef.current && previewHtml && showPreview) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(previewHtml);
        iframeDoc.close();
      }
    }
  }, [previewHtml, showPreview]);

  return (
    <div>
      {/* Toggle Button - only show if template is provided */}
      {templateMjml && (
        <div className="mb-2 flex items-center justify-end gap-2">
          <button type="button" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 rounded-sm bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-200">
            {showPreview ? (
              <>
                <Edit size={16} />
                Edit Content
              </>
            ) : (
              <>
                <Eye size={16} />
                Preview Email
              </>
            )}
          </button>
        </div>
      )}

      {/* Editor and Preview */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          height: "calc(100vh - 300px)",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {/* Editor - keep mounted but hide when preview is shown */}
        <div
          style={{
            display: showPreview ? "none" : "block",
            flex: 1,
            overflow: "auto",
            padding: "20px",
            backgroundColor: "#ffffff",
            width: "100%",
            height: "100%",
          }}
        >
          <div ref={holderRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Preview */}
        {showPreview && templateMjml && (
          <div
            style={{
              flex: 1,
              overflow: "auto",
              backgroundColor: "#f5f5f5",
              padding: "16px",
            }}
          >
            <iframe
              ref={iframeRef}
              title="Email Preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "white",
                borderRadius: "4px",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
