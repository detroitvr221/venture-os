"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  ChevronRight,
  Filter,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Edit3,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProposalRow {
  id: string;
  title: string;
  status: string;
  amount: number | null;
  lead_id: string | null;
  client_id: string | null;
  sent_at: string | null;
  created_at: string;
}

interface LeadMap {
  [id: string]: string;
}

interface ClientMap {
  [id: string]: string;
}

type StatusFilter = "all" | "draft" | "sent" | "accepted" | "rejected";

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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<
  string,
  { text: string; bg: string; icon: typeof FileText }
> = {
  draft: { text: "#888", bg: "#88888815", icon: Edit3 },
  sent: { text: "#4FC3F7", bg: "#4FC3F715", icon: Send },
  accepted: { text: "#22c55e", bg: "#22c55e15", icon: CheckCircle2 },
  rejected: { text: "#ef4444", bg: "#ef444415", icon: XCircle },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [leadNames, setLeadNames] = useState<LeadMap>({});
  const [clientNames, setClientNames] = useState<ClientMap>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const fetchData = useCallback(async () => {
    const db = getClientDb();

    const { data: proposalsData } = await db
      .from("proposals")
      .select("id, title, status, amount, lead_id, client_id, sent_at, created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false });

    const rows = (proposalsData ?? []) as ProposalRow[];
    setProposals(rows);

    // Fetch lead names
    const leadIds = [
      ...new Set(rows.filter((p) => p.lead_id).map((p) => p.lead_id!)),
    ];
    if (leadIds.length > 0) {
      const { data: leadsData } = await db
        .from("leads")
        .select("id, contact_name")
        .in("id", leadIds);
      const map: LeadMap = {};
      for (const l of leadsData ?? []) {
        map[(l as { id: string }).id] = (l as { contact_name: string }).contact_name;
      }
      setLeadNames(map);
    }

    // Fetch client names
    const clientIds = [
      ...new Set(rows.filter((p) => p.client_id).map((p) => p.client_id!)),
    ];
    if (clientIds.length > 0) {
      const { data: clientsData } = await db
        .from("clients")
        .select("id, name")
        .in("id", clientIds);
      const map: ClientMap = {};
      for (const c of clientsData ?? []) {
        map[(c as { id: string }).id] = (c as { name: string }).name;
      }
      setClientNames(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered =
    filter === "all"
      ? proposals
      : proposals.filter((p) => p.status === filter);

  const stats = {
    total: proposals.length,
    draft: proposals.filter((p) => p.status === "draft").length,
    sent: proposals.filter((p) => p.status === "sent").length,
    accepted: proposals.filter((p) => p.status === "accepted").length,
    rejected: proposals.filter((p) => p.status === "rejected").length,
    totalValue: proposals
      .filter((p) => p.status !== "rejected")
      .reduce((s, p) => s + (p.amount ?? 0), 0),
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2"><div className="h-8 w-48 animate-pulse rounded-lg bg-[#1a1a1a]" /><div className="h-4 w-32 animate-pulse rounded-lg bg-[#1a1a1a]" /></div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 space-y-3"><div className="h-4 w-24 animate-pulse rounded bg-[#1a1a1a]" /><div className="h-8 w-16 animate-pulse rounded bg-[#1a1a1a]" /></div>)}</div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] divide-y divide-[#1a1a1a]">{[1,2,3].map((i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><div className="flex-1 space-y-2"><div className="h-4 w-40 animate-pulse rounded bg-[#1a1a1a]" /><div className="h-3 w-24 animate-pulse rounded bg-[#1a1a1a]" /></div><div className="h-6 w-16 animate-pulse rounded-full bg-[#1a1a1a]" /></div>)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proposals</h1>
          <p className="mt-1 text-sm text-[#888]">
            {stats.total} proposals &middot; Pipeline:{" "}
            <span className="text-[#22c55e]">
              ${stats.totalValue.toLocaleString()}
            </span>
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <FileText className="h-4 w-4" />
          New Proposal
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(
          [
            { label: "Draft", count: stats.draft, color: "#888" },
            { label: "Sent", count: stats.sent, color: "#4FC3F7" },
            { label: "Accepted", count: stats.accepted, color: "#22c55e" },
            { label: "Rejected", count: stats.rejected, color: "#ef4444" },
          ] as const
        ).map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4"
          >
            <p className="text-xs text-[#888]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: s.color }}>
              {s.count}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#666]" />
        {(["all", "draft", "sent", "accepted", "rejected"] as StatusFilter[]).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-[#999]"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Proposals Table */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <FileText className="mx-auto h-8 w-8 text-[#333]" />
              <p className="mt-3 text-sm text-[#666]">No proposals found</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Title
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Client / Lead
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Created
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = statusConfig[p.status] ?? statusConfig.draft;
                const Icon = sc.icon;
                const associatedName = p.client_id
                  ? clientNames[p.client_id]
                  : p.lead_id
                    ? leadNames[p.lead_id]
                    : null;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/proposals/${p.id}`}
                        className="text-sm font-medium text-white hover:text-[#4FC3F7] transition-colors"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {associatedName ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1 text-sm font-medium text-white">
                        {p.amount ? (
                          <>
                            <DollarSign className="h-3.5 w-3.5 text-[#22c55e]" />
                            {p.amount.toLocaleString()}
                          </>
                        ) : (
                          <span className="text-[#666]">-</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize"
                        style={{ color: sc.text, backgroundColor: sc.bg }}
                      >
                        <Icon className="h-3 w-3" />
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/proposals/${p.id}`}>
                        <ChevronRight className="h-4 w-4 text-[#666] hover:text-white transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
