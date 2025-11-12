import type { ComponentConfig } from "@measured/puck";
import { Button as ReactEmailButton } from "@react-email/components";
import { type Align, AlignConfig } from "./Align";
import { ColorPickerRender } from "./ColorPicker";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export type ButtonProps = {
  text: string;
  href: string;
  backgroundColor?: string;
  textColor?: string;
  align?: Align;
  borderRadius?: string;
  padding?: string;
};

export const Button: ComponentConfig<ButtonProps> = {
  fields: {
    text: {
      type: "text",
      label: "Button Text",
    },
    href: {
      type: "text",
      label: "Link URL",
    },
    backgroundColor: {
      type: "custom",
      label: "Background Color",
      render: ColorPickerRender,
    },
    textColor: {
      type: "custom",
      label: "Text Color",
      render: ColorPickerRender,
    },
    align: AlignConfig,
    borderRadius: {
      type: "text",
      label: "Border Radius (px)",
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
  },
  defaultProps: {
    text: "Click me",
    href: "#",
    backgroundColor: "#000000",
    textColor: "#ffffff",
    align: "center",
    borderRadius: "4",
  },
  render: ({ text, href, backgroundColor, textColor, align, borderRadius, padding }) => (
    <div style={{ textAlign: align, margin: "16px 0", padding: toStyle(padding) }}>
      <ReactEmailButton
        href={href}
        style={{
          backgroundColor,
          color: textColor,
          padding: "12px 24px",
          borderRadius: `${borderRadius}px`,
          textDecoration: "none",
          display: "inline-block",
          fontWeight: "600",
          fontSize: "16px",
        }}
      >
        {text}
      </ReactEmailButton>
    </div>
  ),
};
