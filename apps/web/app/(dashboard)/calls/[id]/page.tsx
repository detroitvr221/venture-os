"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DetailSkeleton } from "@/components/PageSkeleton";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  ArrowLeft,
  Play,
  FileText,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CallLog {
  id: string;
  phone_number: string;
  direction: "inbound" | "outbound";
  status: string;
  duration: number | null;
  transcript: string | null;
  recording_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  lead_id: string | null;
  client_id: string | null;
  contact_id: string | null;
  organization_id: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getContactName(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "Unknown";
  return (
    (metadata.contact_name as string) ||
    (metadata.name as string) ||
    "Unknown"
  );
}

const statusConfig: Record<
  string,
  { text: string; bg: string; pulse?: boolean }
> = {
  initiating: { text: "#eab308", bg: "#eab30815" },
  ringing: { text: "#4FC3F7", bg: "#4FC3F715" },
  "in-progress": { text: "#4FC3F7", bg: "#4FC3F715", pulse: true },
  completed: { text: "#22c55e", bg: "#22c55e15" },
  failed: { text: "#ef4444", bg: "#ef444415" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CallDetailPage() {
  const params = useParams();
  const callId = params.id as string;

  const [call, setCall] = useState<CallLog | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Load call data ──────────────────────────────────────────────────────

  useEffect(() => {
    async function loadCall() {
      const supabase = createClient();
      const { data } = await supabase
        .from("call_logs")
        .select("*")
        .eq("id", callId)
        .single();

      if (data) {
        setCall(data as CallLog);
      }
      setLoading(false);
    }
    loadCall();
  }, [callId]);

  // ── Realtime status updates ─────────────────────────────────────────────

  useEffect(() => {
    if (!call) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`call_detail_${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_logs",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          setCall(payload.new as CallLog);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [call, callId]);

  // ── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <DetailSkeleton />
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────

  if (!call) {
    return (
      <div className="py-16 text-center">
        <Phone className="mx-auto mb-3 h-10 w-10 text-[#333]" />
        <p className="text-[#666]">Call not found</p>
        <Link
          href="/calls"
          className="mt-2 inline-block text-sm text-[#4FC3F7] hover:underline"
        >
          Back to calls
        </Link>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────

  const contactName = getContactName(call.metadata);
  const sc = statusConfig[call.status] ?? statusConfig.completed;
  const summary = call.metadata?.summary as string | undefined;
  const actionItems = call.metadata?.action_items as string[] | undefined;
  const templateUsed = call.metadata?.template_name as string | undefined;
  const callScript = call.metadata?.script as string | undefined;
  const cost = call.metadata?.cost as number | undefined;
  const company = call.metadata?.company as string | undefined;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back */}
      <Link
        href="/calls"
        className="mb-6 flex items-center gap-2 text-sm text-[#888] transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to calls
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main Content (2/3) ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#4FC3F7]/20">
                {call.direction === "inbound" ? (
                  <PhoneIncoming className="h-7 w-7 text-[#4FC3F7]" />
                ) : (
                  <PhoneOutgoing className="h-7 w-7 text-[#4FC3F7]" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{contactName}</h1>
                <p className="mt-1 text-sm text-[#888]">{call.phone_number}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#888]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(call.created_at)}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(call.duration)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${sc.pulse ? "animate-pulse" : ""}`}
                    style={{ color: sc.text, backgroundColor: sc.bg }}
                  >
                    {call.status}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                      call.direction === "inbound"
                        ? "bg-[#22c55e]/15 text-[#22c55e]"
                        : "bg-[#4FC3F7]/15 text-[#4FC3F7]"
                    }`}
                  >
                    {call.direction === "inbound" ? (
                      <PhoneIncoming className="h-3 w-3" />
                    ) : (
                      <PhoneOutgoing className="h-3 w-3" />
                    )}
                    {call.direction}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recording */}
          {call.recording_url && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]">
                <Play className="h-4 w-4" />
                Recording
              </h2>
              <audio
                controls
                src={call.recording_url}
                className="w-full rounded-lg"
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]">
                <FileText className="h-4 w-4" />
                Transcript
              </h2>
              <div className="rounded-lg bg-[#111] p-4">
                <pre className="whitespace-pre-wrap text-sm text-[#ddd] font-sans leading-relaxed">
                  {call.transcript}
                </pre>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {summary && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]">
                <AlertCircle className="h-4 w-4" />
                AI Summary
              </h2>
              <div className="rounded-lg border border-[#4FC3F7]/20 bg-[#4FC3F7]/5 p-4">
                <p className="text-sm text-[#ddd] leading-relaxed">{summary}</p>
              </div>
            </div>
          )}

          {/* Action Items */}
          {actionItems && actionItems.length > 0 && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]">
                <CheckCircle2 className="h-4 w-4" />
                Action Items
              </h2>
              <div className="space-y-2">
                {actionItems.map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-[#1a1a1a] p-3 transition hover:border-[#333] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-[#333] bg-[#111] text-[#4FC3F7] focus:ring-[#4FC3F7] focus:ring-offset-0"
                    />
                    <span className="text-sm text-[#ccc]">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 text-sm font-medium text-[#888]">
              Call Details
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {templateUsed && (
                <div>
                  <p className="text-xs text-[#666]">Template</p>
                  <p className="mt-1 text-sm text-white">{templateUsed}</p>
                </div>
              )}
              {cost !== undefined && (
                <div>
                  <p className="text-xs text-[#666]">Cost</p>
                  <p className="mt-1 text-sm text-white">
                    ${cost.toFixed(4)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#666]">Duration</p>
                <p className="mt-1 text-sm text-white font-mono">
                  {formatDuration(call.duration)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Direction</p>
                <p className="mt-1 text-sm text-white capitalize">
                  {call.direction}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Status</p>
                <p className="mt-1 text-sm text-white capitalize">
                  {call.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Call ID</p>
                <p className="mt-1 text-xs text-[#888] font-mono truncate">
                  {call.id}
                </p>
              </div>
            </div>
            {callScript && (
              <div className="mt-4 border-t border-[#1a1a1a] pt-4">
                <p className="text-xs text-[#666] mb-2">Script Used</p>
                <pre className="whitespace-pre-wrap rounded-lg bg-[#111] p-3 text-xs text-[#aaa] font-sans">
                  {callScript}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar (1/3) ──────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Contact Info */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]">
              <User className="h-4 w-4" />
              Contact
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a]">
                  <User className="h-5 w-5 text-[#666]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {contactName}
                  </p>
                  <p className="text-xs text-[#888]">{call.phone_number}</p>
                </div>
              </div>

              {company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-[#666]" />
                  <span className="text-[#ccc]">{company}</span>
                </div>
              )}

              {/* Links to lead / client */}
              <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
                {call.lead_id && (
                  <Link
                    href={`/leads/${call.lead_id}`}
                    className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222]"
                  >
                    <FileText className="h-4 w-4 text-[#F5C542]" />
                    View Lead
                  </Link>
                )}
                {call.client_id && (
                  <Link
                    href={`/clients/${call.client_id}`}
                    className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222]"
                  >
                    <Building2 className="h-4 w-4 text-[#4FC3F7]" />
                    View Client
                  </Link>
                )}
                {!call.lead_id && !call.client_id && (
                  <p className="text-xs text-[#555]">
                    No linked lead or client
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 text-sm font-medium text-[#888]">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link
                href={`/email/compose?to=${call.phone_number}`}
                className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222]"
              >
                <FileText className="h-4 w-4" />
                Send Follow-up
              </Link>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(`tel:${call.phone_number}`);
                  }
                }}
                className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222]"
              >
                <Phone className="h-4 w-4" />
                Call Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
