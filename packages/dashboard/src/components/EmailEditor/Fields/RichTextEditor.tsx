import type { CustomField } from "@measured/puck";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export type RichTextEditorFieldProps = {
  label?: string;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  name: string;
  id: string;
};

/**
 * Custom Puck field component for rich text editing using React-Quill
 * Supports bold, italic, underline, links, text color, alignment, font size, and lists
 */
export const RichTextEditorField: React.FC<RichTextEditorFieldProps> = ({ value = "", onChange, name, id, label }) => {
  // Quill modules configuration
  const modules = {
    toolbar: [["bold", "italic"], [{ align: [] }], [{ color: [] }], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]],
  };

  // Quill formats allowed
  const formats = ["header", "bold", "italic", "align", "color", "list", "bullet", "link"];

  const handleChange = (content: string) => {
    // Quill returns '<p><br></p>' for empty content
    if (content === "<p><br></p>" || content === "") {
      onChange(undefined);
    } else {
      onChange(content);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm text-neutral-800 mb-1">
        {label ?? "Rich Text"}
      </label>

      <div className="rich-text-editor-wrapper">
        <ReactQuill theme="snow" value={value || ""} onChange={handleChange} modules={modules} formats={formats} placeholder="Enter your text here..." />
      </div>

      <input type="hidden" id={id} name={name} value={value} />

      <style jsx global>{`
        .rich-text-editor-wrapper .quill {
          border: 1px solid #d4d4d8;
          border-radius: 0.5rem;
          background: white;
        }

        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #fafafa;
          border-color: #d4d4d8;
        }

        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: #d4d4d8;
          font-size: 14px;
          min-height: 150px;
          max-height: 400px;
          overflow-y: auto;
        }

        .rich-text-editor-wrapper .ql-editor {
          min-height: 150px;
          max-height: 400px;
        }

        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #a1a1aa;
          font-style: normal;
        }
      `}</style>
    </div>
  );
};

/**
 * Puck custom field render function for rich text editor
 * Usage in component config:
 * ```
 * fields: {
 *   content: {
 *     type: "custom",
 *     label: "Content",
 *     render: RichTextEditorRender,
 *   }
 * }
 * ```
 */
export const RichTextEditorRender: CustomField<string | undefined>["render"] = ({ value, onChange, name, id, field: { label } }) => (
  <RichTextEditorField value={value} onChange={onChange} name={name} id={id} label={label} />
);

/**
 * Required variant that ensures a non-empty value
 */
export const RichTextEditorRequiredRender: CustomField<string>["render"] = ({ value, onChange, name, id, field: { label } }) => (
  <RichTextEditorField value={value} onChange={(v) => onChange(v || "")} name={name} id={id} label={label} />
);
