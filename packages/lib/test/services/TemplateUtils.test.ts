import type { OutputData } from "@editorjs/editorjs";
import { describe, expect, it } from "vitest";
import {
  getDefaultMjmlTemplate,
  injectContentIntoTemplate,
  validateTemplate,
} from "../../src/services/TemplateUtils";

describe("TemplateUtils", () => {
  describe("injectContentIntoTemplate", () => {
    it("should inject Editor.js JSON string into template", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>Header</mj-text>
              {{body}}
              <mj-text>Footer</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: "Campaign content",
            },
          },
        ],
        version: "2.28.0",
      };

      const contentString = JSON.stringify(campaignContent);
      const result = injectContentIntoTemplate(template, contentString);

      expect(result).toContain("Campaign content");
      expect(result).toContain("Header");
      expect(result).toContain("Footer");
      expect(result).not.toContain("{{body}}");
    });

    it("should inject Editor.js OutputData object into template", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              {{body}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "header",
            data: {
              text: "Campaign Header",
              level: 1,
            },
          },
          {
            id: "test-2",
            type: "paragraph",
            data: {
              text: "Campaign paragraph",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = injectContentIntoTemplate(template, campaignContent);

      expect(result).toContain("Campaign Header");
      expect(result).toContain("Campaign paragraph");
      expect(result).not.toContain("{{body}}");
    });

    it("should handle plain text content when JSON parsing fails", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              {{body}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const plainText = "This is plain text, not JSON";
      const result = injectContentIntoTemplate(template, plainText);

      expect(result).toContain("This is plain text, not JSON");
      expect(result).toContain("<mj-text>");
      expect(result).not.toContain("{{body}}");
    });

    it("should handle case-insensitive {{body}} token", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              {{BODY}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: "Content",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = injectContentIntoTemplate(template, campaignContent);

      expect(result).toContain("Content");
      expect(result).not.toContain("{{BODY}}");
      expect(result).not.toContain("{{body}}");
    });

    it("should replace multiple {{body}} tokens", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              {{body}}
            </mj-column>
          </mj-section>
          <mj-section>
            <mj-column>
              {{body}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: "Repeated content",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = injectContentIntoTemplate(template, campaignContent);

      const matches = result.match(/Repeated content/g);
      expect(matches).toHaveLength(2);
      expect(result).not.toContain("{{body}}");
    });

    it("should handle empty Editor.js blocks", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              {{body}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [],
        version: "2.28.0",
      };

      const result = injectContentIntoTemplate(template, campaignContent);

      expect(result).not.toContain("{{body}}");
      expect(result).toContain("<mj-text>");
    });

    it("should extract only block content without wrapper tags", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>Before</mj-text>
              {{body}}
              <mj-text>After</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: "Campaign",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = injectContentIntoTemplate(template, campaignContent);

      // Should not duplicate the wrapper structure
      const mjmlMatches = result.match(/<mjml>/g);
      expect(mjmlMatches).toHaveLength(1);

      const bodyMatches = result.match(/<mj-body>/g);
      expect(bodyMatches).toHaveLength(1);
    });
  });

  describe("validateTemplate", () => {
    it("should validate template with {{body}} token and <mjml> tag", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              {{body}}
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const result = validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject template without {{body}} token", () => {
      const template = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>No body token here</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const result = validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("{{body}} token");
    });

    it("should reject template without <mjml> tag", () => {
      const template = `<html>
        <body>
          {{body}}
        </body>
      </html>`;

      const result = validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid MJML");
    });

    it("should validate template with {{body}} token", () => {
      const template = '<mjml><mj-body>{{body}}</mj-body></mjml>';

      const result = validateTemplate(template);
      
      expect(result.valid).toBe(true);
    });

    it("should reject empty template", () => {
      const template = "";

      const result = validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject template with only {{body}} but no MJML", () => {
      const template = "{{body}}";

      const result = validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("valid MJML");
    });
  });

  describe("getDefaultMjmlTemplate", () => {
    it("should return valid MJML template", () => {
      const template = getDefaultMjmlTemplate();

      expect(template).toContain("<mjml>");
      expect(template).toContain("</mjml>");
      expect(template).toContain("<mj-body");
      expect(template).toContain("</mj-body>");
    });

    it("should include {{body}} token", () => {
      const template = getDefaultMjmlTemplate();

      expect(template).toContain("{{body}}");
    });

    it("should include basic styling", () => {
      const template = getDefaultMjmlTemplate();

      expect(template).toContain("<mj-head>");
      expect(template).toContain("<mj-attributes>");
      expect(template).toContain("font-family");
    });

    it("should pass validation", () => {
      const template = getDefaultMjmlTemplate();
      const result = validateTemplate(template);

      expect(result.valid).toBe(true);
    });

    it("should be injectable with content", () => {
      const template = getDefaultMjmlTemplate();
      const campaignContent: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: "Test content",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = injectContentIntoTemplate(template, campaignContent);

      expect(result).toContain("Test content");
      expect(result).not.toContain("{{body}}");
    });
  });
});

