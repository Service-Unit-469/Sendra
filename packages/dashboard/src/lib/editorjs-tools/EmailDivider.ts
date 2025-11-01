import type { API, BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
import { Minus } from "lucide-react";
import { iconToString } from "./icon-utils";

interface DividerData {
  borderColor: string;
  borderWidth: string;
}

export default class EmailDivider implements BlockTool {
  private api: API;
  private data: DividerData;
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: "Divider",
      icon: iconToString(Minus),
    };
  }

  constructor({ data, api }: BlockToolConstructorOptions) {
    this.api = api;
    this.data = {
      borderColor: data.borderColor || "#e0e0e0",
      borderWidth: data.borderWidth || "1px",
    };
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("email-divider-block");
    this.wrapper.style.cssText = "padding: 20px 0;";

    const divider = document.createElement("hr");
    divider.style.cssText = `
      border: none;
      border-top: ${this.data.borderWidth} solid ${this.data.borderColor};
      margin: 10px 0;
    `;

    const controls = document.createElement("div");
    controls.style.cssText = "margin-top: 10px; display: flex; gap: 10px;";

    // Border color
    const colorInput = this.createColorInput("Color", this.data.borderColor, (value) => {
      this.data.borderColor = value;
      divider.style.borderTopColor = value;
    });

    // Border width
    const widthSelect = this.createSelect("Width", this.data.borderWidth, ["1px", "2px", "3px", "4px"], (value) => {
      this.data.borderWidth = value;
      divider.style.borderTopWidth = value;
    });

    controls.appendChild(colorInput);
    controls.appendChild(widthSelect);

    this.wrapper.appendChild(divider);
    this.wrapper.appendChild(controls);

    return this.wrapper;
  }

  save() {
    return this.data;
  }

  private createColorInput(label: string, value: string, onChange: (value: string) => void): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; width: 150px;";

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
    wrapper.style.cssText = "display: flex; flex-direction: column; width: 150px;";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size: 12px; margin-bottom: 4px; color: #666;";

    const select = document.createElement("select");
    select.style.cssText = "padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 13px;";

    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
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
