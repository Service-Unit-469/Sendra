import { describe, expect, it } from "vitest";
import { evaluateTunes, applyTunes } from "../../src/tunes/manager";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("tune manager", () => {
  describe("evaluateTunes", () => {
    it("should return empty object when no tunes are present", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({});
    });

    it("should return empty object when tunes object is empty", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {},
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({});
    });

    it("should evaluate a single alignment tune", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({ align: "center" });
    });

    it("should evaluate a single color tune", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          colorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({ color: "#ff0000" });
    });

    it("should evaluate multiple tunes", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
          colorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({
        align: "center",
        color: "#ff0000",
      });
    });

    it("should evaluate all tune types", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "right",
          },
          colorTune: {
            color: "#0000ff",
          },
          backgroundColorTune: {
            color: "#f0f0f0",
          },
          paddingTune: {
            top: "10px",
            right: "10px",
            bottom: "10px",
            left: "10px",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({
        align: "right",
        color: "#0000ff",
        "container-background-color": "#f0f0f0",
        padding: "10px",
      });
    });

    it("should ignore unknown tune types", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
          unknownTune: {
            value: "something",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({ align: "center" });
    });

    it("should evaluate border tunes for divider", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
        tunes: {
          borderColorTune: {
            color: "#e0e0e0",
          },
          borderWidthTune: {
            size: "2px",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({
        "border-color": "#e0e0e0",
        "border-width": "2px",
      });
    });

    it("should evaluate height tune for spacer", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: { height: "20px" },
        tunes: {
          heightTune: {
            size: "40px",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({ height: "40px" });
    });

    it("should handle tunes that return empty objects", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          colorTune: {
            color: "transparent",
          },
          alignmentTune: {
            alignment: "left",
          },
        },
      };

      const result = evaluateTunes(block);

      expect(result).toEqual({ align: "left" });
    });
  });

  describe("applyTunes", () => {
    it("should return empty string when no tunes or additional attributes", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
      };

      const result = applyTunes(block);

      expect(result).toBe("");
    });

    it("should format a single tune as attribute", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = applyTunes(block);

      expect(result).toBe('align="center"');
    });

    it("should format multiple tunes as attributes", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
          colorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = applyTunes(block);

      expect(result).toContain('align="center"');
      expect(result).toContain('color="#ff0000"');
    });

    it("should include additional attributes", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: { level: 1, text: "Title" },
      };

      const result = applyTunes(block, { "font-size": "32px" });

      expect(result).toBe('font-size="32px"');
    });

    it("should combine tunes and additional attributes", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: { level: 1, text: "Title" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = applyTunes(block, { "font-size": "32px" });

      expect(result).toContain('align="center"');
      expect(result).toContain('font-size="32px"');
    });

    it("should allow additional attributes to override tune attributes", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "left",
          },
        },
      };

      const result = applyTunes(block, { align: "right" });

      expect(result).toBe('align="right"');
      expect(result).not.toContain("left");
    });

    it("should sanitize attribute values", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
      };

      const result = applyTunes(block, { color: '<script>alert("xss")</script>' });

      expect(result).not.toContain("<script>");
    });

    it("should handle empty string attribute values", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
      };

      const result = applyTunes(block, { color: "" });

      expect(result).toBe('color=""');
    });

    it("should handle null attribute values", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
      };

      const result = applyTunes(block, { color: null as any });

      expect(result).toBe('color=""');
    });

    it("should format all supported tune types", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          alignmentTune: {
            alignment: "right",
          },
          colorTune: {
            color: "#0000ff",
          },
          backgroundColorTune: {
            color: "#f0f0f0",
          },
          paddingTune: {
            top: "10px",
            right: "10px",
            bottom: "10px",
            left: "10px",
          },
        },
      };

      const result = applyTunes(block);

      expect(result).toContain('align="right"');
      expect(result).toContain('color="#0000ff"');
      expect(result).toContain('container-background-color="#f0f0f0"');
      expect(result).toContain('padding="10px"');
    });

    it("should handle complex attribute combinations", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: { text: "Click", url: "https://example.com" },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
          backgroundColorTune: {
            color: "#ff0000",
          },
          paddingTune: {
            top: "15px",
            right: "0px",
            bottom: "15px",
            left: "0px",
          },
        },
      };

      const result = applyTunes(block, { href: "https://example.com" });

      expect(result).toContain('align="center"');
      expect(result).toContain('background-color="#ff0000"');
      expect(result).toContain('padding-top="15px"');
      expect(result).toContain('padding-bottom="15px"');
      expect(result).toContain('href="https://example.com"');
      expect(result).not.toContain("padding-right");
      expect(result).not.toContain("padding-left");
    });

    it("should maintain consistent attribute ordering", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
        tunes: {
          colorTune: {
            color: "#ff0000",
          },
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result1 = applyTunes(block);
      const result2 = applyTunes(block);

      expect(result1).toBe(result2);
    });

    it("should handle special characters in attribute values", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Hello" },
      };

      const result = applyTunes(block, { color: "#ff0000 & more" });

      expect(result).toContain("#ff0000 & more");
    });
  });

  describe("integration tests", () => {
    it("should work correctly with paragraph block", () => {
      const block: OutputBlockData = {
        id: "p1",
        type: "paragraph",
        data: { text: "Styled paragraph" },
        tunes: {
          alignmentTune: { alignment: "center" },
          colorTune: { color: "#333333" },
          paddingTune: {
            top: "20px",
            right: "0px",
            bottom: "20px",
            left: "0px",
          },
        },
      };

      const attributes = evaluateTunes(block);
      const formatted = applyTunes(block);

      expect(attributes).toEqual({
        align: "center",
        color: "#333333",
        "padding-top": "20px",
        "padding-bottom": "20px",
      });
      expect(formatted).toContain('align="center"');
      expect(formatted).toContain('color="#333333"');
      expect(formatted).toContain('padding-top="20px"');
      expect(formatted).toContain('padding-bottom="20px"');
    });

    it("should work correctly with header block", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: { level: 1, text: "Main Title" },
        tunes: {
          alignmentTune: { alignment: "center" },
          colorTune: { color: "#000000" },
        },
      };

      const formatted = applyTunes(block, { "font-size": "32px" });

      expect(formatted).toContain('align="center"');
      expect(formatted).toContain('color="#000000"');
      expect(formatted).toContain('font-size="32px"');
    });

    it("should work correctly with divider block", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
        tunes: {
          borderColorTune: { color: "#cccccc" },
          borderWidthTune: { size: "2px" },
        },
      };

      const attributes = evaluateTunes(block);

      expect(attributes).toEqual({
        "border-color": "#cccccc",
        "border-width": "2px",
      });
    });

    it("should work correctly with spacer block", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: { height: "20px" },
        tunes: {
          heightTune: { size: "50px" },
        },
      };

      const formatted = applyTunes(block, { height: "20px" });

      // heightTune should be evaluated first, then overridden by additional attributes
      expect(formatted).toBe('height="20px"');
    });

    it("should work correctly with button block", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: { text: "Click Me", url: "https://example.com" },
        tunes: {
          alignmentTune: { alignment: "center" },
          backgroundColorTune: { color: "#007bff" },
          colorTune: { color: "#ffffff" },
        },
      };

      const formatted = applyTunes(block);

      expect(formatted).toContain('align="center"');
      expect(formatted).toContain('background-color="#007bff"');
      expect(formatted).toContain('color="#ffffff"');
    });
  });
});


