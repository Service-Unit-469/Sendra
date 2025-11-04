import type { OutputBlockData } from "@editorjs/editorjs";
import { z } from "zod";

export type EditorJsBlockRenderer<El extends string, Data extends object> = (block: OutputBlockData<El, Data>) => string;

export const OutputBlockDataSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.record(z.string(), z.any()),
  tunes: z.record(z.string(), z.any()).optional(),
});
