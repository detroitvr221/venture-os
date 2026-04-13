"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Globe,
  Clock,
  DollarSign,
  FileText,
  Send,
  ChevronRight,
  Save,
  Sparkles,
  PlayCircle,
  User,
  Tag,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import {
  updateLeadStage,
  generateProposal,
  startFollowUp,
} from "../../../actions";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";

// ─── Types ──────────────────────────────────────────────────────────────────

type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

interface LeadDetail {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company_id: string;
  source: string | null;
  stage: LeadStage;
  score: number;
  assigned_agent: string | null;
  notes: string | null;
  expected_value: number | null;
  lost_reason: string | null;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProposalRow {
  id: string;
  title: string;
  status: string;
  amount: number | null;
  created_at: string;
}

interface AuditLogRow {
  id: string;
  action: string;
  resource_type: string;
  actor_type: string;
  actor_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const stages: { key: LeadStage; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#4FC3F7" },
  { key: "contacted", label: "Contacted", color: "#F5C542" },
  { key: "qualified", label: "Qualified", color: "#22c55e" },
  { key: "proposal", label: "Proposal", color: "#eab308" },
  { key: "negotiation", label: "Negotiation", color: "#f97316" },
  { key: "won", label: "Won", color: "#22c55e" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];


// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
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

function stageIndex(stage: LeadStage): number {
  return stages.findIndex((s) => s.key === stage);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const orgId = useOrgId();

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [timeline, setTimeline] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [startingFollowUp, setStartingFollowUp] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const db = createClient();

    const [leadResult, proposalsResult, timelineResult] = await Promise.all([
      db
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("organization_id", orgId)
        .single(),
      db
        .from("proposals")
        .select("id, title, status, amount, created_at")
        .eq("organization_id", orgId)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      db
        .from("audit_logs")
        .select("id, action, resource_type, actor_type, actor_id, changes, created_at")
        .eq("organization_id", orgId)
        .eq("resource_id", leadId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (leadResult.data) {
      setLead(leadResult.data as LeadDetail);
      setNotes(leadResult.data.notes ?? "");
    }
    if (proposalsResult.data) {
      setProposals(proposalsResult.data as ProposalRow[]);
    }
    if (timelineResult.data) {
      setTimeline(timelineResult.data as AuditLogRow[]);
    }
    setLoading(false);
  }, [leadId, orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStageChange = async (newStage: LeadStage) => {
    if (!lead) return;
    const prev = lead.stage;
    setLead({ ...lead, stage: newStage });
    const result = await updateLeadStage(leadId, newStage);
    if (!result.success) {
      setLead({ ...lead, stage: prev });
      setActionMessage(`Error: ${result.error}`);
    } else {
      setActionMessage(`Stage updated to ${newStage}`);
      fetchData();
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSaving(true);
    const db = createClient();
    await db
      .from("leads")
      .update({ notes })
      .eq("id", leadId)
      .eq("organization_id", orgId);
    setSaving(false);
    setActionMessage("Notes saved");
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleGenerateProposal = async () => {
    if (!lead) return;
    setGenerating(true);
    const result = await generateProposal(leadId);
    setGenerating(false);
    if (result.success) {
      setActionMessage("Proposal generation triggered");
      fetchData();
    } else {
      setActionMessage(`Error: ${result.error}`);
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleStartFollowUp = async () => {
    if (!lead) return;
    setStartingFollowUp(true);
    const result = await startFollowUp(leadId, leadId);
    setStartingFollowUp(false);
    if (result.success) {
      setActionMessage("Follow-up sequence started");
    } else {
      setActionMessage(`Error: ${result.error}`);
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading lead...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[#888]">Lead not found</p>
        <Link href="/leads" className="text-[#4FC3F7] hover:underline text-sm">
          Back to Leads
        </Link>
      </div>
    );
  }

  const currentStageIdx = stageIndex(lead.stage);
  const stageColor =
    stages.find((s) => s.key === lead.stage)?.color ?? "#888";

  return (
    <div className="space-y-6">
      {/* Action message toast */}
      {actionMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg border border-[#222] bg-[#0a0a0a] px-4 py-3 text-sm text-white shadow-lg">
          {actionMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/leads"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Leads
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white">{lead.contact_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{lead.contact_name}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-[#888]">
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              {lead.contact_email}
            </span>
            {lead.contact_phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                {lead.contact_phone}
              </span>
            )}
            {lead.source && (
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                {lead.source}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateProposal}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "Generate Proposal"}
          </button>
          <button
            onClick={handleStartFollowUp}
            disabled={startingFollowUp}
            className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#111] disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" />
            {startingFollowUp ? "Starting..." : "Start Follow-up"}
          </button>
        </div>
      </div>

      {/* Stage Progression */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <h3 className="text-sm font-medium text-[#888] mb-4">
          Stage Progression
        </h3>
        <div className="flex items-center gap-2">
          {stages.map((s, idx) => {
            const isActive = s.key === lead.stage;
            const isPast = idx < currentStageIdx;
            const isTerminal = s.key === "won" || s.key === "lost";

            return (
              <button
                key={s.key}
                onClick={() => handleStageChange(s.key)}
                className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "text-white ring-2"
                    : isPast
                      ? "text-white/80"
                      : "text-[#666] hover:text-[#999] hover:bg-[#111]"
                }`}
                style={{
                  backgroundColor: isActive
                    ? `${s.color}25`
                    : isPast
                      ? `${s.color}15`
                      : "transparent",
                  borderColor: isActive ? s.color : "transparent",
                  ...(isActive ? { boxShadow: `0 0 0 2px ${s.color}40` } : {}),
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Details + Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Details */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-[#666]">Score</p>
                <p className="flex items-center gap-2 text-sm text-white">
                  <BarChart3 className="h-4 w-4 text-[#4FC3F7]" />
                  <span
                    className={
                      lead.score > 70
                        ? "text-[#22c55e]"
                        : lead.score > 40
                          ? "text-[#eab308]"
                          : "text-[#888]"
                    }
                  >
                    {lead.score}/100
                  </span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#666]">Expected Value</p>
                <p className="flex items-center gap-2 text-sm text-white">
                  <DollarSign className="h-4 w-4 text-[#22c55e]" />
                  {lead.expected_value
                    ? `$${lead.expected_value.toLocaleString()}`
                    : "Not set"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#666]">Assigned Agent</p>
                <p className="flex items-center gap-2 text-sm text-white">
                  <User className="h-4 w-4 text-[#F5C542]" />
                  {lead.assigned_agent ?? "Unassigned"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#666]">Source</p>
                <p className="flex items-center gap-2 text-sm text-white">
                  <Tag className="h-4 w-4 text-[#f97316]" />
                  {lead.source ?? "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#666]">Created</p>
                <p className="flex items-center gap-2 text-sm text-white">
                  <Clock className="h-4 w-4 text-[#666]" />
                  {formatDate(lead.created_at)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-[#666]">Stage</p>
                <p className="text-sm">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                    style={{
                      color: stageColor,
                      backgroundColor: `${stageColor}15`,
                    }}
                  >
                    {lead.stage}
                  </span>
                </p>
              </div>
              {lead.lost_reason && (
                <div className="col-span-2 space-y-1">
                  <p className="text-xs text-[#666]">Lost Reason</p>
                  <p className="text-sm text-[#ef4444]">{lead.lost_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Notes</h3>
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-[#333] px-3 py-1.5 text-xs font-medium text-[#888] transition-colors hover:text-white hover:border-[#4FC3F7] disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-[#333] bg-[#111] px-4 py-3 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none resize-none"
              placeholder="Add notes about this lead..."
            />
          </div>

          {/* Associated Proposals */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Proposals</h3>
              <span className="rounded-full bg-[#1a1a1a] px-2.5 py-0.5 text-xs text-[#888]">
                {proposals.length}
              </span>
            </div>
            {proposals.length === 0 ? (
              <p className="text-sm text-[#666]">
                No proposals yet. Click &quot;Generate Proposal&quot; to create one.
              </p>
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => {
                  const statusColors: Record<string, { text: string; bg: string }> = {
                    draft: { text: "#888", bg: "#88888815" },
                    sent: { text: "#4FC3F7", bg: "#4FC3F715" },
                    accepted: { text: "#22c55e", bg: "#22c55e15" },
                    rejected: { text: "#ef4444", bg: "#ef444415" },
                  };
                  const sc = statusColors[p.status] ?? statusColors.draft;
                  return (
                    <Link
                      key={p.id}
                      href={`/proposals/${p.id}`}
                      className="flex items-center justify-between rounded-lg border border-[#222] bg-[#111] p-4 transition-colors hover:border-[#333]"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-[#666]" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {p.title}
                          </p>
                          <p className="text-xs text-[#888]">
                            {formatDate(p.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.amount && (
                          <span className="text-sm font-medium text-white">
                            ${p.amount.toLocaleString()}
                          </span>
                        )}
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize"
                          style={{ color: sc.text, backgroundColor: sc.bg }}
                        >
                          {p.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#666]" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Activity Timeline */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h3 className="text-lg font-semibold text-white mb-4">
              Activity Timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-[#666]">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]">
                        <MessageSquare className="h-3.5 w-3.5 text-[#666]" />
                      </div>
                      <div className="flex-1 w-px bg-[#222] mt-1" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-white">
                        <span className="capitalize font-medium">
                          {entry.action}
                        </span>{" "}
                        <span className="text-[#888]">
                          {entry.resource_type}
                        </span>
                      </p>
                      <p className="text-xs text-[#666] mt-0.5">
                        {entry.actor_type === "agent"
                          ? `Agent: ${entry.actor_id}`
                          : entry.actor_id}{" "}
                        &middot; {formatDateTime(entry.created_at)}
                      </p>
                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <div className="mt-1.5 rounded-md bg-[#111] px-3 py-2 text-xs text-[#888]">
                          {Object.entries(entry.changes).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-[#666]">{k}:</span>{" "}
                              {typeof v === "object" && v !== null
                                ? JSON.stringify(v)
                                : String(v)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
