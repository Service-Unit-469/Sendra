import { Ghost } from "lucide-react";
import type React from "react";
import { Link } from "react-router-dom";

export interface EmptyProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  ctaLabel?: string;
  ctaTo?: string;
  onCtaClick?: () => void;
}

export default function Empty({ title, description, icon, ctaLabel, ctaTo, onCtaClick }: EmptyProps) {
  return (
    <div className="relative block w-full p-12 text-center">
      <div className="mx-auto mb-6 h-12 w-12 rounded-sm bg-neutral-100 p-3">{icon ?? <Ghost />}</div>
      <span className="mt-2 block text-sm font-medium text-neutral-800">{title}</span>
      <span className="mt-1 block text-sm font-normal text-neutral-600">{description}</span>
      {ctaLabel && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mx-auto mt-5 inline-flex items-center justify-center rounded-sm bg-neutral-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          {ctaLabel}
        </button>
      )}
      {ctaLabel && ctaTo && !onCtaClick && (
        <Link to={ctaTo} className="mx-auto mt-5 inline-flex items-center justify-center rounded-sm bg-neutral-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-700">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
