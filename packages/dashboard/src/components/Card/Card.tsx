import React, { type MutableRefObject, useEffect, useState } from "react";
import { Options } from "../Overlay/Options";

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

        {options && <Options options={options} />}
      </div>

      <div className={"py-4"}>{children}</div>
    </div>
  );
}
