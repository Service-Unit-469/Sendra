import { describe, expect, it } from "vitest";
import {
  injectBodyToken,
  validateTemplate,
  DEFAULT_TEMPLATE,
} from "../src/templateUtils";

describe("templateUtils", () => {
  describe("injectBodyToken", () => {
    it("should replace {{body}} token with content", () => {
      const template = "<mjml><mj-body>{{body}}</mj-body></mjml>";
      const content = "<mj-text>Hello World</mj-text>";

      const result = injectBodyToken(template, content);

      expect(result).toBe(
        "<mjml><mj-body><mj-text>Hello World</mj-text></mj-body></mjml>"
      );
    });

    it("should replace {{body}} token case-insensitively", () => {
      const template = "<mjml><mj-body>{{BODY}}</mj-body></mjml>";
      const content = "<mj-text>Content</mj-text>";

      const result = injectBodyToken(template, content);

      expect(result).toBe(
        "<mjml><mj-body><mj-text>Content</mj-text></mj-body></mjml>"
      );
    });

    it("should replace multiple occurrences of {{body}}", () => {
      const template =
        "<mjml><mj-body>{{body}}</mj-body><mj-footer>{{body}}</mj-footer></mjml>";
      const content = "<mj-text>Content</mj-text>";

      const result = injectBodyToken(template, content);

      expect(result).toBe(
        "<mjml><mj-body><mj-text>Content</mj-text></mj-body><mj-footer><mj-text>Content</mj-text></mj-footer></mjml>"
      );
    });

    it("should replace {{Body}} with mixed case", () => {
      const template = "<mjml><mj-body>{{Body}}</mj-body></mjml>";
      const content = "<mj-text>Test</mj-text>";

      const result = injectBodyToken(template, content);

      expect(result).toBe(
        "<mjml><mj-body><mj-text>Test</mj-text></mj-body></mjml>"
      );
    });

    it("should handle empty content", () => {
      const template = "<mjml><mj-body>{{body}}</mj-body></mjml>";
      const content = "";

      const result = injectBodyToken(template, content);

      expect(result).toBe("<mjml><mj-body></mj-body></mjml>");
    });

    it("should handle template without {{body}} token", () => {
      const template = "<mjml><mj-body><mj-text>Static</mj-text></mj-body></mjml>";
      const content = "<mj-text>New Content</mj-text>";

      const result = injectBodyToken(template, content);

      // No replacement should occur
      expect(result).toBe(
        "<mjml><mj-body><mj-text>Static</mj-text></mj-body></mjml>"
      );
    });

    it("should handle complex MJML content", () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>
              <mj-column>
                {{body}}
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;
      const content = `
        <mj-text>Header</mj-text>
        <mj-divider />
        <mj-text>Content</mj-text>
        <mj-button>Click</mj-button>
      `;

      const result = injectBodyToken(template, content);

      expect(result).toContain("<mj-text>Header</mj-text>");
      expect(result).toContain("<mj-divider />");
      expect(result).toContain("<mj-button>Click</mj-button>");
      expect(result).not.toContain("{{body}}");
    });

    it("should handle content with special characters", () => {
      const template = "<mjml><mj-body>{{body}}</mj-body></mjml>";
      const content = "<mj-text>Price: $29.99 & Free!</mj-text>";

      const result = injectBodyToken(template, content);

      expect(result).toContain("Price: $29.99 & Free!");
    });

    it("should preserve whitespace in template", () => {
      const template = `<mjml>
  <mj-body>
    {{body}}
  </mj-body>
</mjml>`;
      const content = "<mj-text>Content</mj-text>";

      const result = injectBodyToken(template, content);

      expect(result).toContain("  <mj-body>");
      expect(result).toContain("<mj-text>Content</mj-text>");
    });

    it("should handle very long content", () => {
      const template = "<mjml><mj-body>{{body}}</mj-body></mjml>";
      const content = "<mj-text>".repeat(100) + "Text" + "</mj-text>".repeat(100);

      const result = injectBodyToken(template, content);

      expect(result).toContain("Text");
      expect(result).not.toContain("{{body}}");
    });
  });

  describe("validateTemplate", () => {
    it("should validate a correct template with {{body}}", () => {
      const template = "<mjml><mj-body>{{body}}</mj-body></mjml>";

      expect(() => validateTemplate(template)).not.toThrow();
    });

    it("should reject template with {{BODY}} in uppercase (case-sensitive validation)", () => {
      const template = "<mjml><mj-body>{{BODY}}</mj-body></mjml>";

      // validateTemplate uses case-sensitive includes() check
      expect(() => validateTemplate(template)).toThrow(
        "Template must contain {{body}} token for campaign content injection"
      );
    });

    it("should reject template without {{body}} token", () => {
      const template = "<mjml><mj-body><mj-text>Static</mj-text></mj-body></mjml>";

      expect(() => validateTemplate(template)).toThrow(
        "Template must contain {{body}} token for campaign content injection"
      );
    });

    it("should reject template without <mjml> tag", () => {
      const template = "<html><body>{{body}}</body></html>";

      expect(() => validateTemplate(template)).toThrow(
        "Template must be valid MJML (must contain <mjml> tag)"
      );
    });

    it("should reject empty template", () => {
      const template = "";

      expect(() => validateTemplate(template)).toThrow();
    });

    it("should validate template with {{body}} in various positions", () => {
      const template = `
        <mjml>
          <mj-head>
            <mj-title>Newsletter</mj-title>
          </mj-head>
          <mj-body>
            <mj-section>
              <mj-column>
                {{body}}
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      expect(() => validateTemplate(template)).not.toThrow();
    });

    it("should validate template with multiple {{body}} tokens", () => {
      const template = `
        <mjml>
          <mj-body>
            <mj-section>{{body}}</mj-section>
            <mj-section>{{body}}</mj-section>
          </mj-body>
        </mjml>
      `;

      expect(() => validateTemplate(template)).not.toThrow();
    });

    it("should reject template with only {{body}} but no MJML", () => {
      const template = "{{body}}";

      expect(() => validateTemplate(template)).toThrow("mjml");
    });

    it("should reject template with <mjml> but no {{body}}", () => {
      const template = "<mjml><mj-body><mj-text>Content</mj-text></mj-body></mjml>";

      expect(() => validateTemplate(template)).toThrow("{{body}}");
    });

    it("should validate complex valid template", () => {
      const template = `
        <mjml>
          <mj-head>
            <mj-attributes>
              <mj-text font-family="Arial" />
            </mj-attributes>
          </mj-head>
          <mj-body background-color="#ffffff">
            <mj-section padding="20px">
              <mj-column>
                <mj-text>Header</mj-text>
                {{body}}
                <mj-text>Footer</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      expect(() => validateTemplate(template)).not.toThrow();
    });

    it("should handle template with HTML comments", () => {
      const template = `
        <mjml>
          <!-- Comment -->
          <mj-body>
            {{body}}
          </mj-body>
        </mjml>
      `;

      expect(() => validateTemplate(template)).not.toThrow();
    });

    it("should handle whitespace around tokens", () => {
      const template = "<mjml><mj-body>  {{body}}  </mj-body></mjml>";

      expect(() => validateTemplate(template)).not.toThrow();
    });
  });

  describe("DEFAULT_TEMPLATE", () => {
    it("should contain required MJML structure", () => {
      expect(DEFAULT_TEMPLATE).toContain("<mjml>");
      expect(DEFAULT_TEMPLATE).toContain("</mjml>");
      expect(DEFAULT_TEMPLATE).toContain("<mj-body");
      expect(DEFAULT_TEMPLATE).toContain("</mj-body>");
    });

    it("should contain {{body}} token", () => {
      expect(DEFAULT_TEMPLATE).toContain("{{body}}");
    });

    it("should contain mj-head with attributes", () => {
      expect(DEFAULT_TEMPLATE).toContain("<mj-head>");
      expect(DEFAULT_TEMPLATE).toContain("<mj-attributes>");
    });

    it("should have default styling", () => {
      expect(DEFAULT_TEMPLATE).toContain("font-family");
      expect(DEFAULT_TEMPLATE).toContain("font-size");
      expect(DEFAULT_TEMPLATE).toContain("line-height");
    });

    it("should pass validation", () => {
      expect(() => validateTemplate(DEFAULT_TEMPLATE)).not.toThrow();
    });

    it("should be injectable with content", () => {
      const content = "<mj-text>Test Content</mj-text>";

      const result = injectBodyToken(DEFAULT_TEMPLATE, content);

      expect(result).toContain("Test Content");
      expect(result).not.toContain("{{body}}");
      expect(result).toContain("<mjml>");
    });

    it("should have white background color", () => {
      expect(DEFAULT_TEMPLATE).toContain('background-color="#ffffff"');
    });

    it("should have section with padding", () => {
      expect(DEFAULT_TEMPLATE).toContain("<mj-section");
      expect(DEFAULT_TEMPLATE).toContain("padding");
    });

    it("should have a single column layout", () => {
      expect(DEFAULT_TEMPLATE).toContain("<mj-column>");
      expect(DEFAULT_TEMPLATE).toContain("</mj-column>");
    });

    it("should be properly formatted with indentation", () => {
      // Check that it has proper indentation (contains spaces/tabs)
      const lines = DEFAULT_TEMPLATE.split("\n");
      const indentedLines = lines.filter((line) => line.startsWith("  "));
      expect(indentedLines.length).toBeGreaterThan(0);
    });
  });

  describe("integration tests", () => {
    it("should validate and inject content into DEFAULT_TEMPLATE", () => {
      // First validate
      expect(() => validateTemplate(DEFAULT_TEMPLATE)).not.toThrow();

      // Then inject
      const content = `
        <mj-text font-size="24px">Welcome!</mj-text>
        <mj-divider />
        <mj-text>This is your newsletter content.</mj-text>
        <mj-button href="https://example.com">Read More</mj-button>
      `;

      const result = injectBodyToken(DEFAULT_TEMPLATE, content);

      // Verify content is injected
      expect(result).toContain("Welcome!");
      expect(result).toContain("newsletter content");
      expect(result).toContain("Read More");
      expect(result).not.toContain("{{body}}");

      // Verify template structure remains
      expect(result).toContain("<mjml>");
      expect(result).toContain("<mj-head>");
      expect(result).toContain("<mj-body");
    });

    it("should work with empty content injection", () => {
      expect(() => validateTemplate(DEFAULT_TEMPLATE)).not.toThrow();

      const result = injectBodyToken(DEFAULT_TEMPLATE, "");

      expect(result).not.toContain("{{body}}");
      expect(result).toContain("<mjml>");
    });

    it("should handle custom template validation and injection", () => {
      const customTemplate = `
        <mjml>
          <mj-body>
            <mj-section background-color="#f0f0f0">
              <mj-column>
                <mj-text align="center">Header</mj-text>
                {{body}}
                <mj-text align="center">Footer</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `;

      expect(() => validateTemplate(customTemplate)).not.toThrow();

      const content = "<mj-text>Custom content here</mj-text>";
      const result = injectBodyToken(customTemplate, content);

      expect(result).toContain("Header");
      expect(result).toContain("Custom content here");
      expect(result).toContain("Footer");
    });
  });
});

