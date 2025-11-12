import type { ComponentConfig } from "@measured/puck";
import { Heading as ReactEmailHeading } from "@react-email/components";
import { type Align, AlignConfig } from "./Align";
import { ColorPickerRender } from "./ColorPicker";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export type HeadingProps = {
  text: string;
  level: "h1" | "h2" | "h3" | "h4";
  align?: Align;
  color?: string;
  padding?: string;
};

const fontSize = {
  h1: "32px",
  h2: "28px",
  h3: "24px",
  h4: "20px",
};

export const Heading: ComponentConfig<HeadingProps> = {
  fields: {
    text: {
      type: "text",
      label: "Text",
    },
    level: {
      type: "select",
      label: "Level",
      options: [
        { label: "Heading 1", value: "h1" },
        { label: "Heading 2", value: "h2" },
        { label: "Heading 3", value: "h3" },
        { label: "Heading 4", value: "h4" },
      ],
    },
    align: AlignConfig,
    color: {
      type: "custom",
      label: "Color",
      render: ColorPickerRender,
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
  },
  defaultProps: {
    text: "Heading",
    level: "h1",
    align: "left",
    color: "#000000",
    padding: "0 0 16",
  },
  render: ({ text, level, align, color, padding }) => (
    <div style={{ padding: toStyle(padding) }}>
      <ReactEmailHeading
        as={level}
        style={{
          textAlign: align,
          fontSize: fontSize[level],
          fontWeight: "bold",
          color: color,
          lineHeight: "1.3",
        }}
      >
        {text}
      </ReactEmailHeading>
    </div>
  ),
};
