import type { OutputData } from "@editorjs/editorjs";
import { describe, expect, it } from "vitest";
import { editorJsToMjml, extractMjmlContent, mjmlToEditorJs } from "../../src/services/EditorJsToMjml";

describe("EditorJsToMjml", () => {
  describe("editorJsToMjml", () => {
    it("should convert empty blocks to default MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("<mjml>");
      expect(result).toContain("</mjml>");
      expect(result).toContain("<mj-body");
      expect(result).toContain("Start editing your email");
    });

    it("should convert header blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "header",
            data: {
              text: "Test Header",
              level: 1,
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("Test Header");
      expect(result).toContain('font-size="32px"');
      expect(result).toContain('font-weight="bold"');
    });

    it("should convert different header levels", () => {
      const levels = [1, 2, 3, 4, 5, 6];
      const expectedFontSizes = ["32px", "28px", "24px", "20px", "18px", "16px"];

      levels.forEach((level, index) => {
        const data: OutputData = {
          time: Date.now(),
          blocks: [
            {
              id: `test-${level}`,
              type: "header",
              data: {
                text: `Header ${level}`,
                level,
              },
            },
          ],
          version: "2.28.0",
        };

        const result = editorJsToMjml(data);
        expect(result).toContain(`font-size="${expectedFontSizes[index]}"`);
      });
    });

    it("should convert paragraph blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: "This is a test paragraph.",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("This is a test paragraph.");
      expect(result).toContain("<mj-text");
    });

    it("should convert unordered list blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "list",
            data: {
              style: "unordered",
              items: ["Item 1", "Item 2", "Item 3"],
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
      expect(result).toContain("Item 3");
      expect(result).toContain("•");
    });

    it("should convert ordered list blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "list",
            data: {
              style: "ordered",
              items: ["First", "Second", "Third"],
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("First");
      expect(result).toContain("Second");
      expect(result).toContain("Third");
    });

    it("should convert image blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "image",
            data: {
              file: {
                url: "https://example.com/image.jpg",
              },
              caption: "Test Image",
              withBorder: false,
              stretched: false,
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("https://example.com/image.jpg");
      expect(result).toContain("Test Image");
      expect(result).toContain("<mj-image");
      expect(result).toContain('width="400px"');
    });

    it("should convert stretched image without width constraint", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "image",
            data: {
              file: {
                url: "https://example.com/image.jpg",
              },
              stretched: true,
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).not.toContain('width="400px"');
    });

    it("should convert image with border", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "image",
            data: {
              file: {
                url: "https://example.com/image.jpg",
              },
              withBorder: true,
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain('border="1px solid #e0e0e0"');
    });

    it("should skip image blocks without URL", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "image",
            data: {
              caption: "No URL",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).not.toContain("<mj-image");
    });

    it("should convert quote blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "quote",
            data: {
              text: "This is a quote",
              caption: "Author Name",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("This is a quote");
      expect(result).toContain("Author Name");
      expect(result).toContain("font-style=\"italic\"");
    });

    it("should convert delimiter blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "delimiter",
            data: {},
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("* * *");
    });

    it("should convert button blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "emailButton",
            data: {
              text: "Click Me",
              url: "https://example.com",
              backgroundColor: "#FF0000",
              textColor: "#FFFFFF",
              align: "center",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("Click Me");
      expect(result).toContain("https://example.com");
      expect(result).toContain('background-color="#FF0000"');
      expect(result).toContain('color="#FFFFFF"');
      expect(result).toContain("<mj-button");
    });

    it("should use default button values", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "emailButton",
            data: {},
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("Click here");
      expect(result).toContain('href="#"');
      expect(result).toContain('background-color="#4A90E2"');
    });

    it("should convert divider blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "emailDivider",
            data: {
              borderColor: "#000000",
              borderWidth: "2px",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("<mj-divider");
      expect(result).toContain('border-color="#000000"');
      expect(result).toContain('border-width="2px"');
    });

    it("should convert spacer blocks to MJML", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "emailSpacer",
            data: {
              height: "50px",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("<mj-spacer");
      expect(result).toContain('height="50px"');
    });

    it("should handle unknown block types with text data", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "unknownType",
            data: {
              text: "Unknown block text",
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("Unknown block text");
    });

    it("should skip unknown block types without text data", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "unknownType",
            data: {},
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      // Should still have valid MJML structure, but no content
      expect(result).toContain("<mjml>");
      expect(result).toContain("</mjml>");
    });

    it("should sanitize HTML to prevent XSS", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: '<script>alert("xss")</script>Normal text',
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Normal text");
    });

    it("should remove iframe tags", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: '<iframe src="malicious.com"></iframe>Safe text',
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).not.toContain("<iframe");
      expect(result).toContain("Safe text");
    });

    it("should remove event handlers", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "paragraph",
            data: {
              text: '<a onclick="alert(\'xss\')">Link</a>',
            },
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      expect(result).not.toContain("onclick");
    });

    it("should convert multiple blocks in correct order", () => {
      const data: OutputData = {
        time: Date.now(),
        blocks: [
          {
            id: "test-1",
            type: "header",
            data: {
              text: "Header",
              level: 1,
            },
          },
          {
            id: "test-2",
            type: "paragraph",
            data: {
              text: "Paragraph",
            },
          },
          {
            id: "test-3",
            type: "delimiter",
            data: {},
          },
        ],
        version: "2.28.0",
      };

      const result = editorJsToMjml(data);

      const headerIndex = result.indexOf("Header");
      const paragraphIndex = result.indexOf("Paragraph");
      const delimiterIndex = result.indexOf("* * *");

      expect(headerIndex).toBeLessThan(paragraphIndex);
      expect(paragraphIndex).toBeLessThan(delimiterIndex);
    });
  });

  describe("extractMjmlContent", () => {
    it("should extract content from mj-column tags", () => {
      const mjml = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>Content here</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const result = extractMjmlContent(mjml);

      expect(result).toContain("<mj-text>Content here</mj-text>");
      expect(result).not.toContain("<mj-column>");
      expect(result).not.toContain("<mjml>");
    });

    it("should fall back to mj-body content if no mj-column", () => {
      const mjml = `<mjml>
        <mj-body>
          <mj-section>
            <mj-text>Content here</mj-text>
          </mj-section>
        </mj-body>
      </mjml>`;

      const result = extractMjmlContent(mjml);

      expect(result).toContain("<mj-text>Content here</mj-text>");
      expect(result).not.toContain("<mj-body>");
    });

    it("should return input as-is if no matching tags", () => {
      const mjml = "<mj-text>Just text</mj-text>";

      const result = extractMjmlContent(mjml);

      expect(result).toBe(mjml);
    });
  });

  describe("mjmlToEditorJs", () => {
    it("should parse MJML to Editor.js format", () => {
      const mjml = `<mjml>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>First paragraph</mj-text>
              <mj-text>Second paragraph</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>`;

      const result = mjmlToEditorJs(mjml);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe("paragraph");
      expect(result.blocks[0].data.text).toContain("First paragraph");
      expect(result.blocks[1].data.text).toContain("Second paragraph");
      expect(result.version).toBe("2.28.0");
    });

    it("should return empty paragraph for empty MJML", () => {
      const mjml = "<mjml></mjml>";

      const result = mjmlToEditorJs(mjml);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe("paragraph");
      expect(result.blocks[0].data.text).toBe("");
    });

    it("should generate unique IDs for blocks", () => {
      const mjml = `<mjml>
        <mj-text>First</mj-text>
        <mj-text>Second</mj-text>
      </mjml>`;

      const result = mjmlToEditorJs(mjml);

      expect(result.blocks[0].id).toBeDefined();
      expect(result.blocks[1].id).toBeDefined();
      expect(result.blocks[0].id).not.toBe(result.blocks[1].id);
    });

    it("should include timestamp", () => {
      const mjml = "<mjml><mj-text>Test</mj-text></mjml>";
      const beforeTime = Date.now();

      const result = mjmlToEditorJs(mjml);

      const afterTime = Date.now();
      expect(result.time).toBeGreaterThanOrEqual(beforeTime);
      expect(result.time).toBeLessThanOrEqual(afterTime);
    });
  });
});

