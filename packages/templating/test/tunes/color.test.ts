import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/color";

describe("color tune", () => {
  it("should return color for valid color", () => {
    const result = handleTune({
      tune: "colorTune",
      config: { color: "#ff0000" },
      block: "paragraph",
    });

    expect(result).toEqual({ color: "#ff0000" });
  });

  it("should return empty object when color is transparent", () => {
    const result = handleTune({
      tune: "colorTune",
      config: { color: "transparent" },
      block: "paragraph",
    });

    expect(result).toEqual({});
  });

  it("should return empty object when color is not provided", () => {
    const result = handleTune({
      tune: "colorTune",
      config: {},
      block: "paragraph",
    });

    expect(result).toEqual({});
  });

  it("should return empty object when color is empty string", () => {
    const result = handleTune({
      tune: "colorTune",
      config: { color: "" },
      block: "paragraph",
    });

    expect(result).toEqual({});
  });

  describe("color formats", () => {
    it("should handle hex colors", () => {
      const result = handleTune({
        tune: "colorTune",
        config: { color: "#ff6600" },
        block: "paragraph",
      });

      expect(result).toEqual({ color: "#ff6600" });
    });

    it("should handle short hex colors", () => {
      const result = handleTune({
        tune: "colorTune",
        config: { color: "#f60" },
        block: "paragraph",
      });

      expect(result).toEqual({ color: "#f60" });
    });

    it("should handle rgb colors", () => {
      const result = handleTune({
        tune: "colorTune",
        config: { color: "rgb(255, 0, 0)" },
        block: "paragraph",
      });

      expect(result).toEqual({ color: "rgb(255, 0, 0)" });
    });

    it("should handle rgba colors", () => {
      const result = handleTune({
        tune: "colorTune",
        config: { color: "rgba(255, 0, 0, 0.5)" },
        block: "paragraph",
      });

      expect(result).toEqual({ color: "rgba(255, 0, 0, 0.5)" });
    });

    it("should handle named colors", () => {
      const result = handleTune({
        tune: "colorTune",
        config: { color: "red" },
        block: "paragraph",
      });

      expect(result).toEqual({ color: "red" });
    });
  });

  it("should work with different block types", () => {
    const blocks = ["paragraph", "header", "list"] as const;

    for (const block of blocks) {
      const result = handleTune({
        tune: "colorTune",
        config: { color: "#0000ff" },
        block,
      });

      expect(result).toEqual({ color: "#0000ff" });
    }
  });

  it("should use default transparent when not provided", () => {
    const result = handleTune({
      tune: "colorTune",
      config: {},
      block: "paragraph",
    });

    expect(result).toEqual({});
  });

  it("should handle edge case colors", () => {
    const result = handleTune({
      tune: "colorTune",
      config: { color: "#000000" },
      block: "paragraph",
    });

    expect(result).toEqual({ color: "#000000" });
  });

  it("should handle white color", () => {
    const result = handleTune({
      tune: "colorTune",
      config: { color: "#ffffff" },
      block: "paragraph",
    });

    expect(result).toEqual({ color: "#ffffff" });
  });
});


