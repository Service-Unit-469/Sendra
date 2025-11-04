import z from "zod";
import { type EditorJsBlockRenderer, OutputBlockDataSchema } from "../types";

export const dividerSchema = OutputBlockDataSchema.extend({
  type: z.literal("emailDivider"),
  data: z.object({
    borderColor: z.string().optional().default("#e0e0e0"),
    borderWidth: z.string().optional().default("1px"),
  }),
});

export type DividerData = z.infer<typeof dividerSchema.shape.data>;

export const renderDivider: EditorJsBlockRenderer<"emailDivider", DividerData> = (block): string => {
  const { borderColor, borderWidth } = block.data;
  return `<mj-divider border-width="${borderWidth}" border-color="${borderColor}" />`;
};
