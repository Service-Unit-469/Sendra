import type { OutputData } from "@editorjs/editorjs";
import { editorJsToMjml, extractMjmlContent } from "./EditorJsToMjml";

/**
 * Injects Editor.js campaign content into an MJML template
 * Replaces {{body}} token with the rendered MJML content
 */
export function injectContentIntoTemplate(templateMjml: string, campaignContent: string | OutputData): string {
  // Convert Editor.js JSON to MJML blocks if needed
  let contentMjml: string;

  if (typeof campaignContent === "string") {
    // Try to parse as Editor.js JSON
    try {
      const editorData: OutputData = JSON.parse(campaignContent);
      const fullMjml = editorJsToMjml(editorData);
      contentMjml = extractMjmlContent(fullMjml);
    } catch {
      // If parsing fails, treat as plain text
      contentMjml = `<mj-text>${campaignContent}</mj-text>`;
    }
  } else {
    // It's Editor.js OutputData
    const fullMjml = editorJsToMjml(campaignContent);
    contentMjml = extractMjmlContent(fullMjml);
  }

  // Replace {{body}} token with content
  return templateMjml.replace(/\{\{body\}\}/gi, contentMjml);
}

/**
 * Validates that a template contains the {{body}} token
 */
export function validateTemplate(templateMjml: string): {
  valid: boolean;
  error?: string;
} {
  if (!templateMjml.includes("{{body}}")) {
    return {
      valid: false,
      error: "Template must contain {{body}} token for campaign content injection",
    };
  }

  // Basic MJML structure validation
  if (!templateMjml.includes("<mjml>")) {
    return {
      valid: false,
      error: "Template must be valid MJML (must contain <mjml> tag)",
    };
  }

  return { valid: true };
}

/**
 * Gets a default MJML template with {{body}} token
 */
export function getDefaultMjmlTemplate(): string {
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
        {{body}}
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
}
