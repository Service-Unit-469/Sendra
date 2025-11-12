import type { CustomField } from "@measured/puck";
import { useActiveProject } from "../../../lib/hooks/projects";

export type ColorPickerFieldProps = {
  label?: string;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  name: string;
  id: string;
};

/**
 * Custom Puck field component for color selection
 * Allows selecting from project brand colors or entering a custom hex code
 */
const ColorPickerField: React.FC<ColorPickerFieldProps> = ({ value = "#000000", onChange, name, id, label }) => {
  const activeProject = useActiveProject();
  const projectColors = activeProject?.colors || [];

  const handleColorChange = (newColor: string | undefined) => {
    if (!newColor) {
      onChange(undefined);
      return;
    }
    // Ensure color is in hex format
    const formattedColor = newColor.startsWith("#") ? newColor : `#${newColor}`;
    onChange(formattedColor);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-s text-neutral-800 mb-1">
        {label ?? "Color"}
      </label>
      {projectColors.length > 0 && (
        <div>
          <div className="mb-1 text-xs text-neutral-500">Project Colors</div>
          <div className="flex flex-wrap gap-2">
            {projectColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorChange(color)}
                className={`h-8 w-8 rounded border-2 transition-all hover:scale-110 ${value === color ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-2" : "border-neutral-300"}`}
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs text-neutral-500">Custom Color</div>
        <div className="flex gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-10 w-16 cursor-pointer rounded border border-neutral-300 transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
            title="Pick a custom color"
          />
          <input
            type="text"
            id={id}
            name={name}
            value={value}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#000000"
            pattern="^#[0-9A-Fa-f]{6}$"
            className="block flex-1 rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Puck custom field render function for color picker
 * Usage in component config:
 * ```
 * fields: {
 *   backgroundColor: {
 *     type: "custom",
 *     label: "Background Color",
 *     render: ColorPickerRender,
 *   }
 * }
 * ```
 */
export const ColorPickerRender: CustomField<string | undefined>["render"] = ({ value, onChange, name, id, field: { label } }) => (
  <ColorPickerField value={value} onChange={onChange} name={name} id={id} label={label} />
);
