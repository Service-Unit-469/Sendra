import { describe, expect, it } from "vitest";
import { renderDivider, dividerSchema } from "../../src/renderers/divider";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("divider renderer", () => {
  describe("dividerSchema", () => {
    it("should validate a valid divider block", () => {
      const block = {
        id: "div1",
        type: "divider",
        data: {},
      };

      const result = dividerSchema.safeParse(block);

      expect(result.success).toBe(true);
    });

    it("should reject non-divider type", () => {
      const block = {
        type: "paragraph",
        data: {},
      };

      const result = dividerSchema.safeParse(block);

      expect(result.success).toBe(false);
    });

    it("should accept empty data object", () => {
      const block = {
        type: "divider",
        data: {},
      };

      const result = dividerSchema.safeParse(block);

      expect(result.success).toBe(true);
    });
  });

  describe("renderDivider", () => {
    it("should render a basic divider", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
      };

      const result = renderDivider(block);

      expect(result).toBe("<mj-divider  />");
    });

    it("should render with border color tune", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
        tunes: {
          borderColorTune: {
            color: "#e0e0e0",
          },
        },
      };

      const result = renderDivider(block);

      expect(result).toContain('border-color="#e0e0e0"');
    });

    it("should render with border width tune", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
        tunes: {
          borderWidthTune: {
            size: "2px",
          },
        },
      };

      const result = renderDivider(block);

      expect(result).toContain('border-width="2px"');
    });

    it("should render with multiple tunes", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
        tunes: {
          borderColorTune: {
            color: "#ff0000",
          },
          borderWidthTune: {
            size: "3px",
          },
        },
      };

      const result = renderDivider(block);

      expect(result).toContain('border-color="#ff0000"');
      expect(result).toContain('border-width="3px"');
    });

    it("should render with padding tune", () => {
      const block: OutputBlockData = {
        id: "div1",
        type: "divider",
        data: {},
        tunes: {
          paddingTune: {
            top: "10px",
            right: "0px",
            bottom: "10px",
            left: "0px",
          },
        },
      };

      const result = renderDivider(block);

      expect(result).toContain('padding-top="10px"');
      expect(result).toContain('padding-bottom="10px"');
    });
  });
});

