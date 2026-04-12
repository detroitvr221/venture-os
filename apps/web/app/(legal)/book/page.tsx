"use client";

import { useEffect } from "react";
import Link from "next/link";
import Cal, { getCalApi } from "@calcom/embed-react";

export default function BookingPage() {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal("ui", {
        theme: "dark",
        hideEventTypeDetails: false,
      });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#ffffff08] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
              <span className="text-sm font-bold text-white">NB</span>
            </div>
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-lg font-bold text-transparent">
              Northbridge Digital
            </span>
          </Link>
          <Link href="/signup" className="rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2 text-sm font-medium text-white">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Book a Free Consultation</h1>
          <p className="mt-2 text-sm text-[#888]">
            30 minutes with our team to discuss your goals, review your current setup, and map out a growth plan.
          </p>
          <p className="mt-1 text-xs text-[#666]">No commitment. No sales pressure. Just strategy.</p>
        </div>

        <div className="rounded-2xl border border-[#222] bg-[#111] p-2">
          <Cal
            calLink="detroit-wwzue8/30min"
            style={{ width: "100%", height: "700px", overflow: "auto" }}
            config={{
              layout: "month_view",
              theme: "dark",
            }}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-[#666]">
            After booking, you'll receive a calendar invite with a video call link.
          </p>
          <Link href="/" className="mt-2 inline-block text-xs text-[#888] hover:text-white">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
