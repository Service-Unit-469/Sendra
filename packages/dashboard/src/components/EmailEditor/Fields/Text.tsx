import type { ComponentConfig } from "@measured/puck";
import { Text as ReactEmailText } from "@react-email/components";
import DomPurify from "dompurify";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";
import { RichTextEditorRequiredRender } from "./RichTextEditor";

export interface TextProps {
  text: string;
  padding?: string;
}

export const Text: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: "custom",
      label: "Text",
      render: RichTextEditorRequiredRender,
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
  },
  defaultProps: {
    text: "Enter your text here",
    padding: "0 0 16",
  },
  render: ({ text, padding }) => (
    <div style={{ padding: toStyle(padding) }}>
      <ReactEmailText
        style={{
          lineHeight: "1.6",
        }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
        dangerouslySetInnerHTML={{ __html: DomPurify.sanitize(text) }}
      />
    </div>
  ),
};
