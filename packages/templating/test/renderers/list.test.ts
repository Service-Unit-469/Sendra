import { describe, expect, it } from "vitest";
import { renderList, listSchema } from "../../src/renderers/list";
import type { OutputBlockData } from "@editorjs/editorjs";

describe("list renderer", () => {
  describe("listSchema", () => {
    it("should validate a valid unordered list", () => {
      const block = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            { content: "Item 1", items: [] },
            { content: "Item 2", items: [] },
          ],
        },
      };

      const result = listSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.style).toBe("unordered");
        expect(result.data.data.items).toHaveLength(2);
      }
    });

    it("should validate a valid ordered list", () => {
      const block = {
        id: "list1",
        type: "list",
        data: {
          style: "ordered",
          items: [
            { content: "First", items: [] },
            { content: "Second", items: [] },
          ],
        },
      };

      const result = listSchema.safeParse(block);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.style).toBe("ordered");
      }
    });

    it("should use default style when not provided", () => {
      const block = {
        type: "list",
        data: {
          items: [{ content: "Item", items: [] }],
        },
      };

      const result = listSchema.parse(block);

      expect(result.data.style).toBe("unordered");
    });

    it("should use default items when not provided", () => {
      const block = {
        type: "list",
        data: {
          style: "ordered",
        },
      };

      const result = listSchema.parse(block);

      expect(result.data.items).toEqual([]);
    });

    it("should validate nested list items", () => {
      const block = {
        type: "list",
        data: {
          items: [
            {
              content: "Parent",
              items: [
                { content: "Child 1", items: [] },
                { content: "Child 2", items: [] },
              ],
            },
          ],
        },
      };

      const result = listSchema.safeParse(block);

      expect(result.success).toBe(true);
    });

    it("should reject non-list type", () => {
      const block = {
        type: "paragraph",
        data: {
          text: "Not a list",
        },
      };

      const result = listSchema.safeParse(block);

      expect(result.success).toBe(false);
    });

    it("should reject invalid style", () => {
      const block = {
        type: "list",
        data: {
          style: "bullet",
          items: [],
        },
      };

      const result = listSchema.safeParse(block);

      expect(result.success).toBe(false);
    });
  });

  describe("renderList", () => {
    it("should render an unordered list", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            { content: "Item 1", items: [] },
            { content: "Item 2", items: [] },
          ],
        },
      };

      const result = renderList(block);

      expect(result).toBe("<mj-text ><ul><li>Item 1<ul></ul></li><li>Item 2<ul></ul></li></ul></mj-text>");
    });

    it("should render an ordered list", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "ordered",
          items: [
            { content: "First", items: [] },
            { content: "Second", items: [] },
          ],
        },
      };

      const result = renderList(block);

      expect(result).toBe("<mj-text ><ol><li>First<ol></ol></li><li>Second<ol></ol></li></ol></mj-text>");
    });

    it("should render nested list items", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            {
              content: "Parent",
              items: [
                { content: "Child 1", items: [] },
                { content: "Child 2", items: [] },
              ],
            },
          ],
        },
      };

      const result = renderList(block);

      expect(result).toContain("<li>Parent<ul>");
      expect(result).toContain("<li>Child 1<ul></ul></li>");
      expect(result).toContain("<li>Child 2<ul></ul></li>");
    });

    it("should render deeply nested lists", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            {
              content: "Level 1",
              items: [
                {
                  content: "Level 2",
                  items: [
                    { content: "Level 3", items: [] },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = renderList(block);

      expect(result).toContain("Level 1");
      expect(result).toContain("Level 2");
      expect(result).toContain("Level 3");
    });

    it("should sanitize list item content", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            { content: '<script>alert("xss")</script>Safe item', items: [] },
          ],
        },
      };

      const result = renderList(block);

      expect(result).not.toContain("<script>");
      expect(result).toContain("Safe item");
    });

    it("should handle empty list", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [],
        },
      };

      const result = renderList(block);

      expect(result).toBe("<mj-text ><ul></ul></mj-text>");
    });

    it("should handle empty item content", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            { content: "", items: [] },
          ],
        },
      };

      const result = renderList(block);

      expect(result).toContain("<li><ul></ul></li>");
    });

    it("should render with alignment tune", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            { content: "Item", items: [] },
          ],
        },
        tunes: {
          alignmentTune: {
            alignment: "center",
          },
        },
      };

      const result = renderList(block);

      expect(result).toContain('align="center"');
    });

    it("should render with color tune", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "ordered",
          items: [
            { content: "Item", items: [] },
          ],
        },
        tunes: {
          colorTune: {
            color: "#ff0000",
          },
        },
      };

      const result = renderList(block);

      expect(result).toContain('color="#ff0000"');
    });

    it("should handle special characters in content", () => {
      const block: OutputBlockData = {
        id: "list1",
        type: "list",
        data: {
          style: "unordered",
          items: [
            { content: "Price: $29.99 & Up!", items: [] },
          ],
        },
      };

      const result = renderList(block);

      expect(result).toContain("Price: $29.99 & Up!");
    });
  });
});

