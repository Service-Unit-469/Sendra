import DOMPurify from "dompurify";
import z from "zod";
import { type EditorJsBlockRenderer, OutputBlockDataSchema } from "../types";

export const buttonSchema = OutputBlockDataSchema.extend({
  type: z.literal("emailButton"),
  data: z.object({
    text: z.string().optional().default("Click here"),
    url: z.string().optional().default("#"),
    backgroundColor: z.string().optional().default("#4A90E2"),
    textColor: z.string().optional().default("#FFFFFF"),
    align: z.string().optional().default("center"),
  }),
});

export type ButtonData = z.infer<typeof buttonSchema.shape.data>;

export const renderButton: EditorJsBlockRenderer<"emailButton", ButtonData> = (block): string => {
  const { text, url, backgroundColor, textColor, align } = block.data;
  return `<mj-button href="${url}" background-color="${backgroundColor}" color="${textColor}" align="${align}" padding="10px 0">${DOMPurify.sanitize(text)}</mj-button>`;
};
