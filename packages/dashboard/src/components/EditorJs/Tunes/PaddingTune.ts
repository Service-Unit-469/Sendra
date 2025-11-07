import type { API, BlockAPI, BlockTune } from "@editorjs/editorjs";

interface PaddingData {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface PaddingTuneConfig {
  defaultPadding?: Partial<PaddingData>;
}

interface PaddingTuneConstructorOptions {
  api: API;
  data: PaddingData;
  config: PaddingTuneConfig;
  block: BlockAPI;
}

export default class PaddingTune implements BlockTune {
  private data: PaddingData;
  private config: PaddingTuneConfig;
  private wrapper: HTMLElement | null = null;
  private block: BlockAPI;
  static get isTune(): boolean {
    return true;
  }

  constructor({ data, config, block }: PaddingTuneConstructorOptions) {
    this.config = config || {};

    const defaultPadding = this.config.defaultPadding || {};
    this.data = {
      top: data?.top || defaultPadding.top || "0px",
      right: data?.right || defaultPadding.right || "0px",
      bottom: data?.bottom || defaultPadding.bottom || "0px",
      left: data?.left || defaultPadding.left || "0px",
    };
    this.block = block;
  }

  render() {
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 8px 0;
      width: 100%;
    `;

    const title = document.createElement("div");
    title.textContent = "Padding";
    title.style.cssText = "font-size: 11px; font-weight: 500; margin-bottom: 8px; color: #666;";
    container.appendChild(title);

    // Create horizontal number inputs container
    const inputsContainer = document.createElement("div");
    inputsContainer.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    `;

    const sides: Array<{ key: keyof PaddingData; label: string }> = [
      { key: "top", label: "T" },
      { key: "right", label: "R" },
      { key: "bottom", label: "B" },
      { key: "left", label: "L" },
    ];

    sides.forEach((side) => {
      const control = this.createPaddingInput(side.label, side.key);
      inputsContainer.appendChild(control);
    });

    container.appendChild(inputsContainer);

    return container;
  }

  private createPaddingInput(label: string, key: keyof PaddingData): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "flex: 1; display: flex; flex-direction: column;";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "display: block; font-size: 10px; margin-bottom: 4px; color: #666; text-align: center;";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = this.parsePaddingValue(this.data[key]);
    input.style.cssText = `
      width: 100%;
      padding: 6px 4px;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 12px;
      text-align: center;
    `;

    input.addEventListener("input", (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.data[key] = value ? `${value}px` : "0px";
      this.updatePadding();
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
  }

  private parsePaddingValue(value: string): string {
    // Extract numeric value from strings like "16px", "1em", etc.
    const match = value.match(/^(\d+)/);
    return match ? match[1] : "0";
  }

  private updatePadding() {
    if (this.wrapper) {
      this.wrapper.style.padding = `${this.data.top} ${this.data.right} ${this.data.bottom} ${this.data.left}`;
    }
  }

  wrap(blockContent: HTMLElement): HTMLElement {
    this.wrapper = document.createElement("div");
    this.wrapper.style.padding = `${this.data.top} ${this.data.right} ${this.data.bottom} ${this.data.left}`;
    this.wrapper.style.transition = "padding 0.2s ease";
    this.wrapper.appendChild(blockContent);
    return this.wrapper;
  }

  save(): PaddingData {
    this.block.dispatchChange();
    return this.data;
  }
}
