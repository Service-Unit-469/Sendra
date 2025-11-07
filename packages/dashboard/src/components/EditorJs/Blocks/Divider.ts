import type { BlockAPI, BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
import { Minus } from "lucide-react";
import { iconToString } from "./icon-utils";

export default class Divider implements BlockTool {
  private block: BlockAPI;
  private data: object;
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: "Divider",
      icon: iconToString(Minus),
    };
  }

  constructor({ block }: BlockToolConstructorOptions) {
    this.data = {};
    this.block = block;
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("divider-block");
    this.wrapper.style.cssText = `padding-top: 20px; padding-bottom: 20px;`;

    const divider = document.createElement("hr");
    this.wrapper.appendChild(divider);

    return this.wrapper;
  }

  save() {
    return this.data;
  }
}
