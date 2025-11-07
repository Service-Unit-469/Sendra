import type { LucideIcon } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Converts a Lucide React icon to an SVG string for Editor.js toolbox
 */
export function iconToString(Icon: LucideIcon, size = 17): string {
  const svg = createElement(Icon, { size, strokeWidth: 2 });
  return renderToStaticMarkup(svg);
}
