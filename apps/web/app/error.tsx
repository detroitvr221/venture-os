"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ef4444]/20">
          <svg className="h-8 w-8 text-[#ef4444]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#888]">An unexpected error occurred. Our team has been notified.</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button onClick={() => reset()} className="rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
            Try Again
          </button>
          <a href="/overview" className="rounded-lg border border-[#333] px-6 py-2.5 text-sm text-[#ccc] transition hover:border-[#444] hover:text-white">
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
