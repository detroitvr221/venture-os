"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InlineReportPreviewProps {
  jobId: string;
  /** Auto-expand the report when it completes */
  autoExpand?: boolean;
  /** Show a compact status bar when collapsed */
  showStatusBar?: boolean;
}

type JobStatus = "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";

interface JobData {
  id: string;
  status: JobStatus;
  job_type: string;
  result_summary: string | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  report_id: string | null;
  target_url: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface ReportData {
  id: string;
  title: string;
  content_html: string | null;
  content_markdown: string | null;
  content_json: Record<string, unknown> | null;
  score: number | null;
  storage_path: string | null;
}

const STATUS_CONFIG: Record<
  JobStatus,
  { icon: typeof Clock; color: string; label: string; animate?: boolean }
> = {
  pending: { icon: Clock, color: "text-[#737373]", label: "Pending" },
  queued: { icon: Clock, color: "text-yellow-400", label: "Queued" },
  running: { icon: Loader2, color: "text-[#4FC3F7]", label: "Running", animate: true },
  completed: { icon: CheckCircle2, color: "text-green-400", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
  cancelled: { icon: XCircle, color: "text-[#737373]", label: "Cancelled" },
};

export function InlineReportPreview({
  jobId,
  autoExpand = true,
  showStatusBar = true,
}: InlineReportPreviewProps) {
  const [job, setJob] = useState<JobData | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch job + report data
  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      const { data: jobData } = await supabase
        .from("audit_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobData) {
        setJob(jobData);

        if (jobData.report_id) {
          const { data: reportData } = await supabase
            .from("reports")
            .select("*")
            .eq("id", jobData.report_id)
            .single();
          if (reportData) {
            setReport(reportData);
            if (autoExpand) setExpanded(true);
          }
        }
      }
      setLoading(false);
    }

    fetchData();

    // Subscribe to realtime updates on this job
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "audit_jobs", filter: `id=eq.${jobId}` },
        async (payload) => {
          const updated = payload.new as JobData;
          setJob(updated);

          // Fetch report when job completes
          if (updated.status === "completed" && updated.report_id) {
            const { data: reportData } = await supabase
              .from("reports")
              .select("*")
              .eq("id", updated.report_id)
              .single();
            if (reportData) {
              setReport(reportData);
              if (autoExpand) setExpanded(true);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, autoExpand]);

  if (loading) {
    return (
      <div className="mt-4 animate-pulse rounded-xl border border-[#1a1a1a] bg-[#111] p-6">
        <div className="h-4 w-48 rounded bg-[#1a1a1a]" />
        <div className="mt-3 h-3 w-full rounded bg-[#1a1a1a]" />
        <div className="mt-2 h-3 w-3/4 rounded bg-[#1a1a1a]" />
      </div>
    );
  }

  if (!job) return null;

  const statusCfg = STATUS_CONFIG[job.status];
  const StatusIcon = statusCfg.icon;
  const isActive = ["pending", "queued", "running"].includes(job.status);
  const elapsed = job.started_at
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : 0;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#111]">
      {/* Status bar */}
      {showStatusBar && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[#0d0d0d]"
        >
          <div className="flex items-center gap-3">
            <StatusIcon
              className={`h-4 w-4 ${statusCfg.color} ${statusCfg.animate ? "animate-spin" : ""}`}
            />
            <span className={`text-sm font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
            {isActive && elapsed > 0 && (
              <span className="text-xs text-[#737373]">{elapsed}s</span>
            )}
            {report?.score != null && (
              <span className="ml-2 flex items-center gap-1 rounded-full bg-[#0a0a0a] px-2.5 py-0.5 text-xs font-semibold">
                <BarChart3 className="h-3 w-3 text-[#4FC3F7]" />
                <span
                  className={
                    report.score >= 76
                      ? "text-green-400"
                      : report.score >= 51
                      ? "text-yellow-400"
                      : "text-red-400"
                  }
                >
                  {report.score}/100
                </span>
              </span>
            )}
            {job.result_summary && !expanded && (
              <span className="ml-2 max-w-md truncate text-xs text-[#9ca3af]">
                {job.result_summary}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <Link
                href={`/reports/${report.id}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded px-2 py-1 text-xs text-[#4FC3F7] hover:bg-[#4FC3F710]"
              >
                <ExternalLink className="inline h-3 w-3" /> Full Report
              </Link>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-[#737373]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#737373]" />
            )}
          </div>
        </button>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#1a1a1a] px-5 py-4">
          {/* Error state */}
          {job.status === "failed" && job.error_message && (
            <div className="flex items-start gap-3 rounded-lg bg-red-400/10 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Audit Failed</p>
                <p className="mt-1 text-xs text-[#9ca3af]">{job.error_message}</p>
              </div>
            </div>
          )}

          {/* Running state */}
          {isActive && (
            <div className="flex items-center gap-3 py-6 text-center">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#4FC3F7]" />
            </div>
          )}

          {/* Report content */}
          {report && (
            <>
              {/* Summary */}
              {job.result_summary && (
                <p className="mb-4 text-sm text-[#9ca3af]">{job.result_summary}</p>
              )}

              {/* HTML render */}
              {report.content_html ? (
                <div
                  className="prose prose-invert prose-sm max-h-[500px] overflow-y-auto rounded-lg bg-[#0a0a0a] p-4"
                  dangerouslySetInnerHTML={{ __html: report.content_html }}
                />
              ) : report.content_markdown ? (
                <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#0a0a0a] p-4 text-xs text-[#9ca3af]">
                  {report.content_markdown}
                </pre>
              ) : report.content_json ? (
                <pre className="max-h-[500px] overflow-y-auto rounded-lg bg-[#0a0a0a] p-4 text-xs text-[#9ca3af]">
                  {JSON.stringify(report.content_json, null, 2)}
                </pre>
              ) : null}

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/reports/${report.id}`}
                  className="flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-xs text-[#ccc] hover:bg-[#1a1a1a] hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View Full Report
                </Link>
                {report.storage_path && (
                  <button
                    onClick={async () => {
                      const supabase = createClient();
                      const { data } = await supabase.storage.from("workspace").createSignedUrl(report.storage_path!, 3600);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}
                    className="flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-xs text-[#ccc] hover:bg-[#1a1a1a] hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download HTML
                  </button>
                )}
                <a
                  href={`/api/reports/docx?id=${report.id}`}
                  download
                  className="flex items-center gap-2 rounded-lg border border-[#333] px-3 py-2 text-xs text-[#ccc] hover:bg-[#1a1a1a] hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Word
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
