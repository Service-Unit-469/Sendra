import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/height";

describe("height tune", () => {
  it("should return height for valid size", () => {
    const result = handleTune({
      tune: "heightTune",
      config: { size: "50px" },
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "50px" });
  });

  it("should use default 10px when not provided", () => {
    const result = handleTune({
      tune: "heightTune",
      config: {},
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "10px" });
  });

  it("should handle size value of 0", () => {
    const result = handleTune({
      tune: "heightTune",
      config: { size: "0px" },
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "0px" });
  });

  describe("size formats", () => {
    it("should handle px sizes", () => {
      const result = handleTune({
        tune: "heightTune",
        config: { size: "100px" },
        block: "emailSpacer",
      });

      expect(result).toEqual({ height: "100px" });
    });

    it("should handle em sizes", () => {
      const result = handleTune({
        tune: "heightTune",
        config: { size: "2em" },
        block: "emailSpacer",
      });

      expect(result).toEqual({ height: "2em" });
    });

    it("should handle rem sizes", () => {
      const result = handleTune({
        tune: "heightTune",
        config: { size: "3rem" },
        block: "emailSpacer",
      });

      expect(result).toEqual({ height: "3rem" });
    });

    it("should handle percentage sizes", () => {
      const result = handleTune({
        tune: "heightTune",
        config: { size: "10%" },
        block: "emailSpacer",
      });

      expect(result).toEqual({ height: "10%" });
    });

    it("should handle vh sizes", () => {
      const result = handleTune({
        tune: "heightTune",
        config: { size: "50vh" },
        block: "emailSpacer",
      });

      expect(result).toEqual({ height: "50vh" });
    });
  });

  it("should work with different block types", () => {
    const blocks = ["emailSpacer", "image", "emailDivider"] as const;

    for (const block of blocks) {
      const result = handleTune({
        tune: "heightTune",
        config: { size: "30px" },
        block,
      });

      expect(result).toEqual({ height: "30px" });
    }
  });

  it("should handle very small heights", () => {
    const result = handleTune({
      tune: "heightTune",
      config: { size: "1px" },
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "1px" });
  });

  it("should handle very large heights", () => {
    const result = handleTune({
      tune: "heightTune",
      config: { size: "1000px" },
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "1000px" });
  });

  it("should handle undefined size by using default", () => {
    const result = handleTune({
      tune: "heightTune",
      config: { size: undefined },
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "10px" });
  });

  it("should handle fractional values", () => {
    const result = handleTune({
      tune: "heightTune",
      config: { size: "5.5px" },
      block: "emailSpacer",
    });

    expect(result).toEqual({ height: "5.5px" });
  });
});

