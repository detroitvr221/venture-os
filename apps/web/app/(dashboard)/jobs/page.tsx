"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Filter,
  Search,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Play,
  Ban,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

type JobStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

type JobType =
  | "seo_audit"
  | "site_audit"
  | "intake_analysis"
  | "branding_audit"
  | "competitor_research"
  | "proposal_generation"
  | "lead_enrichment"
  | "email_summary"
  | "document_analysis"
  | "custom";

interface JobRow {
  id: string;
  organization_id: string;
  job_type: JobType;
  status: JobStatus;
  input_payload: Record<string, unknown>;
  target_url: string | null;
  report_id: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start) return "--";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.round((e - s) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function jobTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const statusConfig: Record<
  JobStatus,
  {
    text: string;
    bg: string;
    icon: typeof Clock;
    label: string;
    animation?: string;
    strikethrough?: boolean;
  }
> = {
  pending: {
    text: "#9ca3af",
    bg: "#9ca3af15",
    icon: Clock,
    label: "Pending",
  },
  queued: {
    text: "#F5C542",
    bg: "#F5C54215",
    icon: Loader2,
    label: "Queued",
  },
  running: {
    text: "#4FC3F7",
    bg: "#4FC3F715",
    icon: Loader2,
    label: "Running",
    animation: "animate-spin",
  },
  completed: {
    text: "#22c55e",
    bg: "#22c55e15",
    icon: CheckCircle2,
    label: "Completed",
  },
  failed: {
    text: "#ef4444",
    bg: "#ef444415",
    icon: XCircle,
    label: "Failed",
  },
  cancelled: {
    text: "#9ca3af",
    bg: "#9ca3af15",
    icon: Ban,
    label: "Cancelled",
    strikethrough: true,
  },
};

const jobTypeColors: Record<string, { text: string; bg: string }> = {
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

const ALL_STATUSES: JobStatus[] = [
  "pending",
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
];

const ALL_JOB_TYPES: JobType[] = [
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

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | JobType>("all");
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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

  const fetchJobs = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();

    let query = supabase
      .from("audit_jobs")
      .select(
        "id, organization_id, job_type, status, input_payload, target_url, report_id, error_message, created_at, started_at, completed_at"
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter !== "all") {
      query = query.eq("job_type", typeFilter);
    }

    const { data } = await query;
    setJobs((data ?? []) as JobRow[]);
    setLoading(false);
  }, [orgId, statusFilter, typeFilter]);

  // Initial load and refetch on filter changes
  useEffect(() => {
    if (orgId) {
      setLoading(true);
      fetchJobs();
    }
  }, [orgId, fetchJobs]);

  // ─── Realtime Subscription ────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("audit_jobs_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audit_jobs",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newJob = payload.new as JobRow;
            setJobs((prev) => [newJob, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedJob = payload.new as JobRow;
            setJobs((prev) =>
              prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setJobs((prev) => prev.filter((j) => j.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleRetry = async (job: JobRow) => {
    setRetryingId(job.id);
    try {
      const response = await fetch("/api/jobs/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobType: job.job_type,
          orgId: job.organization_id,
          inputPayload: job.input_payload,
          targetUrl: job.target_url,
        }),
      });

      if (response.ok) {
        toast.success("Job re-queued successfully");
        fetchJobs();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to retry job");
      }
    } catch {
      toast.error("Failed to retry job");
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    setCancellingId(jobId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("audit_jobs")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) {
        toast.error("Failed to cancel job");
      } else {
        toast.success("Job cancelled");
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "cancelled" as JobStatus,
                  completed_at: new Date().toISOString(),
                }
              : j
          )
        );
      }
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setCancellingId(null);
    }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = search
    ? jobs.filter(
        (j) =>
          j.target_url?.toLowerCase().includes(search.toLowerCase()) ||
          j.job_type.toLowerCase().includes(search.toLowerCase()) ||
          j.error_message?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  // Stats
  const stats = {
    total: jobs.length,
    running: jobs.filter((j) => j.status === "running" || j.status === "queued")
      .length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  // ─── Loading Skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-36 animate-pulse rounded bg-[#1a1a1a]" />
            <div className="h-4 w-52 animate-pulse rounded bg-[#1a1a1a]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-[#1a1a1a]" />
              <div className="mt-2 h-7 w-12 animate-pulse rounded bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] divide-y divide-[#1a1a1a]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-6 w-20 animate-pulse rounded-full bg-[#1a1a1a]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-[#1a1a1a]" />
                <div className="h-3 w-28 animate-pulse rounded bg-[#1a1a1a]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#1a1a1a]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[#1a1a1a]" />
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
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {stats.total} total &middot; {stats.running} active &middot;{" "}
            {stats.completed} completed &middot; {stats.failed} failed
          </p>
        </div>
        <button
          onClick={() => fetchJobs()}
          className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#ccc] hover:bg-[#1a1a1a] hover:text-white transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Jobs",
            value: stats.total,
            icon: Zap,
            color: "#4FC3F7",
          },
          {
            label: "Active",
            value: stats.running,
            icon: Play,
            color: "#F5C542",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "#22c55e",
          },
          {
            label: "Failed",
            value: stats.failed,
            icon: XCircle,
            color: "#ef4444",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#9ca3af]">{s.label}</p>
                <Icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs by URL, type, or error..."
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder-[#555] focus:border-[#4FC3F7] focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#555]" />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | JobStatus)
            }
            className="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusConfig[s].label}
              </option>
            ))}
          </select>
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "all" | JobType)
          }
          className="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
        >
          <option value="all">All Types</option>
          {ALL_JOB_TYPES.map((t) => (
            <option key={t} value={t}>
              {jobTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...ALL_STATUSES] as const).map((s) => {
          const isActive = statusFilter === s;
          const cfg = s !== "all" ? statusConfig[s] : null;
          return (
            <button
              key={s}
              onClick={() =>
                setStatusFilter(s as "all" | JobStatus)
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#1a1a1a] text-white"
                  : "text-[#666] hover:text-[#999]"
              }`}
            >
              {s === "all" ? (
                "All"
              ) : (
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: cfg?.text }}
                  />
                  {cfg?.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Jobs Table */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Zap className="h-10 w-10 text-[#333]" />
            <p className="mt-3 text-sm text-[#9ca3af]">
              {search || statusFilter !== "all" || typeFilter !== "all"
                ? "No jobs match your filters"
                : "No jobs yet. Jobs will appear here when audits or analyses are triggered."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                    Type
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                    Target
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af] md:table-cell">
                    Created
                  </th>
                  <th className="hidden px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af] lg:table-cell">
                    Duration
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-[#9ca3af]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => {
                  const sc = statusConfig[job.status] ?? statusConfig.pending;
                  const StatusIcon = sc.icon;
                  const jtColor =
                    jobTypeColors[job.job_type] ?? jobTypeColors.custom;

                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                    >
                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            sc.strikethrough ? "line-through" : ""
                          }`}
                          style={{
                            color: sc.text,
                            backgroundColor: sc.bg,
                          }}
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${sc.animation ?? ""}`}
                          />
                          {sc.label}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                          style={{
                            color: jtColor.text,
                            backgroundColor: jtColor.bg,
                          }}
                        >
                          {jobTypeLabel(job.job_type)}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="px-5 py-4">
                        {job.target_url ? (
                          <a
                            href={job.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#4FC3F7] transition-colors"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {job.target_url.replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                        ) : (
                          <span className="text-xs text-[#555]">--</span>
                        )}
                        {/* Show error message for failed jobs */}
                        {job.status === "failed" && job.error_message && (
                          <div className="mt-1 flex items-start gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-[#ef4444] mt-0.5" />
                            <span className="text-[10px] text-[#ef4444] leading-tight truncate max-w-[250px]">
                              {job.error_message}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Created */}
                      <td className="hidden px-5 py-4 md:table-cell">
                        <span className="text-xs text-[#9ca3af]">
                          {formatDate(job.created_at)}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="hidden px-5 py-4 lg:table-cell">
                        <span className="text-xs text-[#9ca3af]">
                          {formatDuration(job.started_at, job.completed_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* View report (completed only) */}
                          {job.status === "completed" && job.report_id && (
                            <Link
                              href={`/reports/${job.report_id}`}
                              className="flex items-center gap-1 rounded-lg border border-[#333] px-2.5 py-1.5 text-[10px] font-medium text-[#22c55e] hover:bg-[#22c55e10] transition-colors"
                            >
                              <ChevronRight className="h-3 w-3" />
                              Report
                            </Link>
                          )}

                          {/* Retry (failed only) */}
                          {job.status === "failed" && (
                            <button
                              onClick={() => handleRetry(job)}
                              disabled={retryingId === job.id}
                              className="flex items-center gap-1 rounded-lg border border-[#333] px-2.5 py-1.5 text-[10px] font-medium text-[#F5C542] hover:bg-[#F5C54210] transition-colors disabled:opacity-50"
                            >
                              <RotateCcw
                                className={`h-3 w-3 ${
                                  retryingId === job.id ? "animate-spin" : ""
                                }`}
                              />
                              Retry
                            </button>
                          )}

                          {/* Cancel (pending/queued/running) */}
                          {(job.status === "pending" ||
                            job.status === "queued" ||
                            job.status === "running") && (
                            <button
                              onClick={() => handleCancel(job.id)}
                              disabled={cancellingId === job.id}
                              className="flex items-center gap-1 rounded-lg border border-[#333] px-2.5 py-1.5 text-[10px] font-medium text-[#ef4444] hover:bg-[#ef444410] transition-colors disabled:opacity-50"
                            >
                              <Ban
                                className={`h-3 w-3 ${
                                  cancellingId === job.id
                                    ? "animate-pulse"
                                    : ""
                                }`}
                              />
                              Cancel
                            </button>
                          )}

                          {/* Completed without report */}
                          {job.status === "completed" && !job.report_id && (
                            <span className="text-[10px] text-[#555] italic">
                              No report
                            </span>
                          )}

                          {/* Cancelled indicator */}
                          {job.status === "cancelled" && (
                            <span className="text-[10px] text-[#555] italic">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-[#555]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
        </span>
        Live updates enabled via Supabase Realtime
      </div>
    </div>
  );
}
