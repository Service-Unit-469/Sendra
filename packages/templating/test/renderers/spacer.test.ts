import { describe, expect, it } from "vitest";
import { renderSpacer, spacerSchema } from "../../src/renderers/spacer";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("spacer renderer", () => {
  describe("spacerSchema", () => {
    it("should validate a valid spacer block", () => {
      const block = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "20px",
        },
      };

      const result = spacerSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.height).toBe("20px");
      }
    });

    it("should use default height when not provided", () => {
      const block = {
        type: "spacer",
        data: {},
      };

      const result = spacerSchema.parse(block);

      expect(result.data.height).toBe("20px");
    });

    it("should reject non-spacer type", () => {
      const block = {
        type: "paragraph",
        data: {
          text: "Not a spacer",
        },
      };

      const result = spacerSchema.safeParse(block);

      expect(result.success).toBe(false);
    });

    it("should accept various height formats", () => {
      const heights = ["10px", "2em", "5rem", "50%"];

      for (const height of heights) {
        const block = {
          type: "spacer",
          data: { height },
        };

        const result = spacerSchema.safeParse(block);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.data.height).toBe(height);
        }
      }
    });
  });

  describe("renderSpacer", () => {
    it("should render a basic spacer", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "20px",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="20px" />');
    });

    it("should render with custom height", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "50px",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="50px" />');
    });

    it("should render with height in em", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "2em",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="2em" />');
    });

    it("should render with height in rem", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "3rem",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="3rem" />');
    });

    it("should render with height in percentage", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "10%",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="10%" />');
    });

    it("should handle very small heights", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "1px",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="1px" />');
    });

    it("should handle very large heights", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "500px",
        },
      };

      const result = renderSpacer(block);

      expect(result).toBe('<mj-spacer height="500px" />');
    });

    it("should render with height tune", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "20px",
        },
        tunes: {
          heightTune: {
            size: "40px",
          },
        },
      };

      const result = renderSpacer(block);

      // Additional attributes override tunes, so we see data height (20px)
      // but tune height (40px) is also in the result before being overridden
      expect(result).toContain('height="20px"');
    });

    it("should render with padding tune", () => {
      const block: OutputBlockData = {
        id: "spacer1",
        type: "spacer",
        data: {
          height: "20px",
        },
        tunes: {
          paddingTune: {
            top: "10px",
            right: "0px",
            bottom: "10px",
            left: "0px",
          },
        },
      };

      const result = renderSpacer(block);

      expect(result).toContain('height="20px"');
      expect(result).toContain('padding-top="10px"');
      expect(result).toContain('padding-bottom="10px"');
    });
  });
});

