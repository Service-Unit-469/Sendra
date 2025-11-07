import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/background-color";

describe("background-color tune", () => {
  describe("text blocks (header, paragraph, list)", () => {
    it("should return container-background-color for header blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#ff0000" },
        block: "header",
      });

      expect(result).toEqual({ "container-background-color": "#ff0000" });
    });

    it("should return container-background-color for paragraph blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#00ff00" },
        block: "paragraph",
      });

      expect(result).toEqual({ "container-background-color": "#00ff00" });
    });

    it("should return container-background-color for list blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#0000ff" },
        block: "list",
      });

      expect(result).toEqual({ "container-background-color": "#0000ff" });
    });
  });

  describe("other blocks (button, divider, etc)", () => {
    it("should return background-color for button blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#ff0000" },
        block: "emailButton",
      });

      expect(result).toEqual({ "background-color": "#ff0000" });
    });

    it("should return background-color for divider blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#00ff00" },
        block: "emailDivider",
      });

      expect(result).toEqual({ "background-color": "#00ff00" });
    });

    it("should return background-color for spacer blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#0000ff" },
        block: "emailSpacer",
      });

      expect(result).toEqual({ "background-color": "#0000ff" });
    });

    it("should return background-color for image blocks", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#cccccc" },
        block: "image",
      });

      expect(result).toEqual({ "background-color": "#cccccc" });
    });
  });

  describe("transparent color handling", () => {
    it("should return empty object when color is transparent", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "transparent" },
        block: "paragraph",
      });

      expect(result).toEqual({});
    });

    it("should return empty object when color is not provided", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: {},
        block: "paragraph",
      });

      expect(result).toEqual({});
    });

    it("should return empty object when color is empty string", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "" },
        block: "paragraph",
      });

      expect(result).toEqual({});
    });
  });

  describe("color formats", () => {
    it("should handle hex colors", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#ff6600" },
        block: "paragraph",
      });

      expect(result).toEqual({ "container-background-color": "#ff6600" });
    });

    it("should handle short hex colors", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "#f60" },
        block: "paragraph",
      });

      expect(result).toEqual({ "container-background-color": "#f60" });
    });

    it("should handle rgb colors", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "rgb(255, 0, 0)" },
        block: "paragraph",
      });

      expect(result).toEqual({ "container-background-color": "rgb(255, 0, 0)" });
    });

    it("should handle rgba colors", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "rgba(255, 0, 0, 0.5)" },
        block: "paragraph",
      });

      expect(result).toEqual({ "container-background-color": "rgba(255, 0, 0, 0.5)" });
    });

    it("should handle named colors", () => {
      const result = handleTune({
        tune: "backgroundColorTune",
        config: { color: "red" },
        block: "paragraph",
      });

      expect(result).toEqual({ "container-background-color": "red" });
    });
  });

  it("should use default transparent when not provided", () => {
    const result = handleTune({
      tune: "backgroundColorTune",
      config: {},
      block: "paragraph",
    });

    expect(result).toEqual({});
  });
});


