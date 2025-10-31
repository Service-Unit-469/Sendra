import { Ghost } from "lucide-react";
import type React from "react";

export interface EmptyProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export default function Empty({ title, description, icon }: EmptyProps) {
  return (
    <div className="relative block w-full p-12 text-center">
      <div className="mx-auto mb-6 h-12 w-12 rounded-sm bg-neutral-100 p-3">{icon ?? <Ghost />}</div>
      <span className="mt-2 block text-sm font-medium text-neutral-800">{title}</span>
      <span className="mt-1 block text-sm font-normal text-neutral-600">{description}</span>
    </div>
  );
}
