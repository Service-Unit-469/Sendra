import type { OutputBlockData } from "@editorjs/editorjs";
import DOMPurify from "dompurify";
import type { MjmlAttributeName, MjmlAttributes, SupportedBlocks } from "../types";
import { handleTune as handleAlignmentTune } from "./align";
import { handleTune as handleBackgroundColorTune } from "./background-color";
import { handleTune as handleBorderColorTune } from "./border-color";
import { handleTune as handleBorderWidthTune } from "./border-width";
import { handleTune as handleColorTune } from "./color";
import { handleTune as handleHeightTune } from "./height";
import { handleTune as handlePaddingTune } from "./padding";

const handlers = {
  alignmentTune: handleAlignmentTune,
  backgroundColorTune: handleBackgroundColorTune,
  borderColorTune: handleBorderColorTune,
  borderWidthTune: handleBorderWidthTune,
  colorTune: handleColorTune,
  heightTune: handleHeightTune,
  paddingTune: handlePaddingTune,
};

export const evaluateTunes = (block: OutputBlockData) => {
  if (block.tunes) {
    const attributes: MjmlAttributes = {};
    Object.entries(block.tunes).forEach(([tune, config]) => {
      const handler = handlers[tune as keyof typeof handlers];
      if (handler) {
        const additionalAttributes = handler({
          tune,
          config,
          block: block.type as SupportedBlocks,
        });
        Object.entries(additionalAttributes).forEach(([attribute, value]) => {
          attributes[attribute as MjmlAttributeName] = value;
        });
      }
    });
    return attributes;
  }
  return {};
};

export const applyTunes = (block: OutputBlockData, additionalAttributes?: MjmlAttributes) => {
  const attributes = evaluateTunes(block);
  const combinedAttributes: MjmlAttributes = {
    ...attributes,
    ...additionalAttributes,
  };
  return Object.entries(combinedAttributes)
    .map(([attribute, value]) => {
      return `${attribute}="${DOMPurify.sanitize(value ?? "")}"`;
    })
    .join(" ");
};
