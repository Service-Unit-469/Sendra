import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/border-width";

describe("border-width tune", () => {
  it("should return border-width for valid size", () => {
    const result = handleTune({
      tune: "borderWidthTune",
      config: { size: "2px" },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-width": "2px" });
  });

  it("should use default 1px when not provided", () => {
    const result = handleTune({
      tune: "borderWidthTune",
      config: {},
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-width": "1px" });
  });

  it("should handle size value of 0", () => {
    const result = handleTune({
      tune: "borderWidthTune",
      config: { size: "0px" },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-width": "0px" });
  });

  describe("size formats", () => {
    it("should handle px sizes", () => {
      const result = handleTune({
        tune: "borderWidthTune",
        config: { size: "3px" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-width": "3px" });
    });

    it("should handle em sizes", () => {
      const result = handleTune({
        tune: "borderWidthTune",
        config: { size: "0.5em" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-width": "0.5em" });
    });

    it("should handle rem sizes", () => {
      const result = handleTune({
        tune: "borderWidthTune",
        config: { size: "0.25rem" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-width": "0.25rem" });
    });

    it("should handle percentage sizes", () => {
      const result = handleTune({
        tune: "borderWidthTune",
        config: { size: "1%" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-width": "1%" });
    });
  });

  it("should work with different block types", () => {
    const blocks = ["emailDivider", "emailButton", "paragraph"] as const;

    for (const block of blocks) {
      const result = handleTune({
        tune: "borderWidthTune",
        config: { size: "5px" },
        block,
      });

      expect(result).toEqual({ "border-width": "5px" });
    }
  });

  it("should handle very small border widths", () => {
    const result = handleTune({
      tune: "borderWidthTune",
      config: { size: "0.1px" },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-width": "0.1px" });
  });

  it("should handle very large border widths", () => {
    const result = handleTune({
      tune: "borderWidthTune",
      config: { size: "100px" },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-width": "100px" });
  });

  it("should handle undefined size by using default", () => {
    const result = handleTune({
      tune: "borderWidthTune",
      config: { size: undefined },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-width": "1px" });
  });
});

