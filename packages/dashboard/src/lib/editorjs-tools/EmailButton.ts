import type { API, BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
import { RectangleEllipsis } from "lucide-react";
import { iconToString } from "./icon-utils";

interface ButtonData {
  text: string;
  url: string;
  backgroundColor: string;
  textColor: string;
  align: "left" | "center" | "right";
}

export default class EmailButton implements BlockTool {
  private api: API;
  private data: ButtonData;
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: "Button",
      icon: iconToString(RectangleEllipsis),
    };
  }

  constructor({ data, api }: BlockToolConstructorOptions) {
    this.api = api;
    this.data = {
      text: data.text || "Click here",
      url: data.url || "",
      backgroundColor: data.backgroundColor || "#4A90E2",
      textColor: data.textColor || "#FFFFFF",
      align: data.align || "center",
    };
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("email-button-block");
    this.wrapper.style.cssText = `
      padding: 20px;
      background: #f5f5f5;
      border-radius: 4px;
      margin: 10px 0;
    `;

    const container = document.createElement("div");
    container.style.textAlign = this.data.align;

    const button = document.createElement("button");
    button.contentEditable = "false";
    button.textContent = this.data.text;
    button.style.cssText = `
      background-color: ${this.data.backgroundColor};
      color: ${this.data.textColor};
      padding: 12px 24px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;

    const controls = document.createElement("div");
    controls.style.cssText = "margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;";

    // Text input
    const textInput = this.createInput("Button text", this.data.text, (value) => {
      this.data.text = value;
      button.textContent = value;
    });

    // URL input
    const urlInput = this.createInput("URL", this.data.url, (value) => {
      this.data.url = value;
    });

    // Background color
    const bgColorInput = this.createColorInput("Background", this.data.backgroundColor, (value) => {
      this.data.backgroundColor = value;
      button.style.backgroundColor = value;
    });

    // Text color
    const textColorInput = this.createColorInput("Text color", this.data.textColor, (value) => {
      this.data.textColor = value;
      button.style.color = value;
    });

    // Alignment
    const alignSelect = this.createSelect("Align", this.data.align, ["left", "center", "right"], (value) => {
      this.data.align = value as "left" | "center" | "right";
      container.style.textAlign = value;
    });

    controls.appendChild(textInput);
    controls.appendChild(urlInput);
    controls.appendChild(bgColorInput);
    controls.appendChild(textColorInput);
    controls.appendChild(alignSelect);

    container.appendChild(button);
    this.wrapper.appendChild(container);
    this.wrapper.appendChild(controls);

    return this.wrapper;
  }

  save() {
    return this.data;
  }

  private createInput(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; flex: 1; min-width: 150px;";

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

  private createColorInput(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; width: 120px;";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size: 12px; margin-bottom: 4px; color: #666;";

    const input = document.createElement("input");
    input.type = "color";
    input.value = value;
    input.style.cssText = "padding: 4px; border: 1px solid #ddd; border-radius: 3px; height: 32px;";
    input.addEventListener("input", (e) => {
      onChange((e.target as HTMLInputElement).value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  }

  private createSelect(label: string, value: string, options: string[], onChange: (value: string) => void): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; width: 120px;";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size: 12px; margin-bottom: 4px; color: #666;";

    const select = document.createElement("select");
    select.style.cssText = "padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 13px;";

    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
      if (opt === value) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener("change", (e) => {
      onChange((e.target as HTMLSelectElement).value);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);
    return wrapper;
  }
}
