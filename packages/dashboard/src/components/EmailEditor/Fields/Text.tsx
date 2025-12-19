import type { ComponentConfig } from "@measured/puck";
import DomPurify from "dompurify";
import { useEffect, useState } from "react";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";
import { RichTextEditorRender } from "./RichTextEditor";

export interface TextProps {
  text: string;
  padding?: string;
}

export const Text: ComponentConfig<TextProps> = {
  fields: {
    text: {
      type: "custom",
      label: "Text",
      render: RichTextEditorRender,
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
  render: ({ text, padding }) => {
    const [html, setHtml] = useState(text);
    useEffect(
      () =>
        setHtml((orig) => {
          if (orig === text) {
            return orig;
          }
          return DomPurify.sanitize(text);
        }),
      [text],
    );
    return (
      <div style={{ padding: toStyle(padding) }}>
        <div
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  },
};
