/**
 * Shared status colors and badge utilities
 * Used across: jobs, leads, proposals, projects, campaigns, invoices, approvals
 */

// ─── Job Status ──────────────────────────────────────────────────────────────

export const JOB_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-[#333]/30", text: "text-[#9ca3af]", dot: "bg-[#9ca3af]" },
  queued: { bg: "bg-yellow-400/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  running: { bg: "bg-[#4FC3F7]/10", text: "text-[#4FC3F7]", dot: "bg-[#4FC3F7] animate-pulse" },
  completed: { bg: "bg-green-400/10", text: "text-green-400", dot: "bg-green-400" },
  failed: { bg: "bg-red-400/10", text: "text-red-400", dot: "bg-red-400" },
  cancelled: { bg: "bg-[#333]/30", text: "text-[#737373] line-through", dot: "bg-[#737373]" },
};

// ─── Lead Stage ──────────────────────────────────────────────────────────────

export const LEAD_STAGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-[#4FC3F7]/10", text: "text-[#4FC3F7]", label: "New" },
  contacted: { bg: "bg-yellow-400/10", text: "text-yellow-400", label: "Contacted" },
  qualified: { bg: "bg-purple-400/10", text: "text-purple-400", label: "Qualified" },
  proposal: { bg: "bg-orange-400/10", text: "text-orange-400", label: "Proposal" },
  negotiation: { bg: "bg-pink-400/10", text: "text-pink-400", label: "Negotiation" },
  won: { bg: "bg-green-400/10", text: "text-green-400", label: "Won" },
  lost: { bg: "bg-red-400/10", text: "text-red-400", label: "Lost" },
};

// ─── Project Status ──────────────────────────────────────────────────────────

export const PROJECT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  planning: { bg: "bg-[#4FC3F7]/10", text: "text-[#4FC3F7]" },
  active: { bg: "bg-green-400/10", text: "text-green-400" },
  on_hold: { bg: "bg-yellow-400/10", text: "text-yellow-400" },
  completed: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
  cancelled: { bg: "bg-red-400/10", text: "text-red-400" },
};

// ─── Proposal Status ─────────────────────────────────────────────────────────

export const PROPOSAL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-[#333]/30", text: "text-[#9ca3af]" },
  sent: { bg: "bg-[#4FC3F7]/10", text: "text-[#4FC3F7]" },
  viewed: { bg: "bg-purple-400/10", text: "text-purple-400" },
  accepted: { bg: "bg-green-400/10", text: "text-green-400" },
  rejected: { bg: "bg-red-400/10", text: "text-red-400" },
  expired: { bg: "bg-[#333]/30", text: "text-[#737373]" },
};

// ─── Invoice Status ──────────────────────────────────────────────────────────

export const INVOICE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-[#333]/30", text: "text-[#9ca3af]" },
  sent: { bg: "bg-[#4FC3F7]/10", text: "text-[#4FC3F7]" },
  paid: { bg: "bg-green-400/10", text: "text-green-400" },
  overdue: { bg: "bg-red-400/10", text: "text-red-400" },
  void: { bg: "bg-[#333]/30", text: "text-[#737373] line-through" },
};

// ─── Approval Status ─────────────────────────────────────────────────────────

export const APPROVAL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-400/10", text: "text-yellow-400" },
  approved: { bg: "bg-green-400/10", text: "text-green-400" },
  rejected: { bg: "bg-red-400/10", text: "text-red-400" },
  expired: { bg: "bg-[#333]/30", text: "text-[#737373]" },
};

// ─── Campaign Status ─────────────────────────────────────────────────────────

export const CAMPAIGN_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-[#333]/30", text: "text-[#9ca3af]" },
  active: { bg: "bg-green-400/10", text: "text-green-400" },
  paused: { bg: "bg-yellow-400/10", text: "text-yellow-400" },
  completed: { bg: "bg-emerald-400/10", text: "text-emerald-400" },
  cancelled: { bg: "bg-red-400/10", text: "text-red-400" },
};

// ─── Severity ────────────────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-400/10", text: "text-red-400" },
  warning: { bg: "bg-yellow-400/10", text: "text-yellow-400" },
  info: { bg: "bg-[#4FC3F7]/10", text: "text-[#4FC3F7]" },
  pass: { bg: "bg-green-400/10", text: "text-green-400" },
};

// ─── Score Color ─────────────────────────────────────────────────────────────

export function scoreColor(score: number): string {
  if (score >= 76) return "#22c55e";
  if (score >= 51) return "#f59e0b";
  return "#ef4444";
}

export function scoreClass(score: number): string {
  if (score >= 76) return "text-green-400";
  if (score >= 51) return "text-yellow-400";
  return "text-red-400";
}

// ─── Badge Component Helper ──────────────────────────────────────────────────

export function statusBadgeClasses(
  status: string,
  colorMap: Record<string, { bg: string; text: string }>
): string {
  const colors = colorMap[status] || { bg: "bg-[#333]/30", text: "text-[#9ca3af]" };
  return `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`;
}
