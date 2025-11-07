import { describe, expect, it } from "vitest";
import { renderImage, imageSchema } from "../../src/renderers/image";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("image renderer", () => {
  describe("imageSchema", () => {
    it("should validate a valid image block", () => {
      const block = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
          caption: "Test image",
        },
      };

      const result = imageSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.file.url).toBe("https://example.com/image.jpg");
        expect(result.data.data.caption).toBe("Test image");
      }
    });

    it("should accept image without caption", () => {
      const block = {
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
        },
      };

      const result = imageSchema.safeParse(block);

      expect(result.success).toBe(true);
    });

    it("should accept image without URL", () => {
      const block = {
        type: "image",
        data: {
          file: {},
          caption: "No URL",
        },
      };

      const result = imageSchema.safeParse(block);

      expect(result.success).toBe(true);
    });

    it("should reject non-image type", () => {
      const block = {
        type: "paragraph",
        data: {
          text: "Not an image",
        },
      };

      const result = imageSchema.safeParse(block);

      expect(result.success).toBe(false);
    });

    it("should reject invalid URL", () => {
      const block = {
        type: "image",
        data: {
          file: {
            url: "not-a-valid-url",
          },
        },
      };

      const result = imageSchema.safeParse(block);

      expect(result.success).toBe(false);
    });
  });

  describe("renderImage", () => {
    it("should render an image with URL and caption", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
          caption: "Test image",
        },
      };

      const result = renderImage(block);

      expect(result).toBe('<mj-image src="https://example.com/image.jpg" alt="Test image"  />');
    });

    it("should render an image without caption", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
        },
      };

      const result = renderImage(block);

      expect(result).toBe('<mj-image src="https://example.com/image.jpg" alt=""  />');
    });

    it("should return empty string when no URL", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {},
          caption: "Image without URL",
        },
      };

      const result = renderImage(block);

      expect(result).toBe("");
    });

    it("should sanitize caption", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
          caption: '<script>alert("xss")</script>Caption',
        },
      };

      const result = renderImage(block);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Caption");
    });

    it("should handle empty caption", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
          caption: "",
        },
      };

      const result = renderImage(block);

      expect(result).toContain('alt=""');
    });

    it("should render with alignment tune", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
        },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = renderImage(block);

      expect(result).toContain('align="center"');
      expect(result).toContain("https://example.com/image.jpg");
    });

    it("should render with padding tune", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg",
          },
        },
        tunes: {
          paddingTune: {
            top: "10px",
            right: "10px",
            bottom: "10px",
            left: "10px",
          },
        },
      };

      const result = renderImage(block);

      expect(result).toContain('padding="10px"');
    });

    it("should handle special characters in URL", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "https://example.com/image.jpg?size=large&format=webp",
          },
        },
      };

      const result = renderImage(block);

      expect(result).toContain('src="https://example.com/image.jpg?size=large&format=webp"');
    });

    it("should handle data URLs", () => {
      const block: OutputBlockData = {
        id: "img1",
        type: "image",
        data: {
          file: {
            url: "data:image/png;base64,iVBORw0KGgo=",
          },
        },
      };

      const result = renderImage(block);

      expect(result).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    });
  });
});

