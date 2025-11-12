import type { ComponentConfig, Slot } from "@measured/puck";
import { Container as ReactEmailContainer } from "@react-email/components";
import { ColorPickerRender } from "./ColorPicker";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export type ContainerProps = {
  maxWidth?: string;
  backgroundColor?: string;
  padding?: string;
  content: Slot;
};

export const Container: ComponentConfig<ContainerProps> = {
  fields: {
    maxWidth: {
      type: "text",
      label: "Max Width (px)",
    },
    backgroundColor: {
      type: "custom",
      label: "Background Color",
      render: ColorPickerRender,
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
    content: {
      type: "slot",
      label: "Container Content",
    },
  },
  defaultProps: {
    maxWidth: "600",
    backgroundColor: "#ffffff",
    padding: "20",
    content: [],
  },
  render: ({ maxWidth, backgroundColor, padding, content: Content }) => (
    <div style={{ padding: toStyle(padding) }}>
      <ReactEmailContainer
        style={{
          maxWidth: `${maxWidth}px`,
          margin: "0 auto",
          backgroundColor,
        }}
      >
        <Content />
      </ReactEmailContainer>
    </div>
  ),
};
