import DOMPurify from "dompurify";
import { z } from "zod";
import { applyTunes } from "../tunes/manager";
import type { EditorJsBlockRenderer } from "../types";
import { OutputBlockDataSchema } from "../types";

export const listItemSchema = z.object({
  content: z.string(),
  get items() {
    return z.array(listItemSchema);
  },
});

export const listSchema = OutputBlockDataSchema.extend({
  type: z.literal("list"),
  data: z.object({
    style: z.enum(["unordered", "ordered"]).optional().default("unordered"),
    items: z.array(listItemSchema).optional().default([]),
  }),
});

export type ListItemData = z.infer<typeof listItemSchema>;
export type ListData = z.infer<typeof listSchema.shape.data>;

const renderListItem = (item: ListItemData, tag: "ol" | "ul"): string => {
  return `<li>${DOMPurify.sanitize(item.content)}<${tag}>${item.items.map((item) => renderListItem(item, tag)).join("")}</${tag}></li>`;
};

export const renderList: EditorJsBlockRenderer<"list", ListData> = (block): string => {
  const { style, items } = block.data;

  const listTag = style === "ordered" ? "ol" : "ul";

  return `<mj-text ${applyTunes(block, {})}><${listTag}>${items.map((item) => renderListItem(item, listTag)).join("")}</${listTag}></mj-text>`;
};
