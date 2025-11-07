import type { OutputBlockData } from "@editorjs/editorjs";
import { z } from "zod";

export type EditorJsBlockRenderer<El extends string, Data extends object> = (block: OutputBlockData<El, Data>) => string;

export type MjmlAttributeName =
  | "align"
  | "border"
  | "border-color"
  | "border-width"
  | "color"
  | "background-color"
  | "font-size"
  | "font-weight"
  | "height"
  | "margin"
  | "padding"
  | "padding-top"
  | "padding-bottom"
  | "padding-left"
  | "padding-right";
export type MjmlAttributes = Partial<Record<MjmlAttributeName, string>>;

export type SupportedBlocks = "paragraph" | "header" | "list" | "image" | "emailButton" | "emailDivider" | "emailSpacer";

export type TuneHandlerFn = (args: { tune: string; config: unknown; block: SupportedBlocks }) => MjmlAttributes;

export const OutputBlockDataSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.record(z.string(), z.any()),
  tunes: z.record(z.string(), z.any()).optional(),
});
