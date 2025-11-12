import type { ComponentConfig } from "@measured/puck";
import { Hr } from "@react-email/components";
import { ColorPickerRender } from "./ColorPicker";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export type DividerProps = {
  color?: string;
  thickness?: string;
  style?: "solid" | "dashed" | "dotted";
  padding?: string;
};

export const Divider: ComponentConfig<DividerProps> = {
  fields: {
    color: {
      type: "custom",
      label: "Color",
      render: ColorPickerRender,
    },
    thickness: {
      type: "text",
      label: "Thickness (px)",
    },
    style: {
      type: "select",
      label: "Style",
      options: [
        { label: "Solid", value: "solid" },
        { label: "Dashed", value: "dashed" },
        { label: "Dotted", value: "dotted" },
      ],
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
  },
  defaultProps: {
    color: "#e5e5e5",
    thickness: "1",
    style: "solid",
    padding: "16 0",
  },
  render: ({ color, thickness, style, padding }) => (
    <div style={{ padding: toStyle(padding) }}>
      <Hr
        style={{
          borderColor: color,
          borderWidth: `${thickness}px`,
          borderStyle: style,
        }}
      />
    </div>
  ),
};
