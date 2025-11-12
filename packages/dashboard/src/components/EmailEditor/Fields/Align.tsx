export const AlignConfig = {
  type: "select",
  label: "Alignment",
  options: [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
  ],
} as const;

export type Align = (typeof AlignConfig.options)[number]["value"];
