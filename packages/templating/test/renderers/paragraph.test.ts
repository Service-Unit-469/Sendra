import { describe, expect, it } from "vitest";
import { renderParagraph, paragraphSchema } from "../../src/renderers/paragraph";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("paragraph renderer", () => {
  describe("paragraphSchema", () => {
    it("should validate a valid paragraph block", () => {
      const block = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "This is a paragraph.",
        },
      };

      const result = paragraphSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.text).toBe("This is a paragraph.");
      }
    });

    it("should use default text when not provided", () => {
      const block = {
        type: "paragraph",
        data: {},
      };

      const result = paragraphSchema.parse(block);

      expect(result.data.text).toBe("");
    });

    it("should reject non-paragraph type", () => {
      const block = {
        type: "header",
        data: {
          text: "Not a paragraph",
        },
      };

      const result = paragraphSchema.safeParse(block);

      expect(result.success).toBe(false);
    });
  });

  describe("renderParagraph", () => {
    it("should render a basic paragraph", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "This is a paragraph.",
        },
      };

      const result = renderParagraph(block);

      expect(result).toBe("<mj-text >This is a paragraph.</mj-text>");
    });

    it("should sanitize paragraph text", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: '<script>alert("xss")</script>Safe text',
        },
      };

      const result = renderParagraph(block);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe text");
    });

    it("should handle empty text", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "",
        },
      };

      const result = renderParagraph(block);

      expect(result).toBe("<mj-text ></mj-text>");
    });

    it("should render with alignment tune", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Centered text",
        },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain('align="center"');
      expect(result).toContain("Centered text");
    });

    it("should render with color tune", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Colored text",
        },
        tunes: {
          colorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain('color="#ff0000"');
      expect(result).toContain("Colored text");
    });

    it("should render with background color tune", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Text with background",
        },
        tunes: {
          backgroundColorTune: {
            color: "#f0f0f0",
          },
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain('container-background-color="#f0f0f0"');
      expect(result).toContain("Text with background");
    });

    it("should render with padding tune", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Padded text",
        },
        tunes: {
          paddingTune: {
            top: "20px",
            right: "20px",
            bottom: "20px",
            left: "20px",
          },
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain('padding="20px"');
      expect(result).toContain("Padded text");
    });

    it("should render with multiple tunes", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Fully styled text",
        },
        tunes: {
          alignmentTune: {
            alignment: "right",
          },
          colorTune: {
            color: "#0000ff",
          },
          paddingTune: {
            top: "10px",
            right: "10px",
            bottom: "10px",
            left: "10px",
          },
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain('align="right"');
      expect(result).toContain('color="#0000ff"');
      expect(result).toContain('padding="10px"');
      expect(result).toContain("Fully styled text");
    });

    it("should handle special characters in text", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Price: $29.99 & Up! <tag>",
        },
      };

      const result = renderParagraph(block);

      // DOMPurify sanitizes & to &amp; and removes <tag>
      expect(result).toContain("Price: $29.99");
      expect(result).toContain("Up!");
    });

    it("should handle multiline text", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: "Line 1\nLine 2\nLine 3",
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
      expect(result).toContain("Line 3");
    });

    it("should handle very long text", () => {
      const longText = "A".repeat(1000);
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: {
          text: longText,
        },
      };

      const result = renderParagraph(block);

      expect(result).toContain(longText);
    });
  });
});

