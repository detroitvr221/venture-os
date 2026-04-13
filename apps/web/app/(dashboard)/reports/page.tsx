"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  ChevronRight,
  Clock,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportRow {
  id: string;
  title: string;
  report_type: string;
  score: number | null;
  target_url: string | null;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(score: number | null): string {
  if (score === null) return "#9ca3af";
  if (score >= 76) return "#22c55e";
  if (score >= 51) return "#eab308";
  return "#ef4444";
}

function scoreBg(score: number | null): string {
  if (score === null) return "#9ca3af15";
  if (score >= 76) return "#22c55e15";
  if (score >= 51) return "#eab30815";
  return "#ef444415";
}

function reportTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const reportTypeColors: Record<string, { text: string; bg: string }> = {
  seo_audit: { text: "#4FC3F7", bg: "#4FC3F715" },
  site_audit: { text: "#22c55e", bg: "#22c55e15" },
  intake_analysis: { text: "#F5C542", bg: "#F5C54215" },
  branding_audit: { text: "#a78bfa", bg: "#a78bfa15" },
  competitor_research: { text: "#f97316", bg: "#f9731615" },
  proposal_generation: { text: "#ec4899", bg: "#ec489915" },
  lead_enrichment: { text: "#14b8a6", bg: "#14b8a615" },
  email_summary: { text: "#eab308", bg: "#eab30815" },
  document_analysis: { text: "#6366f1", bg: "#6366f115" },
  custom: { text: "#9ca3af", bg: "#9ca3af15" },
};

const ALL_REPORT_TYPES = [
  "seo_audit",
  "site_audit",
  "intake_analysis",
  "branding_audit",
  "competitor_research",
  "proposal_generation",
  "lead_enrichment",
  "email_summary",
  "document_analysis",
  "custom",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Resolve org ID from the authenticated user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            setOrgId(
              data?.organization_id ??
                "00000000-0000-0000-0000-000000000001"
            );
          });
      } else {
        setOrgId("00000000-0000-0000-0000-000000000001");
      }
    });
  }, []);

  const fetchReports = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();

    let query = supabase
      .from("reports")
      .select("id, title, report_type, score, target_url, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (typeFilter !== "all") {
      query = query.eq("report_type", typeFilter);
    }

    const { data } = await query;
    setReports((data ?? []) as ReportRow[]);
    setLoading(false);
  }, [orgId, typeFilter]);

  useEffect(() => {
    if (orgId) {
      setLoading(true);
      fetchReports();
    }
  }, [orgId, fetchReports]);

  // Filter by search
  const filtered = reports.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const avgScore =
    reports.filter((r) => r.score !== null).length > 0
      ? Math.round(
          reports
            .filter((r) => r.score !== null)
            .reduce((sum, r) => sum + (r.score ?? 0), 0) /
            reports.filter((r) => r.score !== null).length
        )
      : null;

  // Discover unique types from the data for filter
  const typesInData = [...new Set(reports.map((r) => r.report_type))];

  // ─── Loading Skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 animate-pulse rounded bg-[#1a1a1a]" />
            <div className="h-4 w-56 animate-pulse rounded bg-[#1a1a1a]" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-[#1a1a1a]" />
              <div className="mt-2 h-7 w-12 animate-pulse rounded bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] divide-y divide-[#1a1a1a]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-4 w-4 animate-pulse rounded bg-[#1a1a1a]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-[#1a1a1a]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[#1a1a1a]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#1a1a1a]" />
              <div className="h-4 w-20 animate-pulse rounded bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {reports.length} report{reports.length !== 1 ? "s" : ""}
            {avgScore !== null && (
              <>
                {" "}
                &middot; Avg score:{" "}
                <span style={{ color: scoreColor(avgScore) }}>{avgScore}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ca3af]">Total Reports</p>
            <FileText className="h-4 w-4 text-[#4FC3F7]" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {reports.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ca3af]">Average Score</p>
            <BarChart3 className="h-4 w-4 text-[#F5C542]" />
          </div>
          <p
            className="mt-1 text-2xl font-bold"
            style={{ color: scoreColor(avgScore) }}
          >
            {avgScore ?? "--"}
          </p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ca3af]">Report Types</p>
            <Filter className="h-4 w-4 text-[#22c55e]" />
          </div>
          <p className="mt-1 text-2xl font-bold text-white">
            {typesInData.length}
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by title..."
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder-[#555] focus:border-[#4FC3F7] focus:outline-none"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#555]" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
          >
            <option value="all">All Types</option>
            {ALL_REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {reportTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-10 w-10 text-[#333]" />
            <p className="mt-3 text-sm text-[#9ca3af]">
              {search || typeFilter !== "all"
                ? "No reports match your filters"
                : "No reports yet. Reports will appear here as jobs complete."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                  Report
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                  Score
                </th>
                <th className="hidden px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af] md:table-cell">
                  Target
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                  Date
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => {
                const typeColor =
                  reportTypeColors[report.report_type] ??
                  reportTypeColors.custom;
                return (
                  <tr
                    key={report.id}
                    className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111] cursor-pointer"
                    onClick={() => {
                      window.location.href = `/reports/${report.id}`;
                    }}
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/reports/${report.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-white hover:text-[#4FC3F7] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="h-4 w-4 text-[#555] shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">
                          {report.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                        style={{
                          color: typeColor.text,
                          backgroundColor: typeColor.bg,
                        }}
                      >
                        {reportTypeLabel(report.report_type)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {report.score !== null ? (
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold"
                          style={{
                            color: scoreColor(report.score),
                            backgroundColor: scoreBg(report.score),
                          }}
                        >
                          {report.score}
                        </span>
                      ) : (
                        <span className="text-sm text-[#555]">--</span>
                      )}
                    </td>
                    <td className="hidden px-5 py-4 md:table-cell">
                      {report.target_url ? (
                        <a
                          href={report.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#4FC3F7] transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {report.target_url.replace(/^https?:\/\//, "")}
                          </span>
                        </a>
                      ) : (
                        <span className="text-sm text-[#555]">--</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(report.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/reports/${report.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="h-4 w-4 text-[#555] hover:text-white transition-colors" />
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
