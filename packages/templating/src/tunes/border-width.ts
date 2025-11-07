import z from "zod";
import type { TuneHandlerFn } from "../types";

const configSchema = z.object({
  size: z.string().default("1px"),
});

export const handleTune: TuneHandlerFn = ({ config }) => {
  const { size } = configSchema.parse(config);

  return {
    "border-width": size ?? "1px",
  };
};
