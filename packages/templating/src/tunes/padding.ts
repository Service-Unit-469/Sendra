import z from "zod";
import type { TuneHandlerFn } from "../types";

const configSchema = z.object({
  top: z.string().default("0px"),
  right: z.string().default("0px"),
  bottom: z.string().default("0px"),
  left: z.string().default("0px"),
});

export const handleTune: TuneHandlerFn = ({ config }) => {
  const { top, right, bottom, left } = configSchema.parse(config);

  // If all sides are the same, use the shorthand "padding" attribute
  if (top === right && right === bottom && bottom === left && top !== "0px") {
    return {
      padding: top,
    };
  }

  // Otherwise, use individual padding attributes (only include non-zero values)
  const attributes: Record<string, string> = {};

  if (top !== "0px") {
    attributes["padding-top"] = top;
  }
  if (right !== "0px") {
    attributes["padding-right"] = right;
  }
  if (bottom !== "0px") {
    attributes["padding-bottom"] = bottom;
  }
  if (left !== "0px") {
    attributes["padding-left"] = left;
  }

  return attributes;
};
