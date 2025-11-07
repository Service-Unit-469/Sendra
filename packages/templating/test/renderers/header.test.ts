import { describe, expect, it } from "vitest";
import { renderHeader, headerSchema } from "../../src/renderers/header";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("header renderer", () => {
  describe("headerSchema", () => {
    it("should validate a valid header block", () => {
      const block = {
        id: "h1",
        type: "header",
        data: {
          level: 1,
          text: "Title",
        },
      };

      const result = headerSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.level).toBe(1);
        expect(result.data.data.text).toBe("Title");
      }
    });

    it("should use default level when not provided", () => {
      const block = {
        type: "header",
        data: {
          text: "Title",
        },
      };

      const result = headerSchema.parse(block);

      expect(result.data.level).toBe(2);
    });

    it("should use default text when not provided", () => {
      const block = {
        type: "header",
        data: {
          level: 1,
        },
      };

      const result = headerSchema.parse(block);

      expect(result.data.text).toBe("");
    });

    it("should reject level less than 1", () => {
      const block = {
        type: "header",
        data: {
          level: 0,
          text: "Invalid",
        },
      };

      const result = headerSchema.safeParse(block);

      expect(result.success).toBe(false);
    });

    it("should reject level greater than 6", () => {
      const block = {
        type: "header",
        data: {
          level: 7,
          text: "Invalid",
        },
      };

      const result = headerSchema.safeParse(block);

      expect(result.success).toBe(false);
    });

    it("should reject non-header type", () => {
      const block = {
        type: "paragraph",
        data: {
          text: "Not a header",
        },
      };

      const result = headerSchema.safeParse(block);

      expect(result.success).toBe(false);
    });
  });

  describe("renderHeader", () => {
    it("should render h1 with 32px font size", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 1,
          text: "Heading 1",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="32px">Heading 1</mj-text>');
    });

    it("should render h2 with 28px font size", () => {
      const block: OutputBlockData = {
        id: "h2",
        type: "header",
        data: {
          level: 2,
          text: "Heading 2",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="28px">Heading 2</mj-text>');
    });

    it("should render h3 with 24px font size", () => {
      const block: OutputBlockData = {
        id: "h3",
        type: "header",
        data: {
          level: 3,
          text: "Heading 3",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="24px">Heading 3</mj-text>');
    });

    it("should render h4 with 20px font size", () => {
      const block: OutputBlockData = {
        id: "h4",
        type: "header",
        data: {
          level: 4,
          text: "Heading 4",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="20px">Heading 4</mj-text>');
    });

    it("should render h5 with 18px font size", () => {
      const block: OutputBlockData = {
        id: "h5",
        type: "header",
        data: {
          level: 5,
          text: "Heading 5",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="18px">Heading 5</mj-text>');
    });

    it("should render h6 with 16px font size", () => {
      const block: OutputBlockData = {
        id: "h6",
        type: "header",
        data: {
          level: 6,
          text: "Heading 6",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="16px">Heading 6</mj-text>');
    });

    it("should sanitize header text", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 1,
          text: '<script>alert("xss")</script>Title',
        },
      };

      const result = renderHeader(block);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Title");
    });

    it("should handle empty text", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 2,
          text: "",
        },
      };

      const result = renderHeader(block);

      expect(result).toBe('<mj-text font-size="28px"></mj-text>');
    });

    it("should render with alignment tune", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 1,
          text: "Centered Title",
        },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = renderHeader(block);

      expect(result).toContain('align="center"');
      expect(result).toContain('font-size="32px"');
      expect(result).toContain("Centered Title");
    });

    it("should render with color tune", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 1,
          text: "Colored Title",
        },
        tunes: {
          colorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = renderHeader(block);

      expect(result).toContain('color="#ff0000"');
      expect(result).toContain("Colored Title");
    });

    it("should render with multiple tunes", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 2,
          text: "Styled Title",
        },
        tunes: {
          alignmentTune: {
            alignment: "right",
          },
          colorTune: {
            color: "#0000ff",
          },
          paddingTune: {
            top: "20px",
            right: "0px",
            bottom: "20px",
            left: "0px",
          },
        },
      };

      const result = renderHeader(block);

      expect(result).toContain('align="right"');
      expect(result).toContain('color="#0000ff"');
      expect(result).toContain('padding-top="20px"');
      expect(result).toContain('font-size="28px"');
    });

    it("should handle special characters in text", () => {
      const block: OutputBlockData = {
        id: "h1",
        type: "header",
        data: {
          level: 1,
          text: "Price: $29.99 & Up!",
        },
      };

      const result = renderHeader(block);

      expect(result).toContain("Price: $29.99 & Up!");
    });
  });
});

