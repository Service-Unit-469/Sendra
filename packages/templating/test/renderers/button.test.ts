import { describe, expect, it } from "vitest";
import { renderButton, buttonSchema } from "../../src/renderers/button";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("button renderer", () => {
  describe("buttonSchema", () => {
    it("should validate a valid button block", () => {
      const block = {
        id: "btn1",
        type: "button",
        data: {
          text: "Click Me",
          url: "https://example.com",
        },
      };

      const result = buttonSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.text).toBe("Click Me");
        expect(result.data.data.url).toBe("https://example.com");
      }
    });

    it("should use default text when not provided", () => {
      const block = {
        type: "button",
        data: {
          url: "https://example.com",
        },
      };

      const result = buttonSchema.parse(block);

      expect(result.data.text).toBe("Click here");
    });

    it("should use default url when not provided", () => {
      const block = {
        type: "button",
        data: {
          text: "Click Me",
        },
      };

      const result = buttonSchema.parse(block);

      expect(result.data.url).toBe("#");
    });

    it("should reject non-button type", () => {
      const block = {
        type: "paragraph",
        data: {
          text: "Not a button",
        },
      };

      const result = buttonSchema.safeParse(block);

      expect(result.success).toBe(false);
    });
  });

  describe("renderButton", () => {
    it("should render a basic button", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: "Click Me",
          url: "https://example.com",
        },
      };

      const result = renderButton(block);

      expect(result).toBe('<mj-button href="https://example.com" >Click Me</mj-button>');
    });

    it("should sanitize button text", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: '<script>alert("xss")</script>Click',
          url: "https://example.com",
        },
      };

      const result = renderButton(block);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Click");
    });

    it("should handle empty text", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: "",
          url: "https://example.com",
        },
      };

      const result = renderButton(block);

      expect(result).toBe('<mj-button href="https://example.com" ></mj-button>');
    });

    it("should render with tunes", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: "Click Me",
          url: "https://example.com",
        },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
          backgroundColorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = renderButton(block);

      expect(result).toContain('align="center"');
      expect(result).toContain('background-color="#ff0000"');
      expect(result).toContain("Click Me");
    });

    it("should handle special characters in URL", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: "Click",
          url: "https://example.com?param=value&foo=bar",
        },
      };

      const result = renderButton(block);

      expect(result).toContain('href="https://example.com?param=value&foo=bar"');
    });

    it("should handle anchor links", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: "Go to top",
          url: "#top",
        },
      };

      const result = renderButton(block);

      expect(result).toContain('href="#top"');
    });

    it("should handle mailto links", () => {
      const block: OutputBlockData = {
        id: "btn1",
        type: "button",
        data: {
          text: "Email Us",
          url: "mailto:test@example.com",
        },
      };

      const result = renderButton(block);

      expect(result).toContain('href="mailto:test@example.com"');
    });
  });
});

