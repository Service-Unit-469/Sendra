import EditorJS, { type OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import Image from "@editorjs/image";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import { editorJsToMjml, injectBodyToken } from "@sendra/templating";
import { Edit, Eye } from "lucide-react";
import * as mjmlBrowser from "mjml-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import EmailButton from "../../lib/editorjs-tools/EmailButton";
import EmailDivider from "../../lib/editorjs-tools/EmailDivider";
import EmailSpacer from "../../lib/editorjs-tools/EmailSpacer";

import AlignmentTune from 'editor-js-alignment-tune';

import { uploadAsset } from "../../lib/hooks/assets";
import { useActiveProject } from "../../lib/hooks/projects";

export type EmailEditorProps = {
  initialValue: string;
  onChange: (value: string) => void;
  templateMjml: string;
};

export default function DefaultEditor({ initialValue, onChange, templateMjml }: EmailEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isInitialized = useRef(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [currentMjml, setCurrentMjml] = useState<string>("");
  const [pendingImageResolve, setPendingImageResolve] = useState<((value: { success: number; file: { url: string } }) => void) | null>(null);
  const activeProject = useActiveProject();

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
        const jsonString = JSON.stringify(outputData);
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
          tunes: ['alignmentTune'],
        },
        paragraph: {
          // @ts-expect-error - Editor.js type compatibility issue
          class: Paragraph,
          inlineToolbar: true,
          tunes: ['alignmentTune'],
        },
        list: {
          class: List,
          inlineToolbar: true,
          tunes: ['alignmentTune'],
        },
        image: {
          class: Image,
          config: {
            features: {
              border: false,
              stretch: false,
              background: false,
            },
            uploader: {
              async uploadByFile(file: File) {
                try {
                  const asset = await uploadAsset(activeProject?.id ?? "", file);
                  return {
                    success: 1,
                    file: {
                      url: asset.url,
                    },
                  };
                } catch (error) {
                  console.error("Error uploading asset:", error);
                  // Fallback to data URL
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
                }
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
          tunes: ['alignmentTune'],
        },
        emailButton: EmailButton,
        emailDivider: EmailDivider,
        emailSpacer: EmailSpacer,
        alignmentTune: {
            // @ts-expect-error - Editor.js type compatibility issue
            class: AlignmentTune
        },
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
  }, [handleChange, initialValue, activeProject?.id]);

  // Update preview when content or template changes
  useEffect(() => {
    if (templateMjml && currentMjml) {
      try {
        const fullMjml = injectBodyToken(templateMjml, currentMjml);
        const result = mjmlBrowser(fullMjml, { validationLevel: "soft" });
        setPreviewHtml(result.html);
      } catch (error) {
        console.error("Error generating preview:", error);
      }
    }
  }, [currentMjml, templateMjml]);

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

      <div className="flex gap-2 h-[calc(100vh-300px)] border border-neutral-200 rounded-sm overflow-hidden">
        <div className={`flex-1 overflow-auto p-4 bg-white ${showPreview ? "hidden" : "block"}`}>
          <div ref={holderRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {showPreview && templateMjml && (
          <div className="flex-1 overflow-auto bg-neutral-50 p-4">
            <iframe ref={iframeRef} title="Email Preview" className="w-full h-full border-none bg-white rounded-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
