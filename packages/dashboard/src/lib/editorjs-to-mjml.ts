import type { OutputBlockData, OutputData } from "@editorjs/editorjs";

/**
 * Transforms Editor.js JSON output to MJML markup
 */
export function editorJsToMjml(data: OutputData): string {
  if (!data.blocks || data.blocks.length === 0) {
    return getEmptyMjml();
  }

  const blocksHtml = data.blocks.map((block) => blockToMjml(block)).join("\n");

  return wrapInMjml(blocksHtml);
}

/**
 * Converts a single Editor.js block to MJML
 */
function blockToMjml(block: OutputBlockData): string {
  switch (block.type) {
    case "header":
      return headerToMjml(block);
    case "paragraph":
      return paragraphToMjml(block);
    case "list":
      return listToMjml(block);
    case "image":
      return imageToMjml(block);
    case "quote":
      return quoteToMjml(block);
    case "delimiter":
      return delimiterToMjml();
    case "emailButton":
      return buttonToMjml(block);
    case "emailDivider":
      return dividerToMjml(block);
    case "emailSpacer":
      return spacerToMjml(block);
    default:
      // Fallback: try to render as paragraph if it has text
      if (block.data?.text) {
        return `<mj-text>${sanitizeHtml(block.data.text)}</mj-text>`;
      }
      return "";
  }
}

function headerToMjml(block: OutputBlockData): string {
  const level = block.data?.level || 1;
  const text = block.data?.text || "";

  const fontSizes: Record<number, string> = {
    1: "32px",
    2: "28px",
    3: "24px",
    4: "20px",
    5: "18px",
    6: "16px",
  };

  const fontSize = fontSizes[level] || "24px";

  return `<mj-text font-size="${fontSize}" font-weight="bold" padding-bottom="10px">${sanitizeHtml(text)}</mj-text>`;
}

function paragraphToMjml(block: OutputBlockData): string {
  const text = block.data?.text || "";
  return `<mj-text padding-bottom="10px">${sanitizeHtml(text)}</mj-text>`;
}

function listToMjml(block: OutputBlockData): string {
  const style = block.data?.style || "unordered";
  const items = block.data?.items || [];

  const listItems = items
    .map((item: string) => {
      const bullet = style === "ordered" ? "•" : "•";
      return `<div style="padding-left: 20px; padding-bottom: 5px;">${bullet} ${sanitizeHtml(item)}</div>`;
    })
    .join("");

  return `<mj-text padding-bottom="10px">${listItems}</mj-text>`;
}

function imageToMjml(block: OutputBlockData): string {
  const url = block.data?.file?.url || "";
  const caption = block.data?.caption || "";
  const withBorder = block.data?.withBorder || false;
  const stretched = block.data?.stretched || false;

  if (!url) {
    return "";
  }

  let imageTag = `<mj-image src="${url}" alt="${sanitizeHtml(caption)}"`;

  if (!stretched) {
    imageTag += ' width="400px"';
  }

  if (withBorder) {
    imageTag += ' border="1px solid #e0e0e0"';
  }

  imageTag += " />";

  if (caption) {
    return `${imageTag}\n<mj-text font-size="12px" color="#666666" align="center" padding-top="5px">${sanitizeHtml(caption)}</mj-text>`;
  }

  return imageTag;
}

function quoteToMjml(block: OutputBlockData): string {
  const text = block.data?.text || "";
  const caption = block.data?.caption || "";

  let quote = `<mj-text padding="15px" border-left="3px solid #e0e0e0" background-color="#f5f5f5" font-style="italic">${sanitizeHtml(text)}`;

  if (caption) {
    quote += `<br/><span style="font-size: 12px; color: #666;">— ${sanitizeHtml(caption)}</span>`;
  }

  quote += "</mj-text>";

  return quote;
}

function delimiterToMjml(): string {
  return '<mj-text align="center" padding="20px">* * *</mj-text>';
}

function buttonToMjml(block: OutputBlockData): string {
  const text = block.data?.text || "Click here";
  const url = block.data?.url || "#";
  const backgroundColor = block.data?.backgroundColor || "#4A90E2";
  const textColor = block.data?.textColor || "#FFFFFF";
  const align = block.data?.align || "center";

  return `<mj-button href="${url}" background-color="${backgroundColor}" color="${textColor}" align="${align}" padding="10px 0">${sanitizeHtml(text)}</mj-button>`;
}

function dividerToMjml(block: OutputBlockData): string {
  const borderColor = block.data?.borderColor || "#e0e0e0";
  const borderWidth = block.data?.borderWidth || "1px";

  return `<mj-divider border-color="${borderColor}" border-width="${borderWidth}" padding="20px 0" />`;
}

function spacerToMjml(block: OutputBlockData): string {
  const height = block.data?.height || "20px";
  return `<mj-spacer height="${height}" />`;
}

/**
 * Wraps content blocks in complete MJML structure
 */
function wrapInMjml(content: string): string {
  return `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Arial, sans-serif" font-size="14px" line-height="1.6" color="#000000" />
      <mj-all padding="0px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
    <mj-section padding="20px">
      <mj-column>
        ${content}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}

function getEmptyMjml(): string {
  return wrapInMjml("<mj-text>Start editing your email by clicking the + button below</mj-text>");
}

/**
 * Sanitize HTML to prevent XSS while preserving basic formatting
 */
function sanitizeHtml(html: string): string {
  if (!html) return "";

  // Allow basic HTML tags that are safe for email
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*>/gi, "")
    .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/on\w+\s*=\s*'[^']*'/gi, "");
}

/**
 * Extracts just the content blocks from full MJML
 * (removes <mjml>, <mj-head>, <mj-body>, <mj-section>, <mj-column> wrappers)
 */
export function extractMjmlContent(mjml: string): string {
  // Extract content between <mj-column> tags
  const columnMatch = mjml.match(/<mj-column[^>]*>([\s\S]*)<\/mj-column>/i);
  if (columnMatch?.[1]) {
    return columnMatch[1].trim();
  }

  // Fallback: extract content between <mj-body> tags
  const bodyMatch = mjml.match(/<mj-body[^>]*>([\s\S]*)<\/mj-body>/i);
  if (bodyMatch?.[1]) {
    return bodyMatch[1].trim();
  }

  // If no matches, return as is
  return mjml;
}

/**
 * Parses MJML back to Editor.js format (for editing existing emails)
 * This is a simplified parser - you may want to enhance it based on your needs
 */
export function mjmlToEditorJs(mjml: string): OutputData {
  // This is a basic implementation - you might want to use a proper MJML parser
  // For now, we'll return a simple structure
  const blocks: OutputBlockData[] = [];

  // Try to extract text content (very basic)
  const textMatches = mjml.match(/<mj-text[^>]*>(.*?)<\/mj-text>/gs);
  if (textMatches) {
    textMatches.forEach((match) => {
      const content = match.replace(/<mj-text[^>]*>|<\/mj-text>/g, "").trim();
      if (content) {
        blocks.push({
          id: generateId(),
          type: "paragraph",
          data: {
            text: content,
          },
        });
      }
    });
  }

  // If no blocks found, return empty editor
  if (blocks.length === 0) {
    blocks.push({
      id: generateId(),
      type: "paragraph",
      data: {
        text: "",
      },
    });
  }

  return {
    time: Date.now(),
    blocks,
    version: "2.28.0",
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
