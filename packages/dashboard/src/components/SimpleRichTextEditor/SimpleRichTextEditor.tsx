"use client";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Code, Heading1, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote, Strikethrough, Underline as UnderlineIcon } from "lucide-react";
import { useEffect } from "react";

export interface SimpleRichTextEditorProps {
  initialValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function SimpleRichTextEditor({ initialValue = "", onChange, placeholder = "Start typing..." }: SimpleRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
    ],
    content: initialValue,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-hidden min-h-[200px] p-4",
        placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialValue && editor.getHTML() !== initialValue) {
      editor.commands.setContent(initialValue);
    }
  }, [editor, initialValue]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const ToolbarButton = ({ onClick, isActive, disabled, children, title }: { onClick: () => void; isActive?: boolean; disabled?: boolean; children: React.ReactNode; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-sm hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed ${isActive ? "bg-neutral-200 text-neutral-900" : "text-neutral-600"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-neutral-300 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-neutral-300 bg-neutral-50 p-2 flex flex-wrap gap-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold (Ctrl+B)">
          <Bold size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic (Ctrl+I)">
          <Italic size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline (Ctrl+U)">
          <UnderlineIcon size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-neutral-300 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-neutral-300 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} title="Bullet List">
          <List size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-neutral-300 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} title="Quote">
          <Quote size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} title="Inline Code">
          <Code size={18} />
        </ToolbarButton>

        <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} title="Add Link">
          <LinkIcon size={18} />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
