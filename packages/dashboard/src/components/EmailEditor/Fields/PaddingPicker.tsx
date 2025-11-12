import type { CustomField } from "@measured/puck";
import { useEffect, useState } from "react";

export type PaddingPickerFieldProps = {
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  name: string;
  label?: string;
  id: string;
};

type PaddingMode = "uniform" | "custom";

type PaddingValues = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

/**
 * Parse a padding string into individual values
 * Supports: "20" or "10 20 30 40"
 */
const parsePadding = (value?: string): { mode: PaddingMode; values: PaddingValues } => {
  if (!value) {
    return {
      mode: "uniform",
      values: { top: "0", right: "0", bottom: "0", left: "0" },
    };
  }

  const parts = value.trim().split(/\s+/);

  if (parts.length === 1) {
    // Uniform padding
    return {
      mode: "uniform",
      values: { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] },
    };
  }

  if (parts.length === 4) {
    // Custom padding: top right bottom left
    return {
      mode: "custom",
      values: { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] },
    };
  }

  // Handle CSS shorthand (2 or 3 values) by converting to 4 values
  if (parts.length === 2) {
    // top/bottom right/left
    return {
      mode: "custom",
      values: { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] },
    };
  }

  if (parts.length === 3) {
    // top right/left bottom
    return {
      mode: "custom",
      values: { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] },
    };
  }

  // Fallback
  return {
    mode: "uniform",
    values: { top: "0", right: "0", bottom: "0", left: "0" },
  };
};

/**
 * Custom Puck field component for padding
 * Allows setting either uniform padding or individual values for each direction
 */
const PaddingPickerField: React.FC<PaddingPickerFieldProps> = ({ value, onChange, name, id, label }) => {
  const parsed = parsePadding(value);
  const [mode, setMode] = useState<PaddingMode>(parsed.mode);
  const [paddingValues, setPaddingValues] = useState<PaddingValues>(parsed.values);

  // Update local state when value prop changes
  useEffect(() => {
    const parsed = parsePadding(value);
    setMode(parsed.mode);
    setPaddingValues(parsed.values);
  }, [value]);

  const handleModeChange = (newMode: PaddingMode) => {
    setMode(newMode);
    if (newMode === "uniform") {
      // Use the top value as uniform value
      const uniformValue = paddingValues.top || "0";
      onChange(uniformValue);
    } else {
      // Convert to custom format
      const customValue = `${paddingValues.top} ${paddingValues.right} ${paddingValues.bottom} ${paddingValues.left}`;
      onChange(customValue);
    }
  };

  const handleUniformChange = (val: string) => {
    const cleanValue = val.replace(/[^0-9]/g, "");
    setPaddingValues({ top: cleanValue, right: cleanValue, bottom: cleanValue, left: cleanValue });
    onChange(cleanValue);
  };

  const handleCustomChange = (direction: keyof PaddingValues, val: string) => {
    const cleanValue = val.replace(/[^0-9]/g, "");
    const newValues = { ...paddingValues, [direction]: cleanValue };
    setPaddingValues(newValues);
    onChange(`${newValues.top} ${newValues.right} ${newValues.bottom} ${newValues.left}`);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-s text-neutral-800 mb-1">
        {label ?? "Padding"}
      </label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleModeChange("uniform")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition ${mode === "uniform" ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
        >
          All Sides
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("custom")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition ${mode === "custom" ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
        >
          Individual Sides
        </button>
      </div>

      {mode === "uniform" && (
        <div>
          <label htmlFor={id} className="block text-xs text-neutral-500 mb-1">
            All Sides (px)
          </label>
          <input
            type="text"
            id={id}
            name={name}
            value={paddingValues.top}
            onChange={(e) => handleUniformChange(e.target.value)}
            placeholder="20"
            className="block w-full rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
          />
        </div>
      )}
      {mode === "custom" && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Top (px)
                <input
                  type="text"
                  value={paddingValues.top}
                  onChange={(e) => handleCustomChange("top", e.target.value)}
                  placeholder="0"
                  className="block w-full rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                />
              </label>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Right (px)
                <input
                  type="text"
                  value={paddingValues.right}
                  onChange={(e) => handleCustomChange("right", e.target.value)}
                  placeholder="0"
                  className="block w-full rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                />
              </label>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Left (px)
                <input
                  type="text"
                  value={paddingValues.left}
                  onChange={(e) => handleCustomChange("left", e.target.value)}
                  placeholder="0"
                  className="block w-full rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                />
              </label>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Bottom (px)
                <input
                  type="text"
                  value={paddingValues.bottom}
                  onChange={(e) => handleCustomChange("bottom", e.target.value)}
                  placeholder="0"
                  className="block w-full rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Puck custom field render function for padding picker
 * Usage in component config:
 * ```
 * fields: {
 *   padding: {
 *     type: "custom",
 *     label: "Padding",
 *     render: PaddingPickerRender,
 *   }
 * }
 * ```
 */
export const PaddingPickerRender: CustomField<string | undefined>["render"] = ({ value, onChange, name, id, field: { label } }) => (
  <PaddingPickerField value={value} onChange={onChange} name={name} id={id} label={label} />
);

export const toStyle = (padding?: string): string => {
  if (!padding) {
    return "0px";
  }
  return padding
    .split(/\s+/)
    .map((p) => `${p}px`)
    .join(" ");
};
