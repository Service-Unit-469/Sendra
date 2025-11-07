import z from "zod";
import { applyTunes } from "../tunes/manager";
import { type EditorJsBlockRenderer, OutputBlockDataSchema } from "../types";

export const dividerSchema = OutputBlockDataSchema.extend({
  type: z.literal("divider"),
  data: z.object({}),
});

export type DividerData = z.infer<typeof dividerSchema.shape.data>;

export const renderDivider: EditorJsBlockRenderer<"divider", DividerData> = (block): string => {
  return `<mj-divider ${applyTunes(block)} />`;
};
