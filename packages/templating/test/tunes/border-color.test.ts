import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/border-color";

describe("border-color tune", () => {
  it("should return border-color for valid color", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: { color: "#ff0000" },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-color": "#ff0000" });
  });

  it("should return empty object when color is transparent", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: { color: "transparent" },
      block: "emailDivider",
    });

    expect(result).toEqual({});
  });

  it("should return empty object when color is default black", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: { color: "#000000" },
      block: "emailDivider",
    });

    expect(result).toEqual({});
  });

  it("should return empty object when color is not provided", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: {},
      block: "emailDivider",
    });

    expect(result).toEqual({});
  });

  it("should return empty object when color is empty string", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: { color: "" },
      block: "emailDivider",
    });

    expect(result).toEqual({});
  });

  describe("color formats", () => {
    it("should handle hex colors", () => {
      const result = handleTune({
        tune: "borderColorTune",
        config: { color: "#ff6600" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-color": "#ff6600" });
    });

    it("should handle short hex colors", () => {
      const result = handleTune({
        tune: "borderColorTune",
        config: { color: "#f60" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-color": "#f60" });
    });

    it("should handle rgb colors", () => {
      const result = handleTune({
        tune: "borderColorTune",
        config: { color: "rgb(255, 0, 0)" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-color": "rgb(255, 0, 0)" });
    });

    it("should handle rgba colors", () => {
      const result = handleTune({
        tune: "borderColorTune",
        config: { color: "rgba(100, 100, 100, 0.5)" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-color": "rgba(100, 100, 100, 0.5)" });
    });

    it("should handle named colors", () => {
      const result = handleTune({
        tune: "borderColorTune",
        config: { color: "red" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "border-color": "red" });
    });
  });

  it("should work with different block types", () => {
    const blocks = ["emailDivider", "emailButton", "paragraph"] as const;

    for (const block of blocks) {
      const result = handleTune({
        tune: "borderColorTune",
        config: { color: "#00ff00" },
        block,
      });

      expect(result).toEqual({ "border-color": "#00ff00" });
    }
  });

  it("should use default #000000 when not provided", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: {},
      block: "emailDivider",
    });

    expect(result).toEqual({});
  });

  it("should handle edge case colors", () => {
    const result = handleTune({
      tune: "borderColorTune",
      config: { color: "#ffffff" },
      block: "emailDivider",
    });

    expect(result).toEqual({ "border-color": "#ffffff" });
  });
});


