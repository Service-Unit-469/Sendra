import type { API, BlockAPI, BlockTune } from "@editorjs/editorjs";

interface SizeTuneData {
  size: string;
}

interface SizeTuneConfig {
  title?: string;
  styleKey?: "height" | "borderWidth";
  defaultSize?: string;
  min?: number;
  max?: number;
  step?: number;
  showInput?: boolean;
}

interface SizeTuneConstructorOptions {
  api: API;
  data: SizeTuneData;
  config: SizeTuneConfig;
  block: BlockAPI;
}

export default class SizeTune implements BlockTune {
  private data: SizeTuneData;
  private config: SizeTuneConfig;
  private wrapper: HTMLElement | null = null;
  private block: BlockAPI;
  static get isTune(): boolean {
    return true;
  }

  constructor({ data, config, block }: SizeTuneConstructorOptions) {
    this.config = config || {};
    this.block = block;
    this.data = {
      size: data?.size || this.config.defaultSize || "",
    };
  }

  render() {
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 8px 0;
      width: 100%;
    `;

    const title = document.createElement("div");
    title.textContent = this.config.title || "Size";
    title.style.cssText = "font-size: 11px; font-weight: 500; margin-bottom: 8px; color: #666;";
    container.appendChild(title);

    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      align-items: center;
    `;

    // Show custom input if enabled
    if (this.config.showInput ?? true) {
      const inputWrapper = document.createElement("div");
      inputWrapper.style.cssText = `
        display: flex;
        gap: 4px;
        align-items: center;
        flex: 1;
      `;

      const input = document.createElement("input");
      input.type = "number";
      input.value = this.parseNumericValue(this.data.size).toString();
      input.min = (this.config.min ?? 0).toString();
      input.max = (this.config.max ?? 1000).toString();
      input.step = (this.config.step ?? 1).toString();
      input.style.cssText = `
        padding: 6px 8px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 11px;
        width: 70px;
      `;

      input.addEventListener("input", () => {
        const value = input.value;
        this.data.size = value ? `${value}px` : "";
        this.updateStyle();
      });

      inputWrapper.appendChild(input);
      controlsContainer.appendChild(inputWrapper);
    }

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
      this.data.size = "";
      this.updateStyle();

      // Clear input if it exists
      const input = controlsContainer.querySelector("input");
      if (input) {
        (input as HTMLInputElement).value = "";
      }
    });

    controlsContainer.appendChild(clearButton);
    container.appendChild(controlsContainer);

    return container;
  }

  private parseNumericValue(value: string): number {
    const match = value.match(/^(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private updateWrapper(wrapper: HTMLElement) {
    const styleKey = this.config.styleKey || "width";
    if (!["button", "divider", "spacer"].includes(this.block.name)) {
      wrapper.style[styleKey] = this.data.size ?? "";
    }
  }

  private updateStyle() {
    if (!this.wrapper) {
      return;
    }
    this.updateWrapper(this.wrapper);
    this.block.call("render");
  }

  wrap(blockContent: HTMLElement): HTMLElement {
    this.wrapper = document.createElement("div");
    this.updateWrapper(this.wrapper);
    this.wrapper.appendChild(blockContent);
    return this.wrapper;
  }

  save(): SizeTuneData {
    return this.data;
  }
}
