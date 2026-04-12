"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  Building2,
  Briefcase,
  Eye,
} from "lucide-react";
import {
  sendProposal,
  acceptProposal,
} from "../../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProposalDetail {
  id: string;
  title: string;
  content: string | null;
  status: string;
  amount: number | null;
  lead_id: string | null;
  client_id: string | null;
  valid_until: string | null;
  sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TimelineEntry {
  id: string;
  action: string;
  actor_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

// ─── Supabase ───────────────────────────────────────────────────────────────

function getClientDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusSteps = ["draft", "sent", "accepted"] as const;

const statusColors: Record<string, { text: string; bg: string }> = {
  draft: { text: "#888", bg: "#88888815" },
  sent: { text: "#4FC3F7", bg: "#4FC3F715" },
  viewed: { text: "#F5C542", bg: "#F5C54215" },
  accepted: { text: "#22c55e", bg: "#22c55e15" },
  rejected: { text: "#ef4444", bg: "#ef444415" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [leadName, setLeadName] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const fetchData = useCallback(async () => {
    const db = getClientDb();

    const [proposalResult, timelineResult] = await Promise.all([
      db
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .eq("organization_id", ORG_ID)
        .single(),
      db
        .from("audit_logs")
        .select("id, action, actor_id, changes, created_at")
        .eq("organization_id", ORG_ID)
        .eq("resource_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (proposalResult.data) {
      const p = proposalResult.data as ProposalDetail;
      setProposal(p);

      // Fetch associated names
      if (p.lead_id) {
        const { data: leadData } = await db
          .from("leads")
          .select("contact_name")
          .eq("id", p.lead_id)
          .single();
        if (leadData) setLeadName((leadData as { contact_name: string }).contact_name);
      }
      if (p.client_id) {
        const { data: clientData } = await db
          .from("clients")
          .select("name")
          .eq("id", p.client_id)
          .single();
        if (clientData) setClientName((clientData as { name: string }).name);
      }
    }

    if (timelineResult.data) {
      setTimeline(timelineResult.data as TimelineEntry[]);
    }

    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleSend = async () => {
    setActing(true);
    const result = await sendProposal(proposalId);
    setActing(false);
    if (result.success) {
      showMessage("Proposal sent successfully");
      fetchData();
    } else {
      showMessage(`Error: ${result.error}`);
    }
  };

  const handleAccept = async () => {
    setActing(true);
    const result = await acceptProposal(proposalId);
    setActing(false);
    if (result.success) {
      showMessage("Proposal accepted! Project created.");
      fetchData();
    } else {
      showMessage(`Error: ${result.error}`);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    setActing(true);
    const db = getClientDb();
    await db
      .from("proposals")
      .update({ status: "rejected" })
      .eq("id", proposalId)
      .eq("organization_id", ORG_ID);
    setActing(false);
    showMessage("Proposal rejected");
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading proposal...</div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[#888]">Proposal not found</p>
        <Link
          href="/proposals"
          className="text-[#4FC3F7] hover:underline text-sm"
        >
          Back to Proposals
        </Link>
      </div>
    );
  }

  const sc = statusColors[proposal.status] ?? statusColors.draft;
  const currentStepIdx = statusSteps.indexOf(
    proposal.status as (typeof statusSteps)[number]
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {actionMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg border border-[#222] bg-[#0a0a0a] px-4 py-3 text-sm text-white shadow-lg">
          {actionMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/proposals"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Proposals
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white">{proposal.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{proposal.title}</h1>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
              style={{ color: sc.text, backgroundColor: sc.bg }}
            >
              {proposal.status}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-[#888]">
            {(clientName || leadName) && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {clientName ?? leadName}
              </span>
            )}
            {proposal.amount && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-[#22c55e]" />
                <span className="text-white font-medium">
                  ${proposal.amount.toLocaleString()}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Created {formatDate(proposal.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {proposal.status === "draft" && (
            <button
              onClick={handleSend}
              disabled={acting}
              className="flex items-center gap-2 rounded-lg bg-[#4FC3F7] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {acting ? "Sending..." : "Send Proposal"}
            </button>
          )}
          {(proposal.status === "sent" || proposal.status === "viewed") && (
            <>
              <button
                onClick={handleAccept}
                disabled={acting}
                className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {acting ? "Processing..." : "Accept"}
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="flex items-center gap-2 rounded-lg border border-[#ef4444] px-4 py-2.5 text-sm font-medium text-[#ef4444] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </>
          )}
          {proposal.status === "accepted" && (
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <Briefcase className="h-4 w-4" />
              View Project
            </button>
          )}
        </div>
      </div>

      {/* Status Progression */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <h3 className="text-sm font-medium text-[#888] mb-4">
          Status Progression
        </h3>
        <div className="flex items-center gap-2">
          {(
            [
              { key: "draft", label: "Draft", icon: FileText },
              { key: "sent", label: "Sent", icon: Send },
              { key: "viewed", label: "Viewed", icon: Eye },
              { key: "accepted", label: "Accepted", icon: CheckCircle2 },
            ] as const
          ).map((step, idx) => {
            const isCurrent = proposal.status === step.key;
            const isPast =
              proposal.status === "accepted"
                ? true
                : proposal.status === "viewed"
                  ? idx <= 2
                  : proposal.status === "sent"
                    ? idx <= 1
                    : idx === 0;
            const isRejected =
              proposal.status === "rejected" && step.key === "accepted";
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex-1 flex items-center">
                <div
                  className={`flex flex-1 flex-col items-center rounded-lg px-3 py-3 transition-all ${
                    isCurrent
                      ? "bg-[#4FC3F715] ring-1 ring-[#4FC3F7]"
                      : isPast
                        ? "bg-[#22c55e10]"
                        : "bg-[#111]"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isCurrent
                        ? "text-[#4FC3F7]"
                        : isPast
                          ? "text-[#22c55e]"
                          : "text-[#666]"
                    }`}
                  />
                  <span
                    className={`mt-1 text-xs font-medium ${
                      isCurrent
                        ? "text-white"
                        : isPast
                          ? "text-[#22c55e]"
                          : "text-[#666]"
                    }`}
                  >
                    {isRejected ? "Rejected" : step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <ChevronRight className="h-4 w-4 text-[#333] mx-1 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Proposal Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Proposal Content
            </h3>
            {proposal.content ? (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm text-[#ccc] leading-relaxed">
                  {proposal.content}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 rounded-lg border border-dashed border-[#222]">
                <div className="text-center">
                  <FileText className="mx-auto h-8 w-8 text-[#333]" />
                  <p className="mt-3 text-sm text-[#666]">
                    No content yet. Generate a proposal from the lead page.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#666]">Amount</p>
                <p className="mt-1 text-white font-medium">
                  {proposal.amount
                    ? `$${proposal.amount.toLocaleString()}`
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Valid Until</p>
                <p className="mt-1 text-white">
                  {formatDate(proposal.valid_until)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Sent At</p>
                <p className="mt-1 text-white">
                  {proposal.sent_at ? formatDate(proposal.sent_at) : "Not sent"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Client / Lead</p>
                <p className="mt-1 text-white">
                  {clientName ?? leadName ?? "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-[#666]">No events yet.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a1a]">
                      <Clock className="h-3 w-3 text-[#666]" />
                    </div>
                    <div className="flex-1 w-px bg-[#222] mt-1" />
                  </div>
                  <div className="pb-3">
                    <p className="text-sm text-white capitalize">
                      {entry.action}
                    </p>
                    <p className="text-xs text-[#666]">
                      {entry.actor_id} &middot;{" "}
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
