import z from "zod";
import type { TuneHandlerFn } from "../types";

const configSchema = z.object({
  color: z.string().default("transparent"),
});

export const handleTune: TuneHandlerFn = ({ config, block }) => {
  const { color } = configSchema.parse(config);

  // Don't apply background color if it's transparent
  if (!color || color === "transparent") {
    return {};
  }

  if (["header", "paragraph", "list"].includes(block)) {
    return {
      "container-background-color": color,
    };
  }

  return {
    "background-color": color,
  };
};
