import type { API, BlockTool, BlockToolConstructorOptions } from "@editorjs/editorjs";
import { Space } from "lucide-react";
import { iconToString } from "./icon-utils";

interface SpacerData {
  height: string;
}

export default class EmailSpacer implements BlockTool {
  private api: API;
  private data: SpacerData;
  private wrapper: HTMLElement | undefined;

  static get toolbox() {
    return {
      title: "Spacer",
      icon: iconToString(Space),
    };
  }

  constructor({ data, api }: BlockToolConstructorOptions) {
    this.api = api;
    this.data = {
      height: data.height || "20px",
    };
  }

  render() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("email-spacer-block");
    this.wrapper.style.cssText = "padding: 10px; background: #f9f9f9; border-radius: 4px;";

    const spacer = document.createElement("div");
    spacer.style.cssText = `
      height: ${this.data.height};
      background: repeating-linear-gradient(
        90deg,
        #e0e0e0 0px,
        #e0e0e0 10px,
        transparent 10px,
        transparent 20px
      );
      border-radius: 2px;
    `;

    const controls = document.createElement("div");
    controls.style.cssText = "margin-top: 10px;";

    const heightSelect = this.createSelect("Height", this.data.height, ["10px", "20px", "30px", "40px", "50px", "60px"], (value) => {
      this.data.height = value;
      spacer.style.height = value;
    });

    controls.appendChild(heightSelect);

    this.wrapper.appendChild(spacer);
    this.wrapper.appendChild(controls);

    return this.wrapper;
  }

  save() {
    return this.data;
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
