import type { API, BlockAPI, BlockTune } from "@editorjs/editorjs";

interface ColorTuneData {
  color: string;
}

interface ColorTuneConfig {
  title?: string;
  styleKey?: "backgroundColor" | "color" | "borderColor";
  defaultColor?: string;
  colors?: string[];
}

interface ColorTuneConstructorOptions {
  api: API;
  data: ColorTuneData;
  config: ColorTuneConfig;
  block: BlockAPI;
}

export default class ColorTune implements BlockTune {
  private data: ColorTuneData;
  private config: ColorTuneConfig;
  private wrapper: HTMLElement | null = null;
  private block: BlockAPI;

  static get isTune(): boolean {
    return true;
  }

  constructor({ data, config, block }: ColorTuneConstructorOptions) {
    this.config = config || {};
    this.block = block;

    this.data = {
      color: data?.color || this.config.defaultColor || "transparent",
    };
  }

  render() {
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 8px 0;
      width: 100%;
    `;

    const title = document.createElement("div");
    title.textContent = this.config.title || "Color";
    title.style.cssText = "font-size: 11px; font-weight: 500; margin-bottom: 8px; color: #666;";
    container.appendChild(title);

    const inputsContainer = document.createElement("div");
    inputsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    // Clear button
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.textContent = "Clear";
    clearButton.style.cssText = `
      padding: 6px 10px;
      background: #f0f0f0;
      color: #333;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
      white-space: nowrap;
    `;

    clearButton.addEventListener("click", () => {
      this.data.color = "transparent";
      this.updateStyle();
    });

    inputsContainer.appendChild(clearButton);
    container.appendChild(inputsContainer);

    // Add preset colors
    const presetsContainer = document.createElement("div");
    presetsContainer.style.cssText = `
      display: flex;
      gap: 6px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e5e5e5;
    `;

    const presetColors = ["#ffffff", "#f3f4f6", "#dbeafe", "#dcfce7", "#fef3c7", "#fee2e2"];

    (this.config.colors ?? presetColors).forEach((color) => {
      const presetButton = document.createElement("button");
      presetButton.type = "button";
      presetButton.title = color;
      presetButton.style.cssText = `
        width: 28px;
        height: 28px;
        border: 2px solid ${this.data.color === color ? "black" : "#ddd"};
        border-radius: 3px;
        cursor: pointer;
        background-color: ${color};
        transition: transform 0.1s ease;
      `;

      presetButton.addEventListener("mouseenter", () => {
        presetButton.style.transform = "scale(1.1)";
      });

      presetButton.addEventListener("mouseleave", () => {
        presetButton.style.transform = "scale(1)";
      });

      presetButton.addEventListener("click", () => {
        this.data.color = color;
        this.updateStyle();
        presetsContainer.querySelectorAll("button").forEach((button) => {
          button.style.borderColor = "#ddd";
        });
        presetButton.style.borderColor = "black";
      });

      presetsContainer.appendChild(presetButton);
    });

    container.appendChild(presetsContainer);

    return container;
  }

  private updateWrapper(wrapper: HTMLElement) {
    const styleKey = this.config.styleKey ?? "backgroundColor";
    const color = this.data.color ?? "transparent";
    if (!["button", "divider", "spacer"].includes(this.block.name)) {
      wrapper.style[styleKey] = color;
      wrapper.style.transition = `${styleKey} 0.2s ease`;
    }
  }

  private updateStyle() {
    if (this.wrapper) {
      this.updateWrapper(this.wrapper);
    }
  }

  wrap(blockContent: HTMLElement): HTMLElement {
    this.wrapper = document.createElement("div");
    this.updateWrapper(this.wrapper);
    this.wrapper.appendChild(blockContent);
    return this.wrapper;
  }

  save(): ColorTuneData {
    this.block.dispatchChange();
    return this.data;
  }
}
