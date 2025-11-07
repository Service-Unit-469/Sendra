import { describe, expect, it } from "vitest";
import { handleTune } from "../../src/tunes/align";

describe("align tune", () => {
  it("should return left alignment", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "left" },
      block: "paragraph",
    });

    expect(result).toEqual({ align: "left" });
  });

  it("should return center alignment", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "center" },
      block: "paragraph",
    });

    expect(result).toEqual({ align: "center" });
  });

  it("should return right alignment", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "right" },
      block: "paragraph",
    });

    expect(result).toEqual({ align: "right" });
  });

  it("should use default left alignment when not provided", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: {},
      block: "paragraph",
    });

    expect(result).toEqual({ align: "left" });
  });

  it("should work with header blocks", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "center" },
      block: "header",
    });

    expect(result).toEqual({ align: "center" });
  });

  it("should work with list blocks", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "right" },
      block: "list",
    });

    expect(result).toEqual({ align: "right" });
  });

  it("should work with image blocks", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "center" },
      block: "image",
    });

    expect(result).toEqual({ align: "center" });
  });

  it("should work with emailButton blocks", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "center" },
      block: "emailButton",
    });

    expect(result).toEqual({ align: "center" });
  });

  it("should reject invalid alignment values", () => {
    expect(() => {
      handleTune({
        tune: "alignmentTune",
        config: { alignment: "justify" },
        block: "paragraph",
      });
    }).toThrow();
  });

  it("should handle uppercase config keys", () => {
    const result = handleTune({
      tune: "alignmentTune",
      config: { alignment: "left" },
      block: "paragraph",
    });

    expect(result).toEqual({ align: "left" });
  });
});


