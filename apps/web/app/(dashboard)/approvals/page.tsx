"use client";

import { useState } from "react";
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

type ApprovalStatus = "pending" | "approved" | "rejected";
type ApprovalType = "financial" | "agent" | "company" | "contract" | "deployment";

interface Approval {
  id: string;
  type: ApprovalType;
  description: string;
  detail: string;
  requestedBy: string;
  createdAt: string;
  status: ApprovalStatus;
  priority: "low" | "medium" | "high" | "critical";
  amount?: string;
}

const approvals: Approval[] = [
  {
    id: "APR-001",
    type: "company",
    description: "Create new sub-company: AeroVista Labs",
    detail: "AI-powered drone analytics platform. Initial budget: $50,000. Target market: Agriculture & Surveying.",
    requestedBy: "Venture Builder Agent",
    createdAt: "2 hours ago",
    status: "pending",
    priority: "high",
    amount: "$50,000",
  },
  {
    id: "APR-002",
    type: "financial",
    description: "Monthly infrastructure upgrade",
    detail: "Upgrade GPU cluster from 4x A100 to 8x A100 for increased model inference throughput.",
    requestedBy: "Ops Agent",
    createdAt: "4 hours ago",
    status: "pending",
    priority: "critical",
    amount: "$12,400/mo",
  },
  {
    id: "APR-003",
    type: "contract",
    description: "New client contract: Vertex Solutions",
    detail: "12-month AI integration retainer. Scope includes custom model training and API development.",
    requestedBy: "Sales Agent",
    createdAt: "6 hours ago",
    status: "pending",
    priority: "high",
    amount: "$150,000",
  },
  {
    id: "APR-004",
    type: "agent",
    description: "Deploy new Marketing Agent",
    detail: "Claude Sonnet-based agent for social media management and content creation across all ventures.",
    requestedBy: "CEO Agent",
    createdAt: "1 day ago",
    status: "pending",
    priority: "medium",
    amount: "$320/mo",
  },
  {
    id: "APR-005",
    type: "deployment",
    description: "Production deployment: CloudSync v2.1",
    detail: "Major release with new real-time sync engine. Includes database migration and zero-downtime deploy.",
    requestedBy: "Developer Agent",
    createdAt: "1 day ago",
    status: "pending",
    priority: "high",
  },
  {
    id: "APR-006",
    type: "financial",
    description: "Quarterly marketing budget allocation",
    detail: "Q2 2026 marketing spend across Google Ads, LinkedIn, and content marketing channels.",
    requestedBy: "Finance Agent",
    createdAt: "2 days ago",
    status: "approved",
    priority: "medium",
    amount: "$28,000",
  },
  {
    id: "APR-007",
    type: "agent",
    description: "Increase Sales Agent API limits",
    detail: "Raise daily API call limit from 5,000 to 15,000 to handle increased lead volume.",
    requestedBy: "Sales Agent",
    createdAt: "3 days ago",
    status: "approved",
    priority: "low",
    amount: "$180/mo",
  },
  {
    id: "APR-008",
    type: "contract",
    description: "Terminate contract: OldTech Corp",
    detail: "Client requested early termination. 30-day notice period applies. Final invoice pending.",
    requestedBy: "Finance Agent",
    createdAt: "4 days ago",
    status: "rejected",
    priority: "medium",
  },
];

const typeIcons: Record<ApprovalType, typeof FileText> = {
  financial: CreditCard,
  agent: Bot,
  company: Building2,
  contract: FileText,
  deployment: AlertTriangle,
};

const typeColors: Record<ApprovalType, string> = {
  financial: "#22c55e",
  agent: "#8b5cf6",
  company: "#3b82f6",
  contract: "#eab308",
  deployment: "#f97316",
};

const priorityColors: Record<string, string> = {
  low: "#666",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

export default function ApprovalsPage() {
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");

  const filtered =
    filter === "all"
      ? approvals
      : approvals.filter((a) => a.status === filter);

  const pendingCount = approvals.filter((a) => a.status === "pending").length;

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
      <div className="overflow-hidden rounded-xl border border-[#222] bg-[#0a0a0a]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#222]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Description
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Requested By
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Priority
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Created
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-medium text-[#888]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((approval) => {
                const TypeIcon = typeIcons[approval.type];
                return (
                  <tr
                    key={approval.id}
                    className="border-b border-[#1a1a1a] transition-colors hover:bg-[#111]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="rounded-md p-1.5"
                          style={{
                            backgroundColor: `${typeColors[approval.type]}15`,
                          }}
                        >
                          <TypeIcon
                            className="h-4 w-4"
                            style={{ color: typeColors[approval.type] }}
                          />
                        </div>
                        <span className="text-xs font-medium capitalize text-[#888]">
                          {approval.type}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[300px] px-5 py-4">
                      <p className="text-sm font-medium text-white">
                        {approval.description}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#666]">
                        {approval.detail}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-[#888]">
                        {approval.requestedBy}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-white">
                        {approval.amount || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize"
                        style={{
                          color: priorityColors[approval.priority],
                          backgroundColor: `${priorityColors[approval.priority]}15`,
                        }}
                      >
                        {approval.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-[#888]">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">{approval.createdAt}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {approval.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eab30815] px-2.5 py-1 text-[10px] font-semibold text-[#eab308]">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      ) : approval.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e15] px-2.5 py-1 text-[10px] font-semibold text-[#22c55e]">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#ef444415] px-2.5 py-1 text-[10px] font-semibold text-[#ef4444]">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {approval.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80">
                            Approve
                          </button>
                          <button className="rounded-lg border border-[#333] bg-transparent px-3 py-1.5 text-xs font-medium text-[#888] transition-colors hover:border-[#ef4444] hover:text-[#ef4444]">
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
    </div>
  );
}
