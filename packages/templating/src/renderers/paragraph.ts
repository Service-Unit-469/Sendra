import DOMPurify from "dompurify";
import { z } from "zod";
import { applyTunes } from "../tunes/manager";
import type { EditorJsBlockRenderer } from "../types";
import { OutputBlockDataSchema } from "../types";

export const paragraphSchema = OutputBlockDataSchema.extend({
  type: z.literal("paragraph"),
  data: z.object({
    text: z.string().default(""),
  }),
});

export type ParagraphData = z.infer<typeof paragraphSchema.shape.data>;

export const renderParagraph: EditorJsBlockRenderer<"paragraph", ParagraphData> = (block): string => {
  const { text } = block.data;

  return `<mj-text ${applyTunes(block, {})}>${DOMPurify.sanitize(text)}</mj-text>`;
};
