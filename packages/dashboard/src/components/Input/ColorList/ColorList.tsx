import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import type { FieldError, Merge, UseFormSetValue, UseFormWatch } from "react-hook-form";

export interface ColorListProps {
  label?: string;
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: typescript being typescript
  watch: UseFormWatch<any>;
  // biome-ignore lint/suspicious/noExplicitAny: typescript being typescript
  setValue: UseFormSetValue<any>;
  error?: FieldError | Merge<FieldError, (FieldError | undefined)[]>;
  className?: string;
}

/**
 * ColorList input component for managing a list of colors
 */
export default function ColorList(props: ColorListProps) {
  const [newColor, setNewColor] = useState("#000000");
  const colors = props.watch(props.name) || [];

  const addColor = () => {
    if (newColor && !colors.includes(newColor)) {
      props.setValue(props.name, [...colors, newColor], { shouldValidate: true });
      setNewColor("#000000");
    }
  };

  const removeColor = (colorToRemove: string) => {
    props.setValue(
      props.name,
      colors.filter((c: string) => c !== colorToRemove),
      { shouldValidate: true },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addColor();
    }
  };

  return (
    <div className={props.className}>
      <label className="block text-sm font-medium text-neutral-700">
        {props.label}
        <div className="mt-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-10 w-20 cursor-pointer rounded-sm border border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800"
            />
            <input
              type="text"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="#000000"
              className="block flex-1 rounded-sm border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
            />
            <button type="button" onClick={addColor} className="rounded-sm bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition ease-in-out hover:bg-neutral-900">
              Add
            </button>
          </div>

          {colors.length > 0 && (
            <div className="space-y-1">
              {colors.map((color: string) => (
                <div key={color} className="flex items-center gap-2 rounded-sm border border-neutral-200 bg-neutral-50 p-2">
                  <div className="h-6 w-6 rounded border border-neutral-300" style={{ backgroundColor: color }} />
                  <span className="flex-1 font-mono text-sm text-neutral-700">{color}</span>
                  <button type="button" onClick={() => removeColor(color)} className="text-neutral-400 transition ease-in-out hover:text-red-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </label>
      <AnimatePresence>
        {props.error && (
          <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
            {props.error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
