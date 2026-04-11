"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Paperclip, X } from "lucide-react";

const FROM_OPTIONS = [
  "atlas@thenorthbridgemi.org",
  "hello@thenorthbridgemi.org",
  "support@thenorthbridgemi.org",
  "noreply@thenorthbridgemi.org",
];

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-32"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" /></div>}>
      <ComposeForm />
    </Suspense>
  );
}

function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(FROM_OPTIONS[0]);
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!to.trim() || !subject.trim()) {
      setError("To and Subject are required");
      return;
    }
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: to.split(",").map((s) => s.trim()).filter(Boolean),
          cc: cc ? cc.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          subject,
          text: body,
          html: body.includes("<") ? body : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send email");
        setSending(false);
        return;
      }

      setSent(true);
      setTimeout(() => router.push("/email"), 1500);
    } catch (err) {
      setError("Network error. Please try again.");
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10b981]/20">
          <Send className="h-7 w-7 text-[#10b981]" />
        </div>
        <p className="mt-4 text-lg font-medium text-white">Email Sent</p>
        <p className="mt-1 text-sm text-[#888]">Redirecting to inbox...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/email"
          className="flex items-center gap-2 text-sm text-[#888] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Link>
        <h1 className="text-lg font-semibold text-white">New Email</h1>
      </div>

      {/* Compose form */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {/* From */}
        <div className="flex items-center border-b border-[#1a1a1a] px-4 py-2.5">
          <label className="w-16 text-sm text-[#666]">From</label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
          >
            {FROM_OPTIONS.map((addr) => (
              <option key={addr} value={addr} className="bg-[#0a0a0a]">
                {addr}
              </option>
            ))}
          </select>
        </div>

        {/* To */}
        <div className="flex items-center border-b border-[#1a1a1a] px-4 py-2.5">
          <label className="w-16 text-sm text-[#666]">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#444] focus:outline-none"
          />
          {!showCc && (
            <button
              onClick={() => setShowCc(true)}
              className="text-xs text-[#666] hover:text-[#999]"
            >
              CC
            </button>
          )}
        </div>

        {/* CC */}
        {showCc && (
          <div className="flex items-center border-b border-[#1a1a1a] px-4 py-2.5">
            <label className="w-16 text-sm text-[#666]">CC</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#444] focus:outline-none"
            />
            <button onClick={() => { setShowCc(false); setCc(""); }}>
              <X className="h-3.5 w-3.5 text-[#666]" />
            </button>
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center border-b border-[#1a1a1a] px-4 py-2.5">
          <label className="w-16 text-sm text-[#666]">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#444] focus:outline-none"
          />
        </div>

        {/* Body */}
        <div className="p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={16}
            className="w-full resize-none bg-transparent text-sm text-[#ddd] placeholder:text-[#444] focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#1a1a1a] px-4 py-3">
          <div className="text-xs text-[#666]">
            Sent via Resend from thenorthbridgemi.org
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-xs text-[#ef4444]">{error}</span>
            )}
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
