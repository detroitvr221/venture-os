"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { TableSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import CallModal from "@/components/CallModal";

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
}

type DirectionFilter = "all" | "inbound" | "outbound";
type StatusFilter = "all" | "initiating" | "ringing" | "in-progress" | "completed" | "failed";

const PER_PAGE = 25;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getContactName(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "Unknown";
  return (metadata.contact_name as string) || (metadata.name as string) || "Unknown";
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

export default function CallsPage() {
  const router = useRouter();
  const { companyId } = useCompany();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCallModal, setShowCallModal] = useState(false);

  // ── Resolve org_id ──────────────────────────────────────────────────────

  useEffect(() => {
    async function resolveOrg() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership) {
        setOrgId(membership.organization_id);
      }
    }
    resolveOrg();
  }, []);

  // ── Fetch call logs ─────────────────────────────────────────────────────

  const fetchCalls = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const supabase = createClient();
    let query = supabase
      .from("call_logs")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (companyId) query = query.eq("company_id", companyId);

    if (directionFilter !== "all") {
      query = query.eq("direction", directionFilter);
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const from = (page - 1) * PER_PAGE;
    query = query.range(from, from + PER_PAGE - 1);

    const { data, count } = await query;

    if (data) {
      // Client-side search on contact name in metadata
      let filtered = data as CallLog[];
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter((c) => {
          const name = getContactName(c.metadata).toLowerCase();
          const phone = (c.phone_number || "").toLowerCase();
          return name.includes(q) || phone.includes(q);
        });
      }
      setCalls(filtered);
    }
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [orgId, companyId, directionFilter, statusFilter, page, search]);

  useEffect(() => {
    if (orgId) fetchCalls();
  }, [orgId, fetchCalls]);

  // ── Realtime subscription ───────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("call_logs_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_logs",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          fetchCalls();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchCalls]);

  // ── Stats ───────────────────────────────────────────────────────────────

  const stats = {
    total: totalCount,
    avgDuration: calls.length
      ? Math.round(
          calls.reduce((sum, c) => sum + (c.duration ?? 0), 0) / calls.length,
        )
      : 0,
    outbound: calls.filter((c) => c.direction === "outbound").length,
    inbound: calls.filter((c) => c.direction === "inbound").length,
  };

  const totalPages = Math.ceil(totalCount / PER_PAGE);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calls</h1>
          <p className="mt-1 text-sm text-[#888]">
            AI-powered calling with Vapi
          </p>
        </div>
        <button
          onClick={() => setShowCallModal(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Call
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Calls",
            value: stats.total,
            icon: Phone,
            color: "#4FC3F7",
          },
          {
            label: "Avg Duration",
            value: formatDuration(stats.avgDuration),
            icon: Clock,
            color: "#F5C542",
          },
          {
            label: "Outbound",
            value: stats.outbound,
            icon: PhoneOutgoing,
            color: "#4FC3F7",
          },
          {
            label: "Inbound",
            value: stats.inbound,
            icon: PhoneIncoming,
            color: "#22c55e",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#888]">{s.label}</p>
                <Icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Direction filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#666]" />
          {(["all", "inbound", "outbound"] as DirectionFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => {
                setDirectionFilter(f);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                directionFilter === f
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-[#999]"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="rounded-lg border border-[#333] bg-[#111] px-3 py-1.5 text-xs text-white focus:border-[#4FC3F7] focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="initiating">Initiating</option>
          <option value="ringing">Ringing</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or phone..."
            className="w-64 rounded-lg border border-[#333] bg-[#111] py-1.5 pl-9 pr-3 text-xs text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : calls.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description="Place your first AI-powered call to get started."
          actionLabel="New Call"
          onAction={() => setShowCallModal(true)}
        />
      ) : (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Date
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Contact
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Phone
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Direction
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Duration
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Transcript
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((call) => {
                const sc = statusConfig[call.status] ?? statusConfig.completed;
                const name = getContactName(call.metadata);
                return (
                  <tr
                    key={call.id}
                    onClick={() => router.push(`/calls/${call.id}`)}
                    className="cursor-pointer border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                  >
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {formatDate(call.created_at)}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-white">
                      {name}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {call.phone_number}
                    </td>
                    <td className="px-5 py-4">
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
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888] font-mono">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${sc.pulse ? "animate-pulse" : ""}`}
                        style={{
                          color: sc.text,
                          backgroundColor: sc.bg,
                        }}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#666] max-w-[200px] truncate">
                      {call.transcript
                        ? call.transcript.slice(0, 100) +
                          (call.transcript.length > 100 ? "..." : "")
                        : "--"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Call Modal */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
      />
    </div>
  );
}
