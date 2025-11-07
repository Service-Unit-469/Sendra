import z from "zod";
import type { TuneHandlerFn } from "../types";

const configSchema = z.object({
  color: z.string().default("#000000"),
});

export const handleTune: TuneHandlerFn = ({ config }) => {
  const { color } = configSchema.parse(config);

  if (!color || color === "transparent" || color === "#000000") {
    return {};
  }

  return {
    "border-color": color,
  };
};
