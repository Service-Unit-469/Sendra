import type { BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
import { RectangleEllipsis } from "lucide-react";
import { iconToString } from "./icon-utils";

interface ButtonData {
  text: string;
  url: string;
}

export default class Button implements BlockTool {
  private data: ButtonData;
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: "Button",
      icon: iconToString(RectangleEllipsis),
    };
  }

  constructor({ data }: BlockToolConstructorOptions) {
    this.data = {
      text: data.text || "Click here",
      url: data.url || "",
    };
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("email-button-block");
    this.wrapper.style.cssText = `
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
      margin: 10px 0;
    `;

    const container = document.createElement("div");

    const controls = document.createElement("div");
    controls.style.cssText = "margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;";

    // Text input
    const textInput = this.createInput("Button text", this.data.text, (value) => {
      this.data.text = value;
    });

    // URL input
    const urlInput = this.createInput("URL", this.data.url, (value) => {
      this.data.url = value;
    });

    controls.appendChild(textInput);
    controls.appendChild(urlInput);

    this.wrapper.appendChild(container);
    this.wrapper.appendChild(controls);

    return this.wrapper;
  }

  save() {
    return this.data;
  }

  private createInput(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; flex: 1; min-width: 150px; color: black;";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size: 12px; margin-bottom: 4px; color: #666;";

    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.style.cssText = "padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 13px;";
    input.addEventListener("input", (e) => {
      onChange((e.target as HTMLInputElement).value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  }
}
