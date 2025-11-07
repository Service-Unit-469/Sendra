import { z } from "zod";
import { applyTunes } from "../tunes/manager";
import type { EditorJsBlockRenderer } from "../types";
import { OutputBlockDataSchema } from "../types";

export const spacerSchema = OutputBlockDataSchema.extend({
  type: z.literal("spacer"),
  data: z.object({
    height: z.string().default("20px"),
  }),
});

export type SpacerData = z.infer<typeof spacerSchema.shape.data>;

export const renderSpacer: EditorJsBlockRenderer<"spacer", SpacerData> = (block): string => {
  const { height } = block.data;
  return `<mj-spacer ${applyTunes(block, { height })} />`;
};
