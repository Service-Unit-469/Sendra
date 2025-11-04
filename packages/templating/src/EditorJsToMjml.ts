import type { OutputBlockData, OutputData } from "@editorjs/editorjs";
import DOMPurify from "dompurify";
import { buttonSchema, renderButton } from "./renderers/button";
import { dividerSchema, renderDivider } from "./renderers/divider";
import { headerSchema, renderHeader } from "./renderers/header";
import { imageSchema, renderImage } from "./renderers/image";
import { listSchema, renderList } from "./renderers/list";
import { paragraphSchema, renderParagraph } from "./renderers/paragraph";
import { renderSpacer, spacerSchema } from "./renderers/spacer";

/**
 * Transforms Editor.js JSON output to MJML markup
 */
export function editorJsToMjml(data: OutputData): string {
  if (!data.blocks || data.blocks.length === 0) {
    return getEmptyMjml();
  }

  return data.blocks.map((block) => blockToMjml(block)).join("\n");
}

/**
 * Converts a single Editor.js block to MJML
 */
function blockToMjml(block: OutputBlockData): string {
  switch (block.type) {
    case "header":
      return renderHeader(headerSchema.parse(block));
    case "paragraph":
      return renderParagraph(paragraphSchema.parse(block));
    case "list":
      return renderList(listSchema.parse(block));
    case "image":
      return renderImage(imageSchema.parse(block));
    case "emailButton":
      return renderButton(buttonSchema.parse(block));
    case "emailDivider":
      return renderDivider(dividerSchema.parse(block));
    case "emailSpacer":
      return renderSpacer(spacerSchema.parse(block));
    default:
      // Fallback: try to render as paragraph if it has text
      if (block.data?.text) {
        return `<mj-text>${DOMPurify.sanitize(block.data.text)}</mj-text>`;
      }
      return "";
  }
}

function getEmptyMjml(): string {
  return "<mj-text>Start editing your email by clicking the + button below</mj-text>";
}
