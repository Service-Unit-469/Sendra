import { AnimatePresence, motion } from "framer-motion";
import { EllipsisVertical } from "lucide-react";
import React, { type MutableRefObject, useEffect, useState } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  options?: React.ReactNode;
}

/**
 * @param root0
 * @param root0.title
 * @param root0.description
 * @param root0.children
 * @param root0.className
 * @param root0.actions
 * @param root0.options
 */
export default function Card({ title, description, children, className, actions, options }: CardProps) {
  const ref = React.createRef<HTMLDivElement>();

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
    <div className={`rounded-sm border border-neutral-200 bg-white px-8 py-4 ${className}`}>
      <div className={"flex items-center"}>
        <div className={"flex w-full flex-col gap-3 md:flex-row md:items-center"}>
          <div>
            <h2 className={"text-xl font-semibold leading-tight text-neutral-800"}>{title}</h2>
            <p className={"text-sm text-neutral-500"}>{description}</p>
          </div>
          <div className={"flex flex-1 gap-x-2.5 md:justify-end"}>{actions}</div>
        </div>

        {options && (
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
        )}
      </div>

      <div className={"py-4"}>{children}</div>
    </div>
  );
}
