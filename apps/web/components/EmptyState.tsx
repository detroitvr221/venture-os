"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#333] bg-[#0a0a0a] px-6 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a]">
        <Icon className="h-7 w-7 text-[#555]" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-center text-sm text-[#888]">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
