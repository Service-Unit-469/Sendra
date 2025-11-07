import type { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
import { Space } from "lucide-react";
import { iconToString } from "./icon-utils";

export default class Spacer implements BlockTool {
  private data: object;
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: "Spacer",
      icon: iconToString(Space),
    };
  }

  constructor(_: BlockToolConstructorOptions) {
    this.data = {};
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("spacer-block");
    this.wrapper.style.cssText = "padding-top: 20px; padding-bottom: 20px;";

    return this.wrapper;
  }

  save() {
    return this.data;
  }
}
