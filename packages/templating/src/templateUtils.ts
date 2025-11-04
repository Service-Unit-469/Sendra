/**
 * Injects Editor.js campaign content into an MJML template
 * Replaces {{body}} token with the rendered MJML content
 * CLIENT-SIDE VERSION for preview purposes
 */
export function injectBodyToken(templateMjml: string, bodyContent: string): string {
  return templateMjml.replace(/\{\{body\}\}/gi, bodyContent);
}

/**
 * Validates that a template contains the {{body}} token
 */
export function validateTemplate(templateMjml: string) {
  if (!templateMjml.includes("{{body}}")) {
    throw new Error("Template must contain {{body}} token for campaign content injection");
  }

  // Basic MJML structure validation
  if (!templateMjml.includes("<mjml>")) {
    throw new Error("Template must be valid MJML (must contain <mjml> tag)");
  }
}

/**
 * Gets a default MJML template with {{body}} token
 */
export const DEFAULT_TEMPLATE = `<mjml>
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
