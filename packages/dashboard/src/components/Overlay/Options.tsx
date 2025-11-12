import { AnimatePresence, motion } from "framer-motion";
import { EllipsisVertical } from "lucide-react";
import type React from "react";
import { createRef, type MutableRefObject, useEffect, useState } from "react";

export const Options: React.FC<{ options: React.ReactNode }> = ({ options }) => {
  const ref = createRef<HTMLDivElement>();
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => {
    const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;

    const handleClickOutside = (event: MouseEvent) => {
      if (mutableRef.current && !mutableRef.current.contains(event.target as Node) && optionsOpen) {
        setOptionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, optionsOpen]);

  return (
    <div className="relative ml-3 inline-block text-left" ref={ref}>
      <div>
        <button
          type="button"
          onClick={() => setOptionsOpen(!optionsOpen)}
          className="flex items-center rounded-full text-neutral-500 transition hover:text-neutral-800"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
        >
          <span className="sr-only">Open options</span>

          <EllipsisVertical size={18} />
        </button>
      </div>

      <AnimatePresence>
        {optionsOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
            tabIndex={-1}
          >
            {options}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
