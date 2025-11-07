import DOMPurify from "dompurify";
import z from "zod";
import { applyTunes } from "../tunes/manager";
import { type EditorJsBlockRenderer, OutputBlockDataSchema } from "../types";

export const imageSchema = OutputBlockDataSchema.extend({
  type: z.literal("image"),
  data: z.object({
    file: z.object({
      url: z.url().optional(),
    }),
    caption: z.string().optional(),
  }),
});

export type ImageData = z.infer<typeof imageSchema.shape.data>;

export const renderImage: EditorJsBlockRenderer<"image", ImageData> = (block): string => {
  const { file, caption } = block.data;

  if (!file.url) {
    return "";
  }
  return `<mj-image src="${file.url}" alt="${caption ? DOMPurify.sanitize(caption) : ""}" ${applyTunes(block, {})} />`;
};
