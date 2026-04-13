"use client";

import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-400/10">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-center text-sm text-[#888]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 rounded-lg border border-[#333] bg-[#111] px-5 py-2 text-sm font-medium text-white transition hover:border-[#4FC3F7] hover:text-[#4FC3F7]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
