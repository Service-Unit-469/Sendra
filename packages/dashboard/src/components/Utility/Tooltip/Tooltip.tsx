import Tippy from "@tippyjs/react";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

export interface TooltipProps {
  content: ReactNode | string;
}

/**
 *
 * @param root0
 * @param root0.content
 * @param root0.icon
 */
export default function Tooltip({ content }: TooltipProps) {
  return (
    <Tippy maxWidth={450} className="rounded-md border border-neutral-200 bg-white px-6 py-6 text-sm text-neutral-800 shadow-md" content={<div>{content}</div>}>
      <div className="flex items-center px-2">
        <Info size={12} />
      </div>
    </Tippy>
  );
}
