import DOMPurify from "dompurify";
import z from "zod";
import { applyTunes } from "../tunes/manager";
import { type EditorJsBlockRenderer, OutputBlockDataSchema } from "../types";

export const buttonSchema = OutputBlockDataSchema.extend({
  type: z.literal("button"),
  data: z.object({
    text: z.string().optional().default("Click here"),
    url: z.string().optional().default("#"),
  }),
});

export type ButtonData = z.infer<typeof buttonSchema.shape.data>;

export const renderButton: EditorJsBlockRenderer<"button", ButtonData> = (block): string => {
  const { text, url } = block.data;
  return `<mj-button href="${url}" ${applyTunes(block)}>${DOMPurify.sanitize(text)}</mj-button>`;
};
