"use client";

import type { CustomField } from "@measured/puck";
import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useActiveProject } from "dashboard/src/lib/hooks/projects";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Link2, Link2Off, List, ListOrderedIcon, PaintBucket, RemoveFormatting } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Hook to handle clicks outside an element
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, handler]);
}

// Custom extension for font size using inline styles
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize || null,
        renderHTML: (attributes: { fontSize?: string | null }) => {
          if (!attributes.fontSize) {
            return {};
          }
          return {
            style: `font-size: ${attributes.fontSize}`,
          };
        },
      },
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setFontSize:
        (fontSize: string) =>
        // biome-ignore lint/suspicious/noExplicitAny: yeah, I know
        ({ chain }: { chain: () => any }) => {
          return chain().setMark(this.name, { fontSize }).run();
        },
      unsetFontSize:
        () =>
        // biome-ignore lint/suspicious/noExplicitAny: yeah, I know
        ({ chain }: { chain: () => any }) => {
          return chain().setMark(this.name, { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export type RichTextEditorFieldProps = {
  label?: string;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  name: string;
  id: string;
};

export const RichTextEditorField: React.FC<RichTextEditorFieldProps> = ({ value = "", onChange, name, id, label }) => {
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useClickOutside(colorPickerRef, () => setShowColorPicker(false));
  const activeProject = useActiveProject();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TextStyle,
      FontSize,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: null,
        },
      }),
      Underline,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap returns '<p></p>' for empty content
      if (html === "<p></p>" || html === "") {
        onChange(undefined);
      } else {
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[150px] max-h-[400px] overflow-y-auto p-3",
        "data-placeholder": "Enter your text here...",
      },
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  const setFontSize = (size: string) => {
    editor?.chain().focus().setFontSize(size).run();
  };

  const setTextAlign = (align: "left" | "center" | "right" | "justify") => {
    editor?.chain().focus().setTextAlign(align).run();
  };

  const setColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };

  const unsetLink = () => {
    editor?.chain().focus().unsetLink().run();
  };

  const clearFormatting = () => {
    editor?.chain().focus().clearNodes().unsetAllMarks().run();
  };

  if (!editor) {
    return null;
  }

  const fontSizes = ["10px", "12px", "14px", "16px", "18px", "20px", "22px", "24px", "26px", "28px", "30px"];
  const colors = [
    ...(activeProject?.colors ?? ["#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#00ffff", "#ff00ff"]),
    ...["#000", "#fff"],
  ];

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm text-neutral-800 mb-1">
        {label ?? "Rich Text"}
      </label>

      <div className="rich-text-editor-wrapper border border-zinc-300 rounded-lg bg-white">
        <div className="toolbar border-b border-zinc-300 bg-zinc-50 rounded-t-lg p-2 flex flex-wrap gap-1 items-center">
          <button type="button" onClick={toggleBold} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive("bold") ? "bg-zinc-300" : ""}`} title="Bold">
            <Bold size={16} />
          </button>
          <button type="button" onClick={toggleItalic} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive("italic") ? "bg-zinc-300" : ""}`} title="Italic">
            <Italic size={16} />
          </button>

          <div className="w-px h-6 bg-zinc-300 mx-1" />

          <select
            onChange={(e) => setFontSize(e.target.value)}
            value={editor.getAttributes("textStyle").fontSize || ""}
            className="px-2 py-1 text-sm border border-zinc-300 rounded bg-white hover:bg-zinc-100"
            title="Font Size"
          >
            <option value="">Size</option>
            {fontSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <div className="w-px h-6 bg-zinc-300 mx-1" />

          <div className="flex gap-1">
            <button type="button" onClick={() => setTextAlign("left")} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive({ textAlign: "left" }) ? "bg-zinc-300" : ""}`} title="Align Left">
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setTextAlign("center")}
              className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive({ textAlign: "center" }) ? "bg-zinc-300" : ""}`}
              title="Align Center"
            >
              <AlignCenter size={16} />
            </button>
            <button type="button" onClick={() => setTextAlign("right")} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive({ textAlign: "right" }) ? "bg-zinc-300" : ""}`} title="Align Right">
              <AlignRight size={16} />
            </button>
            <button type="button" onClick={() => setTextAlign("justify")} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive({ textAlign: "justify" }) ? "bg-zinc-300" : ""}`} title="Justify">
              <AlignJustify size={16} />
            </button>
          </div>

          <div className="w-px h-6 bg-zinc-300 mx-1" />

          {/* Color */}
          <div className="relative" ref={colorPickerRef}>
            <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 rounded hover:bg-zinc-200 flex items-center gap-1" title="Text Color">
              <PaintBucket size={16} />
              <div
                className="w-4 h-4 border border-zinc-300 rounded"
                style={{
                  backgroundColor: editor.getAttributes("textStyle").color || "#000000",
                }}
              />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-zinc-300 rounded shadow-lg z-10 w-24">
                <div className="grid grid-cols-6 gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setColor(color);
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 border border-zinc-300 rounded hover:scale-110"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-zinc-300 mx-1" />

          <button type="button" onClick={toggleBulletList} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive("bulletList") ? "bg-zinc-300" : ""}`} title="Bullet List">
            <List size={16} />
          </button>
          <button type="button" onClick={toggleOrderedList} className={`p-2 rounded hover:bg-zinc-200 ${editor.isActive("orderedList") ? "bg-zinc-300" : ""}`} title="Numbered List">
            <ListOrderedIcon size={16} />
          </button>

          <div className="w-px h-6 bg-zinc-300 mx-1" />

          {/* Link */}
          {editor.isActive("link") ? (
            <button type="button" onClick={unsetLink} className="p-2 rounded hover:bg-zinc-200 bg-zinc-300" title="Remove Link">
              <Link2Off size={16} />
            </button>
          ) : (
            <button type="button" onClick={setLink} className="p-2 rounded hover:bg-zinc-200" title="Add Link">
              <Link2 size={16} />
            </button>
          )}

          <div className="w-px h-6 bg-zinc-300 mx-1" />

          <button type="button" onClick={clearFormatting} className="p-2 rounded hover:bg-zinc-200" title="Clear Formatting">
            <RemoveFormatting size={16} />
          </button>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>

      <input type="hidden" id={id} name={name} value={value} />

      <style jsx global>{`
        .rich-text-editor-wrapper .ProseMirror {
          min-height: 150px;
          max-height: 400px;
          overflow-y: auto;
          padding: 12px;
          font-size: 14px;
          line-height: 1.6;
        }

        .rich-text-editor-wrapper .ProseMirror:focus {
          outline: none;
        }

        .rich-text-editor-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #a1a1aa;
          pointer-events: none;
          height: 0;
        }

        .rich-text-editor-wrapper .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }

        .rich-text-editor-wrapper .ProseMirror ul,
        .rich-text-editor-wrapper .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }

        .rich-text-editor-wrapper .ProseMirror ul {
          list-style-type: disc;
        }

        .rich-text-editor-wrapper .ProseMirror ol {
          list-style-type: decimal;
        }

        .rich-text-editor-wrapper .ProseMirror li {
          margin: 0.25rem 0;
        }
      `}</style>
    </div>
  );
};

/**
 * Required variant that ensures a non-empty value
 */
export const RichTextEditorRender: CustomField<string>["render"] = ({ value, onChange, name, id, field: { label } }) => (
  <RichTextEditorField value={value} onChange={(v) => onChange(v || "")} name={name} id={id} label={label} />
);
