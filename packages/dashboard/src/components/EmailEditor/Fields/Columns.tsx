import type { ComponentConfig, Slot } from "@measured/puck";
import { Column, Row } from "@react-email/components";
import { PaddingPickerRender, toStyle } from "./PaddingPicker";

export type ColumnsProps = {
  columnCount: "2" | "3";
  padding?: string;
  gap?: string;
  column1: Slot;
  column2: Slot;
  column3?: Slot;
};

export const Columns: ComponentConfig<ColumnsProps> = {
  fields: {
    columnCount: {
      type: "select",
      label: "Number of Columns",
      options: [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
      ],
    },
    column1: {
      type: "slot",
      label: "Column 1",
    },
    column2: {
      type: "slot",
      label: "Column 2",
    },
    column3: {
      type: "slot",
      label: "Column 3",
    },
    gap: {
      type: "text",
      label: "Column Gap (px)",
    },
    padding: {
      type: "custom",
      label: "Padding",
      render: PaddingPickerRender,
    },
  },
  defaultProps: {
    column1: [],
    column2: [],
    column3: [],
    columnCount: "2",
    gap: "16",
    padding: "16",
  },
  render: ({ columnCount, gap = "16", padding = "16", column1: Column1, column2: Column2, column3: Column3 }) => {
    const count = Number.parseInt(columnCount, 10);
    return (
      <div style={{ padding: toStyle(padding) }}>
        <Row>
          <Column style={{ width: `${100 / count}%` }}>
            <Column1 />
          </Column>
          <Column style={{ width: `${100 / count}%`, paddingLeft: `${gap}px` }}>
            <Column2 />
          </Column>
          {Column3 && columnCount === "3" && (
            <Column style={{ width: `${100 / count}%`, paddingLeft: `${gap}px` }}>
              <Column3 />
            </Column>
          )}
        </Row>
      </div>
    );
  },
};
