import DOMPurify from "dompurify";
import { z } from "zod";
import { applyTunes } from "../tunes/manager";
import type { EditorJsBlockRenderer } from "../types";
import { OutputBlockDataSchema } from "../types";

export const headerSchema = OutputBlockDataSchema.extend({
  type: z.literal("header"),
  data: z.object({
    level: z.number().min(1).max(6).default(2),
    text: z.string().default(""),
  }),
});

export type HeaderData = z.infer<typeof headerSchema.shape.data>;

export const renderHeader: EditorJsBlockRenderer<"header", HeaderData> = (block): string => {
  const { level, text } = block.data;

  const fontSizes: Record<number, string> = {
    1: "32px",
    2: "28px",
    3: "24px",
    4: "20px",
    5: "18px",
    6: "16px",
  };

  const fontSize = fontSizes[level] || "28px";

  return `<mj-text ${applyTunes(block, { "font-size": fontSize })}>${DOMPurify.sanitize(text)}</mj-text>`;
};
