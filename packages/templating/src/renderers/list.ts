import DOMPurify from "dompurify";
import { z } from "zod";
import type { EditorJsBlockRenderer } from "../types";
import { OutputBlockDataSchema } from "../types";

export const listSchema = OutputBlockDataSchema.extend({
  type: z.literal("list"),
  data: z.object({
    style: z.enum(["unordered", "ordered"]).optional().default("unordered"),
    items: z.array(z.string()).optional().default([]),
  }),
});

export type ListData = z.infer<typeof listSchema.shape.data>;

export const renderList: EditorJsBlockRenderer<"list", ListData> = (block): string => {
  const { style, items } = block.data;

  const listTag = style === "ordered" ? "ol" : "ul";

  return `<mj-text padding-bottom="10px"><${listTag}>${items.map((item) => `<li>${DOMPurify.sanitize(item)}</li>`).join("")}</${listTag}></mj-text>`;
};
