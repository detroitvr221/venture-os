"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Bot,
  Building2,
  CreditCard,
  Filter,
} from "lucide-react";
import { approvePendingApproval, rejectPendingApproval } from "../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalRow {
  id: string;
  resource_type: string;
  resource_id: string;
  requested_by: string;
  status: ApprovalStatus;
  reason: string | null;
  context: Record<string, unknown>;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  expires_at: string | null;
}

// ─── Supabase ───────────────────────────────────────────────────────────────

function getClientDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeIcons: Record<string, typeof FileText> = {
  financial: CreditCard,
  agent: Bot,
  sub_company: Building2,
  contract: FileText,
  deployment: AlertTriangle,
  proposal: FileText,
  workflow_run: AlertTriangle,
};

const typeColors: Record<string, string> = {
  financial: "#22c55e",
  agent: "#8b5cf6",
  sub_company: "#3b82f6",
  contract: "#eab308",
  deployment: "#f97316",
  proposal: "#eab308",
  workflow_run: "#f97316",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    const db = getClientDb();
    const { data, error } = await db
      .from("approvals")
      .select("*")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setApprovals(data as ApprovalRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await approvePendingApproval(id);
    if (result.success) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "approved" as const, decided_at: new Date().toISOString() } : a)),
      );
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (reason === null) return; // User cancelled
    setActionLoading(id);
    const result = await rejectPendingApproval(id, reason || "Rejected via dashboard");
    if (result.success) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const, decided_at: new Date().toISOString(), reason } : a)),
      );
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Approvals Queue</h1>
          <p className="mt-1 text-sm text-[#888]">
            {pendingCount} pending approvals require your attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#666]" />
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#888] hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[#666]" />
          <p className="mt-3 text-sm text-[#888]">No approvals found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#222] bg-[#0a0a0a]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#222]">
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Details</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Requested By</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Created</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium text-[#888]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((approval) => {
                  const TypeIcon = typeIcons[approval.resource_type] ?? FileText;
                  const color = typeColors[approval.resource_type] ?? "#888";

                  return (
                    <tr
                      key={approval.id}
                      className="border-b border-[#1a1a1a] transition-colors hover:bg-[#111]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-md p-1.5" style={{ backgroundColor: `${color}15` }}>
                            <TypeIcon className="h-4 w-4" style={{ color }} />
                          </div>
                          <span className="text-xs font-medium capitalize text-[#888]">
                            {approval.resource_type.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[300px] px-5 py-4">
                        <p className="text-sm font-medium text-white">
                          {approval.reason ?? `${approval.resource_type} #${approval.resource_id.slice(0, 8)}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#666]">
                          {approval.resource_id}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#888]">{approval.requested_by}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[#888]">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{timeAgo(approval.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {approval.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eab30815] px-2.5 py-1 text-[10px] font-semibold text-[#eab308]">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : approval.status === "approved" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e15] px-2.5 py-1 text-[10px] font-semibold text-[#22c55e]">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#ef444415] px-2.5 py-1 text-[10px] font-semibold text-[#ef4444]">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {approval.status === "pending" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(approval.id)}
                              disabled={actionLoading === approval.id}
                              className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                            >
                              {actionLoading === approval.id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleReject(approval.id)}
                              disabled={actionLoading === approval.id}
                              className="rounded-lg border border-[#333] bg-transparent px-3 py-1.5 text-xs font-medium text-[#888] transition-colors hover:border-[#ef4444] hover:text-[#ef4444] disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
