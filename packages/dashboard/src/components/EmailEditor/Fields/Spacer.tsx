import type { ComponentConfig } from "@measured/puck";

export interface SpacerProps {
  height: string;
}

export const Spacer: ComponentConfig<SpacerProps> = {
  fields: {
    height: {
      type: "text",
      label: "Height (px)",
    },
  },
  defaultProps: {
    height: "32",
  },
  render: ({ height }) => {
    return (
      <div
        style={{
          height: `${height}px`,
          lineHeight: `${height}px`,
        }}
      >
        &nbsp;
      </div>
    );
  },
};
