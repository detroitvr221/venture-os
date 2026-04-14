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
  Link2,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Shield,
} from "lucide-react";
import { approvePendingApproval, rejectPendingApproval } from "../../actions";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { useCompany } from "@/lib/company-context";
import Pagination from "@/components/Pagination";
import { toast } from "sonner";

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
  chain_id?: string | null;
  step_index?: number | null;
  total_steps?: number | null;
}

interface ChainStep {
  approver_role: "owner" | "admin" | "manager";
  timeout_hours: number;
  can_delegate: boolean;
}

interface ApprovalChain {
  id: string;
  name: string;
  resource_type: string;
  threshold_amount: number;
  steps: ChainStep[];
  is_active: boolean;
  organization_id: string;
  created_at: string;
}

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
  agent: "#F5C542",
  sub_company: "#4FC3F7",
  contract: "#eab308",
  deployment: "#f97316",
  proposal: "#eab308",
  workflow_run: "#f97316",
};

const RESOURCE_TYPES = [
  { value: "financial", label: "Financial" },
  { value: "proposal", label: "Proposal" },
  { value: "contract", label: "Contract" },
  { value: "deployment", label: "Deployment" },
  { value: "sub_company", label: "Sub Company" },
];

const APPROVER_ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const orgId = useOrgId();
  const { companyId } = useCompany();

  // Tab state
  const [activeTab, setActiveTab] = useState<"queue" | "chains">("queue");

  // ── Queue state ──
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  // ── Chain state ──
  const [chains, setChains] = useState<ApprovalChain[]>([]);
  const [chainsLoading, setChainsLoading] = useState(true);
  const [showNewChain, setShowNewChain] = useState(false);
  const [newChain, setNewChain] = useState({
    name: "",
    resource_type: "financial",
    threshold_amount: 0,
    steps: [{ approver_role: "owner" as const, timeout_hours: 24, can_delegate: false }],
  });
  const [savingChain, setSavingChain] = useState(false);

  // ── Modals ──
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveModal, setApproveModal] = useState<string | null>(null);

  // ── Chain name lookup ──
  const chainMap = new Map(chains.map((c) => [c.id, c]));

  // ── Fetch approvals ──
  const fetchApprovals = useCallback(async () => {
    const db = createClient();
    let query = db
      .from("approvals")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (!error && data) {
      setApprovals(data as ApprovalRow[]);
    }
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [orgId, companyId, page]);

  // ── Fetch chains ──
  const fetchChains = useCallback(async () => {
    const db = createClient();
    const { data, error } = await db
      .from("approval_chains")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setChains(data as ApprovalChain[]);
    }
    setChainsLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchApprovals();
    fetchChains();
  }, [fetchApprovals, fetchChains]);

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  // ── Approve handler with chain progression ──
  const handleApprove = async (id: string) => {
    setActionLoading(id);

    const approval = approvals.find((a) => a.id === id);

    // Check if this is part of a chain and there are more steps
    if (
      approval?.chain_id &&
      approval.total_steps &&
      approval.step_index !== null &&
      approval.step_index !== undefined &&
      approval.total_steps > approval.step_index + 1
    ) {
      // Approve current step
      const result = await approvePendingApproval(id);
      if (result.success) {
        // Get the chain to find next step's approver role
        const chain = chainMap.get(approval.chain_id);
        const nextStepIndex = approval.step_index + 1;
        const nextStep = chain?.steps?.[nextStepIndex];

        if (chain && nextStep) {
          // Create next approval for the next step
          const db = createClient();
          await db.from("approvals").insert({
            organization_id: orgId,
            company_id: companyId || null,
            resource_type: approval.resource_type,
            resource_id: approval.resource_id,
            requested_by: nextStep.approver_role,
            status: "pending",
            reason: `Chain "${chain.name}" - Step ${nextStepIndex + 1} of ${approval.total_steps}`,
            context: {
              ...(approval.context || {}),
              chain_step: nextStepIndex,
              previous_approver: approval.requested_by,
            },
            chain_id: approval.chain_id,
            step_index: nextStepIndex,
            total_steps: approval.total_steps,
            expires_at: nextStep.timeout_hours
              ? new Date(Date.now() + nextStep.timeout_hours * 3600000).toISOString()
              : null,
          });
          toast.success(`Step ${approval.step_index + 1} approved. Escalated to step ${nextStepIndex + 1}.`);
        }

        setApprovals((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "approved" as const, decided_at: new Date().toISOString() }
              : a
          )
        );
        // Refresh to show the new step
        setTimeout(() => fetchApprovals(), 500);
      } else {
        toast.error("Failed to approve");
      }
    } else {
      // Normal approval (no chain or last step)
      const result = await approvePendingApproval(id);
      if (result.success) {
        setApprovals((prev) =>
          prev.map((a) =>
            a.id === id
              ? { ...a, status: "approved" as const, decided_at: new Date().toISOString() }
              : a
          )
        );
        if (approval?.chain_id) {
          toast.success("Final step approved. Chain complete.");
        }
      }
    }
    setActionLoading(null);
    setApproveModal(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const result = await rejectPendingApproval(id, rejectReason || "Rejected via dashboard");
    if (result.success) {
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "rejected" as const, decided_at: new Date().toISOString(), reason: rejectReason }
            : a
        )
      );
      toast.success("Approval rejected");
    }
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason("");
  };

  // ── Chain CRUD ──
  const handleSaveChain = async () => {
    if (!newChain.name.trim()) {
      toast.error("Chain name is required");
      return;
    }
    if (newChain.steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }
    setSavingChain(true);
    const db = createClient();
    const { error } = await db.from("approval_chains").insert({
      name: newChain.name,
      resource_type: newChain.resource_type,
      threshold_amount: newChain.threshold_amount,
      steps: newChain.steps,
      is_active: true,
      organization_id: orgId,
    });
    if (error) {
      toast.error("Failed to save chain: " + error.message);
    } else {
      toast.success("Approval chain created");
      setShowNewChain(false);
      setNewChain({
        name: "",
        resource_type: "financial",
        threshold_amount: 0,
        steps: [{ approver_role: "owner", timeout_hours: 24, can_delegate: false }],
      });
      fetchChains();
    }
    setSavingChain(false);
  };

  const toggleChainActive = async (chain: ApprovalChain) => {
    const db = createClient();
    const { error } = await db
      .from("approval_chains")
      .update({ is_active: !chain.is_active })
      .eq("id", chain.id);
    if (!error) {
      setChains((prev) =>
        prev.map((c) => (c.id === chain.id ? { ...c, is_active: !c.is_active } : c))
      );
      toast.success(chain.is_active ? "Chain deactivated" : "Chain activated");
    }
  };

  const deleteChain = async (chainId: string) => {
    const db = createClient();
    const { error } = await db.from("approval_chains").delete().eq("id", chainId);
    if (!error) {
      setChains((prev) => prev.filter((c) => c.id !== chainId));
      toast.success("Chain deleted");
    }
  };

  const addStep = () => {
    setNewChain((prev) => ({
      ...prev,
      steps: [...prev.steps, { approver_role: "admin" as const, timeout_hours: 24, can_delegate: false }],
    }));
  };

  const removeStep = (idx: number) => {
    setNewChain((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== idx),
    }));
  };

  const updateStep = (idx: number, field: string, value: unknown) => {
    setNewChain((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  // ── Loading skeleton ──
  if (loading && activeTab === "queue") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#1a1a1a]" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-[#1a1a1a]" />
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] divide-y divide-[#1a1a1a]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[#1a1a1a]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-[#1a1a1a]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[#1a1a1a]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Tab Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Approvals</h1>
          <p className="mt-1 text-sm text-[#888]">
            {activeTab === "queue"
              ? `${pendingCount} pending approvals require your attention`
              : `${chains.length} approval chains configured`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab toggle */}
          <div className="flex rounded-lg border border-[#222] bg-[#0a0a0a] p-0.5">
            <button
              onClick={() => setActiveTab("queue")}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "queue"
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-white"
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => setActiveTab("chains")}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "chains"
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Link2 className="h-3 w-3" />
                Chains
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  QUEUE TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "queue" && (
        <>
          {/* Filters */}
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
                      <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Chain</th>
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
                      const chain = approval.chain_id ? chainMap.get(approval.chain_id) : null;

                      return (
                        <tr
                          key={approval.id}
                          className="border-b border-[#1a1a1a] transition-colors hover:bg-[#111]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="rounded-md p-1.5"
                                style={{ backgroundColor: `${color}15` }}
                              >
                                <TypeIcon className="h-4 w-4" style={{ color }} />
                              </div>
                              <span className="text-xs font-medium capitalize text-[#888]">
                                {approval.resource_type.replace(/_/g, " ")}
                              </span>
                            </div>
                          </td>
                          <td className="max-w-[300px] px-5 py-4">
                            <p className="text-sm font-medium text-white">
                              {approval.reason ??
                                `${approval.resource_type} #${approval.resource_id.slice(0, 8)}`}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#666]">
                              {approval.resource_id}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {approval.chain_id && approval.total_steps ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#4FC3F715] px-2 py-0.5 text-[10px] font-semibold text-[#4FC3F7]">
                                  <Link2 className="h-2.5 w-2.5" />
                                  Step {(approval.step_index ?? 0) + 1} of {approval.total_steps}
                                </span>
                                {chain && (
                                  <span className="text-[10px] text-[#666]">{chain.name}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#555]">--</span>
                            )}
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
                                  onClick={() => setApproveModal(approval.id)}
                                  disabled={actionLoading === approval.id}
                                  className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                                >
                                  {actionLoading === approval.id ? "..." : "Approve"}
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectModal(approval.id);
                                    setRejectReason("");
                                  }}
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

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  CHAINS TAB                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "chains" && (
        <>
          {/* New Chain Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewChain(!showNewChain)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chain
            </button>
          </div>

          {/* New Chain Form */}
          {showNewChain && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#4FC3F7]" />
                Create Approval Chain
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Chain Name *</label>
                  <input
                    value={newChain.name}
                    onChange={(e) => setNewChain({ ...newChain, name: e.target.value })}
                    placeholder="e.g. Large Financial Approval"
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Resource Type</label>
                  <select
                    value={newChain.resource_type}
                    onChange={(e) => setNewChain({ ...newChain, resource_type: e.target.value })}
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
                  >
                    {RESOURCE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Threshold Amount ($)</label>
                  <input
                    type="number"
                    value={newChain.threshold_amount}
                    onChange={(e) =>
                      setNewChain({ ...newChain, threshold_amount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="10000"
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                  />
                </div>
              </div>

              {/* Steps Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#888]">Approval Steps</label>
                  <button
                    onClick={addStep}
                    className="flex items-center gap-1 text-[10px] font-medium text-[#4FC3F7] hover:text-white transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {newChain.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-3 py-2.5"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4FC3F715] text-[10px] font-bold text-[#4FC3F7]">
                        {idx + 1}
                      </span>

                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <label className="mb-0.5 block text-[10px] text-[#666]">Approver Role</label>
                          <select
                            value={step.approver_role}
                            onChange={(e) => updateStep(idx, "approver_role", e.target.value)}
                            className="w-full rounded border border-[#333] bg-[#0a0a0a] px-2 py-1 text-xs text-white focus:border-[#4FC3F7] focus:outline-none"
                          >
                            {APPROVER_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[10px] text-[#666]">Timeout (hours)</label>
                          <input
                            type="number"
                            value={step.timeout_hours}
                            onChange={(e) =>
                              updateStep(idx, "timeout_hours", parseInt(e.target.value) || 24)
                            }
                            className="w-full rounded border border-[#333] bg-[#0a0a0a] px-2 py-1 text-xs text-white focus:border-[#4FC3F7] focus:outline-none"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.can_delegate}
                              onChange={(e) => updateStep(idx, "can_delegate", e.target.checked)}
                              className="h-3.5 w-3.5 rounded border-[#333] bg-[#0a0a0a] accent-[#4FC3F7]"
                            />
                            <span className="text-[10px] text-[#888]">Can Delegate</span>
                          </label>
                        </div>
                      </div>

                      {idx > 0 && (
                        <ChevronRight className="h-3 w-3 text-[#333] -rotate-90 hidden sm:block" />
                      )}

                      {newChain.steps.length > 1 && (
                        <button
                          onClick={() => removeStep(idx)}
                          className="text-[#555] hover:text-[#ef4444] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1a1a1a]">
                <button
                  onClick={() => setShowNewChain(false)}
                  className="rounded-lg px-4 py-2 text-xs text-[#888] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChain}
                  disabled={savingChain}
                  className="rounded-lg bg-[#4FC3F7] px-4 py-2 text-xs font-medium text-white hover:bg-[#2eb5f0] disabled:opacity-50"
                >
                  {savingChain ? "Saving..." : "Save Chain"}
                </button>
              </div>
            </div>
          )}

          {/* Chains List */}
          {chainsLoading ? (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] divide-y divide-[#1a1a1a]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-[#1a1a1a]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-[#1a1a1a]" />
                    <div className="h-3 w-24 animate-pulse rounded bg-[#1a1a1a]" />
                  </div>
                </div>
              ))}
            </div>
          ) : chains.length === 0 ? (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-10 text-center">
              <Link2 className="mx-auto h-10 w-10 text-[#666]" />
              <p className="mt-3 text-sm text-[#888]">No approval chains configured.</p>
              <p className="mt-1 text-xs text-[#555]">
                Create a chain to enforce multi-level approvals for high-value actions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {chains.map((chain) => {
                const color = typeColors[chain.resource_type] ?? "#888";
                const TypeIcon = typeIcons[chain.resource_type] ?? FileText;
                return (
                  <div
                    key={chain.id}
                    className="flex items-center gap-4 rounded-xl border border-[#222] bg-[#0a0a0a] p-4 transition hover:border-[#333]"
                  >
                    <div className="rounded-md p-2" style={{ backgroundColor: `${color}15` }}>
                      <TypeIcon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white truncate">{chain.name}</h3>
                        {!chain.is_active && (
                          <span className="text-[10px] text-[#555] bg-[#1a1a1a] rounded px-1.5 py-0.5">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-[#666]">
                        <span className="capitalize">{chain.resource_type.replace(/_/g, " ")}</span>
                        <span>Threshold: ${chain.threshold_amount.toLocaleString()}</span>
                        <span>{chain.steps.length} step{chain.steps.length !== 1 ? "s" : ""}</span>
                      </div>
                      {/* Step preview */}
                      <div className="mt-2 flex items-center gap-1">
                        {chain.steps.map((step, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="inline-flex items-center rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-[#888]">
                              {step.approver_role}
                              {step.can_delegate && " (D)"}
                            </span>
                            {idx < chain.steps.length - 1 && (
                              <ChevronRight className="h-3 w-3 text-[#333]" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleChainActive(chain)}
                        className="text-[#888] hover:text-white transition-colors"
                        title={chain.is_active ? "Deactivate" : "Activate"}
                      >
                        {chain.is_active ? (
                          <ToggleRight className="h-5 w-5 text-[#22c55e]" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-[#555]" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteChain(chain.id)}
                        className="text-[#555] hover:text-[#ef4444] transition-colors"
                        title="Delete chain"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Approval confirmation modal */}
      {approveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setApproveModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#333] bg-[#0a0a0a] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Confirm Approval</h3>
            {(() => {
              const a = approvals.find((x) => x.id === approveModal);
              const isChainStep =
                a?.chain_id && a.total_steps && a.step_index !== null && a.step_index !== undefined;
              const isLastStep = isChainStep && a.total_steps! <= (a.step_index ?? 0) + 1;
              return (
                <p className="mt-1 text-sm text-[#888]">
                  {isChainStep && !isLastStep
                    ? `This will approve step ${(a.step_index ?? 0) + 1} and escalate to step ${(a.step_index ?? 0) + 2} of ${a.total_steps}.`
                    : isLastStep
                      ? "This is the final step in the chain. Approving will complete the full chain."
                      : "Are you sure you want to approve this item? This action cannot be undone."}
                </p>
              );
            })()}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setApproveModal(null)}
                className="rounded-lg px-4 py-2 text-xs text-[#888] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(approveModal)}
                className="rounded-lg bg-[#22c55e] px-4 py-2 text-xs font-medium text-white hover:bg-[#16a34a]"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#333] bg-[#0a0a0a] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Reject Approval</h3>
            <p className="mt-1 text-sm text-[#888]">Provide a reason for rejecting this item.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
              autoFocus
              className="mt-4 w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#ef4444] focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-lg px-4 py-2 text-xs text-[#888] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectModal)}
                className="rounded-lg bg-[#ef4444] px-4 py-2 text-xs font-medium text-white hover:bg-[#dc2626]"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
