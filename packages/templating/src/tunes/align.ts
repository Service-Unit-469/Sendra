import z from "zod";
import type { TuneHandlerFn } from "../types";

const configSchema = z.object({
  alignment: z.enum(["left", "center", "right"]).default("left"),
});

export const handleTune: TuneHandlerFn = ({ config }) => {
  const { alignment } = configSchema.parse(config);
  return {
    align: alignment,
  };
};
