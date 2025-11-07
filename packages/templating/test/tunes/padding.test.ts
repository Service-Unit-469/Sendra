import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/padding";

describe("padding tune", () => {
  describe("uniform padding", () => {
    it("should return padding shorthand when all sides are equal and non-zero", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "10px",
          right: "10px",
          bottom: "10px",
          left: "10px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "10px" });
    });

    it("should return padding shorthand for 20px on all sides", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "20px" });
    });
  });

  describe("individual padding sides", () => {
    it("should return individual padding values when they differ", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "10px",
          right: "20px",
          bottom: "10px",
          left: "20px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-top": "10px",
        "padding-right": "20px",
        "padding-bottom": "10px",
        "padding-left": "20px",
      });
    });

    it("should only include non-zero padding sides", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "10px",
          right: "0px",
          bottom: "10px",
          left: "0px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-top": "10px",
        "padding-bottom": "10px",
      });
    });

    it("should handle only top padding", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "15px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-top": "15px",
      });
    });

    it("should handle only right padding", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "0px",
          right: "25px",
          bottom: "0px",
          left: "0px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-right": "25px",
      });
    });

    it("should handle only bottom padding", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "0px",
          right: "0px",
          bottom: "30px",
          left: "0px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-bottom": "30px",
      });
    });

    it("should handle only left padding", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "35px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-left": "35px",
      });
    });
  });

  describe("default values", () => {
    it("should use default 0px when not provided", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {},
        block: "paragraph",
      });

      expect(result).toEqual({});
    });

    it("should not include padding shorthand when all sides are 0px", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "0px",
          right: "0px",
          bottom: "0px",
          left: "0px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({});
    });
  });

  describe("size formats", () => {
    it("should handle em units", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "1em",
          right: "1em",
          bottom: "1em",
          left: "1em",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "1em" });
    });

    it("should handle rem units", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "2rem",
          right: "2rem",
          bottom: "2rem",
          left: "2rem",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "2rem" });
    });

    it("should handle percentage units", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "5%",
          right: "5%",
          bottom: "5%",
          left: "5%",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "5%" });
    });

    it("should handle mixed units", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "10px",
          right: "1em",
          bottom: "2rem",
          left: "5%",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-top": "10px",
        "padding-right": "1em",
        "padding-bottom": "2rem",
        "padding-left": "5%",
      });
    });
  });

  it("should work with different block types", () => {
    const blocks = ["paragraph", "header", "list", "image", "emailButton"] as const;

    for (const block of blocks) {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "15px",
          right: "15px",
          bottom: "15px",
          left: "15px",
        },
        block,
      });

      expect(result).toEqual({ padding: "15px" });
    }
  });

  describe("edge cases", () => {
    it("should handle vertical padding only", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "10px",
          right: "0px",
          bottom: "10px",
          left: "0px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-top": "10px",
        "padding-bottom": "10px",
      });
    });

    it("should handle horizontal padding only", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "0px",
          right: "15px",
          bottom: "0px",
          left: "15px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-right": "15px",
        "padding-left": "15px",
      });
    });

    it("should handle asymmetric padding", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "5px",
          right: "10px",
          bottom: "15px",
          left: "20px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({
        "padding-top": "5px",
        "padding-right": "10px",
        "padding-bottom": "15px",
        "padding-left": "20px",
      });
    });

    it("should handle very large padding values", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "500px",
          right: "500px",
          bottom: "500px",
          left: "500px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "500px" });
    });

    it("should handle fractional values", () => {
      const result = handleTune({
        tune: "paddingTune",
        config: {
          top: "5.5px",
          right: "5.5px",
          bottom: "5.5px",
          left: "5.5px",
        },
        block: "paragraph",
      });

      expect(result).toEqual({ padding: "5.5px" });
    });
  });
});


