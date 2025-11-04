import { describe, expect, it } from "vitest";
import { editorJsToMjml } from "../src/EditorJsToMjml";
import type { OutputData } from "@editorjs/editorjs";

describe("editorJsToMjml", () => {
  describe("empty data handling", () => {
    it("should return empty message when no blocks provided", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        "<mj-text>Start editing your email by clicking the + button below</mj-text>"
      );
    });

    it("should return empty message when blocks is undefined", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: undefined as any,
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        "<mj-text>Start editing your email by clicking the + button below</mj-text>"
      );
    });
  });

  describe("single block rendering", () => {
    it("should render a header block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "header1",
            type: "header",
            data: {
              level: 1,
              text: "Welcome to Newsletter",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-text font-size="32px">Welcome to Newsletter</mj-text>'
      );
    });

    it("should render a paragraph block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "para1",
            type: "paragraph",
            data: {
              text: "This is a paragraph.",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe("<mj-text>This is a paragraph.</mj-text>");
    });

    it("should render a list block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "list1",
            type: "list",
            data: {
              style: "unordered",
              items: ["Item 1", "Item 2"],
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-text padding-bottom="10px"><ul><li>Item 1</li><li>Item 2</li></ul></mj-text>'
      );
    });

    it("should render an image block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "img1",
            type: "image",
            data: {
              file: {
                url: "https://example.com/image.jpg",
              },
              caption: "Test image",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-image src="https://example.com/image.jpg" alt="Test image" />'
      );
    });

    it("should render an emailButton block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "btn1",
            type: "emailButton",
            data: {
              text: "Click Me",
              url: "https://example.com",
              backgroundColor: "#4A90E2",
              textColor: "#FFFFFF",
              align: "center",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-button href="https://example.com" background-color="#4A90E2" color="#FFFFFF" align="center" padding="10px 0">Click Me</mj-button>'
      );
    });

    it("should render an emailDivider block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "div1",
            type: "emailDivider",
            data: {
              borderColor: "#e0e0e0",
              borderWidth: "1px",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-divider border-width="1px" border-color="#e0e0e0" />'
      );
    });

    it("should render an emailSpacer block", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "spacer1",
            type: "emailSpacer",
            data: {
              height: "20px",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe('<mj-spacer height="20px" />');
    });
  });

  describe("multiple blocks rendering", () => {
    it("should render multiple blocks separated by newlines", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "h1",
            type: "header",
            data: {
              level: 1,
              text: "Title",
            },
          },
          {
            id: "p1",
            type: "paragraph",
            data: {
              text: "First paragraph.",
            },
          },
          {
            id: "p2",
            type: "paragraph",
            data: {
              text: "Second paragraph.",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-text font-size="32px">Title</mj-text>\n<mj-text>First paragraph.</mj-text>\n<mj-text>Second paragraph.</mj-text>'
      );
    });

    it("should render complex email with various block types", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "h1",
            type: "header",
            data: {
              level: 2,
              text: "Newsletter Title",
            },
          },
          {
            id: "spacer1",
            type: "emailSpacer",
            data: {
              height: "20px",
            },
          },
          {
            id: "p1",
            type: "paragraph",
            data: {
              text: "Welcome to our newsletter!",
            },
          },
          {
            id: "img1",
            type: "image",
            data: {
              file: {
                url: "https://example.com/banner.jpg",
              },
            },
          },
          {
            id: "list1",
            type: "list",
            data: {
              style: "ordered",
              items: ["Feature 1", "Feature 2", "Feature 3"],
            },
          },
          {
            id: "p2",
            type: "paragraph",
            data: {
              text: "Check out our latest features!",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toContain('<mj-text font-size="28px">Newsletter Title</mj-text>');
      expect(result).toContain('<mj-spacer height="20px" />');
      expect(result).toContain("<mj-text>Welcome to our newsletter!</mj-text>");
      expect(result).toContain('<mj-image src="https://example.com/banner.jpg" alt="" />');
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>Feature 1</li>");
      expect(result).toContain("Check out our latest features!");
      // Verify blocks are separated by newlines
      expect(result.split("\n")).toHaveLength(6);
    });
  });

  describe("unknown block types", () => {
    it("should return empty string for unknown block without text", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "unknown1",
            type: "unknownType",
            data: {
              someProperty: "value",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe("");
    });

    it("should fallback to paragraph for unknown block with text", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "unknown2",
            type: "customBlock",
            data: {
              text: "This is fallback text",
              otherProp: "ignored",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe("<mj-text>This is fallback text</mj-text>");
    });

    it("should sanitize HTML in fallback text", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "unknown3",
            type: "customBlock",
            data: {
              text: '<script>alert("xss")</script>Safe text',
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe text");
    });

    it("should handle mix of known and unknown blocks", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "h1",
            type: "header",
            data: {
              level: 1,
              text: "Known Block",
            },
          },
          {
            id: "unknown1",
            type: "unknownType",
            data: {
              text: "Unknown with text",
            },
          },
          {
            id: "unknown2",
            type: "anotherUnknown",
            data: {
              noText: true,
            },
          },
          {
            id: "p1",
            type: "paragraph",
            data: {
              text: "Another known block",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      // Should have 4 blocks: header, fallback paragraph, empty string, paragraph
      // Empty strings should not contribute to output, so we get 3 lines
      expect(result).toContain('<mj-text font-size="32px">Known Block</mj-text>');
      expect(result).toContain("<mj-text>Unknown with text</mj-text>");
      expect(result).toContain("<mj-text>Another known block</mj-text>");
    });
  });

  describe("edge cases", () => {
    it("should handle blocks with special characters", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "p1",
            type: "paragraph",
            data: {
              text: "Text with <>&\"' special chars",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      // DOMPurify will sanitize these
      expect(result).toContain("special chars");
    });

    it("should handle blocks with empty data objects", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "h1",
            type: "header",
            data: {
              level: 2,
              text: "",
            },
          },
          {
            id: "p1",
            type: "paragraph",
            data: {
              text: "",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe(
        '<mj-text font-size="28px"></mj-text>\n<mj-text></mj-text>'
      );
    });

    it("should handle image blocks without URL gracefully", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "img1",
            type: "image",
            data: {
              file: {},
              caption: "Image without URL",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      // renderImage returns empty string when no URL
      expect(result).toBe("");
    });

    it("should preserve order of blocks", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "1",
            type: "paragraph",
            data: { text: "First" },
          },
          {
            id: "2",
            type: "paragraph",
            data: { text: "Second" },
          },
          {
            id: "3",
            type: "paragraph",
            data: { text: "Third" },
          },
        ],
      };

      const result = editorJsToMjml(data);

      const lines = result.split("\n");
      expect(lines[0]).toContain("First");
      expect(lines[1]).toContain("Second");
      expect(lines[2]).toContain("Third");
    });
  });

  describe("data validation", () => {
    it("should validate and parse header schema correctly", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "h1",
            type: "header",
            data: {
              level: 3,
              text: "Valid header",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe('<mj-text font-size="24px">Valid header</mj-text>');
    });

    it("should validate and parse list schema correctly", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "list1",
            type: "list",
            data: {
              style: "ordered",
              items: ["First", "Second", "Third"],
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toContain("<ol>");
      expect(result).toContain("First");
      expect(result).toContain("Second");
      expect(result).toContain("Third");
    });
  });

  describe("block type routing", () => {
    it("should handle emailSpacer through the switch statement", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "spacer1",
            type: "emailSpacer",
            data: {
              height: "30px",
            },
          },
        ],
      };

      const result = editorJsToMjml(data);

      expect(result).toBe('<mj-spacer height="30px" />');
    });

    it("should handle unknown button type as fallback", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "btn1",
            type: "button",
            data: {
              text: "Click",
              url: "https://example.com",
            },
          },
        ],
      };

      // Falls through to default case and renders text property
      const result = editorJsToMjml(data);
      expect(result).toBe("<mj-text>Click</mj-text>");
    });

    it("should handle unknown delimiter type as empty", () => {
      const data: OutputData = {
        time: Date.now(),
        version: "2.0",
        blocks: [
          {
            id: "div1",
            type: "delimiter",
            data: {
              borderColor: "#e0e0e0",
            },
          },
        ],
      };

      // Falls through to default case and returns empty (no text property)
      const result = editorJsToMjml(data);
      expect(result).toBe("");
    });
  });
});

