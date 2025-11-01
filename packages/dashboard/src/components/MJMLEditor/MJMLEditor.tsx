import { html } from "@codemirror/lang-html";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { Code, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface MJMLEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
}

const DEFAULT_TEMPLATE = `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Arial, sans-serif" font-size="14px" line-height="1.6" color="#000000" />
      <mj-all padding="0px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
    <mj-section padding="20px">
      <mj-column>
        {{body}}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

export default function MJMLEditor({ initialValue, onChange }: MJMLEditorProps) {
  const [value, setValue] = useState(initialValue || DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showPreview, setShowPreview] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mjml2html, setMjml2html] = useState<((mjml: string, options?: { validationLevel?: string }) => { html: string; errors: Array<{ message: string }> }) | null>(null);

  // Handle value changes
  const handleChange = (newValue: string) => {
    setValue(newValue);
    onChange(newValue);
  };

  // Load mjml-browser dynamically on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("mjml-browser").then((module) => {
        // biome-ignore lint/suspicious/noExplicitAny: because it's a dynamic import
        setMjml2html(() => module.default as any);
      });
    }
  }, []);

  useEffect(() => {
    if (!mjml2html) return; // Wait for dynamic import to complete

    try {
      // Replace {{body}} with placeholder content for preview
      const previewMjml = value.replace(
        /\{\{body\}\}/gi,
        `
        <mj-text font-size="16px" color="#666666" padding="20px" align="center">
          Campaign content will appear here
        </mj-text>
        <mj-text font-size="14px" color="#999999" padding="10px" align="center">
          (This is a placeholder for the {{body}} token)
        </mj-text>
      `,
      );

      const result = mjml2html(previewMjml, {
        validationLevel: "soft",
      });

      if (result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.message).join(", ");
        setError(errorMessages);
      } else {
        setError("");
      }

      setPreview(result.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render MJML");
      setPreview("");
    }
  }, [value, mjml2html]);

  // Update iframe content when preview changes or when preview is toggled back on
  useEffect(() => {
    if (iframeRef.current && preview && showPreview) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(preview);
        iframeDoc.close();
      }
    }
  }, [preview, showPreview]);

  return (
    <div>
      {/* Toggle Button */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 rounded-sm bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-200">
          {showPreview ? (
            <>
              <Code size={16} />
              Code Only
            </>
          ) : (
            <>
              <Eye size={16} />
              Show Preview
            </>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-2 rounded-sm bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <strong>MJML Error:</strong> {error}
        </div>
      )}

      {/* Editor and Preview */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          height: "calc(100vh - 350px)",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {/* Code Editor */}
        <div
          style={{
            flex: showPreview ? 1 : "none",
            width: showPreview ? "50%" : "100%",
            overflow: "auto",
            borderRight: showPreview ? "1px solid #e0e0e0" : "none",
          }}
        >
          <CodeMirror
            value={value}
            height="100%"
            extensions={[html(), EditorView.lineWrapping]}
            onChange={handleChange}
            theme="light"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightSpecialChars: true,
              foldGutter: true,
              drawSelection: true,
              dropCursor: true,
              allowMultipleSelections: true,
              indentOnInput: true,
              syntaxHighlighting: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              rectangularSelection: true,
              crosshairCursor: true,
              highlightActiveLine: true,
              highlightSelectionMatches: true,
              closeBracketsKeymap: true,
              searchKeymap: true,
              foldKeymap: true,
              completionKeymap: true,
              lintKeymap: true,
            }}
          />
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div
            style={{
              flex: 1,
              width: "50%",
              overflow: "auto",
              backgroundColor: "#f5f5f5",
              padding: "16px",
            }}
          >
            <iframe
              ref={iframeRef}
              title="MJML Preview"
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
