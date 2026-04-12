"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("Dashboard error:", error); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ef4444]/20">
        <AlertTriangle className="h-8 w-8 text-[#ef4444]" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-white">Something went wrong</h2>
      <p className="mt-2 text-sm text-[#888]">This page encountered an error. Try refreshing or go back to the dashboard.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="flex items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb]">
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
        <a href="/overview" className="flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2 text-sm text-[#ccc] hover:text-white">
          <Home className="h-4 w-4" /> Dashboard
        </a>
      </div>
    </div>
  );
}
