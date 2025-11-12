import type { ComponentConfig, Slot } from "@measured/puck";
import { Section as ReactEmailSection } from "@react-email/components";
import { ColorPickerRender } from "./ColorPicker";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export type SectionProps = {
  backgroundColor?: string;
  padding?: string;
  content: Slot;
};

export const Section: ComponentConfig<SectionProps> = {
  fields: {
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
      label: "Content",
    },
  },
  defaultProps: {
    backgroundColor: "transparent",
    padding: "20",
    content: [],
  },
  render: ({ backgroundColor, padding, content: Content }) => (
    <ReactEmailSection
      style={{
        backgroundColor,
        padding: toStyle(padding),
      }}
    >
      <Content />
    </ReactEmailSection>
  ),
};
