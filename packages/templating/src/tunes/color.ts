import z from "zod";
import type { TuneHandlerFn } from "../types";

const configSchema = z.object({
  color: z.string().default("transparent"),
});

export const handleTune: TuneHandlerFn = ({ config }) => {
  const { color } = configSchema.parse(config);

  // Don't apply background color if it's transparent
  if (!color || color === "transparent") {
    return {};
  }

  return {
    color: color,
  };
};
