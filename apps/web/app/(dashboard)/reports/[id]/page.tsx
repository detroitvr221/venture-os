"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Report {
  id: string;
  organization_id: string;
  user_id: string | null;
  job_id: string | null;
  title: string;
  report_type: string;
  content_html: string | null;
  content_markdown: string | null;
  content_json: Record<string, unknown> | null;
  score: number | null;
  target_url: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

interface LinkedJob {
  id: string;
  status: string;
  job_type: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

const jobStatusConfig: Record<string, { text: string; bg: string; label: string }> = {
  pending: { text: "#9ca3af", bg: "#9ca3af15", label: "Pending" },
  queued: { text: "#F5C542", bg: "#F5C54215", label: "Queued" },
  running: { text: "#4FC3F7", bg: "#4FC3F715", label: "Running" },
  completed: { text: "#22c55e", bg: "#22c55e15", label: "Completed" },
  failed: { text: "#ef4444", bg: "#ef444415", label: "Failed" },
  cancelled: { text: "#9ca3af", bg: "#9ca3af15", label: "Cancelled" },
};

// ─── JSON Viewer ────────────────────────────────────────────────────────────

function JsonNode({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-[#9ca3af] italic">null</span>;
  }

  if (typeof data === "boolean") {
    return (
      <span className={data ? "text-[#22c55e]" : "text-[#ef4444]"}>
        {String(data)}
      </span>
    );
  }

  if (typeof data === "number") {
    return <span className="text-[#F5C542]">{data}</span>;
  }

  if (typeof data === "string") {
    if (data.length > 200) {
      return (
        <span className="text-[#22c55e]">
          &quot;{data.slice(0, 200)}...&quot;
        </span>
      );
    }
    return <span className="text-[#22c55e]">&quot;{data}&quot;</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-[#9ca3af]">[]</span>;
    return (
      <div className="ml-4">
        <span className="text-[#9ca3af]">[</span>
        {data.map((item, i) => (
          <div key={i} className="ml-4">
            <JsonNode data={item} depth={depth + 1} />
            {i < data.length - 1 && <span className="text-[#9ca3af]">,</span>}
          </div>
        ))}
        <span className="text-[#9ca3af]">]</span>
      </div>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-[#9ca3af]">{"{}"}</span>;
    }
    return (
      <div className={depth > 0 ? "ml-4" : ""}>
        <span className="text-[#9ca3af]">{"{"}</span>
        {entries.map(([key, value], i) => (
          <div key={key} className="ml-4">
            <span className="text-[#4FC3F7]">&quot;{key}&quot;</span>
            <span className="text-[#9ca3af]">: </span>
            <JsonNode data={value} depth={depth + 1} />
            {i < entries.length - 1 && (
              <span className="text-[#9ca3af]">,</span>
            )}
          </div>
        ))}
        <span className="text-[#9ca3af]">{"}"}</span>
      </div>
    );
  }

  return <span className="text-[#9ca3af]">{String(data)}</span>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [linkedJob, setLinkedJob] = useState<LinkedJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchReport = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setReport(data as Report);

    // Fetch linked job if exists
    if (data.job_id) {
      const { data: jobData } = await supabase
        .from("audit_jobs")
        .select("id, status, job_type")
        .eq("id", data.job_id)
        .single();
      if (jobData) {
        setLinkedJob(jobData as LinkedJob);
      }
    }

    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownload = async () => {
    if (!report?.storage_path) {
      toast.error("No file available for download");
      return;
    }

    setDownloading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("reports")
        .createSignedUrl(report.storage_path, 3600);

      if (error || !data?.signedUrl) {
        toast.error("Failed to generate download link");
        setDownloading(false);
        return;
      }

      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
          <div className="h-4 w-4 animate-pulse rounded bg-[#1a1a1a]" />
          <div className="h-4 w-20 animate-pulse rounded bg-[#1a1a1a]" />
        </div>
        <div className="space-y-4">
          <div className="h-8 w-72 animate-pulse rounded bg-[#1a1a1a]" />
          <div className="h-4 w-48 animate-pulse rounded bg-[#1a1a1a]" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-[#1a1a1a]" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#1a1a1a]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#1a1a1a]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#1a1a1a]" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Not Found ────────────────────────────────────────────────────────────

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileText className="h-12 w-12 text-[#333]" />
        <p className="text-[#9ca3af]">Report not found</p>
        <Link
          href="/reports"
          className="text-[#4FC3F7] hover:underline text-sm"
        >
          Back to Reports
        </Link>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const typeColor = reportTypeColors[report.report_type] ?? reportTypeColors.custom;

  return (
    <div className="space-y-6">
      {/* Back / Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
        <button
          onClick={() => router.push("/reports")}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Reports
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-6 w-6 text-[#4FC3F7] shrink-0" />
            <h1 className="text-2xl font-bold text-white">{report.title}</h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#9ca3af]">
            {/* Report type badge */}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ color: typeColor.text, backgroundColor: typeColor.bg }}
            >
              {reportTypeLabel(report.report_type)}
            </span>
            {/* Date */}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(report.created_at)}
            </span>
            {/* Target URL */}
            {report.target_url && (
              <a
                href={report.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#4FC3F7] hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {report.target_url}
              </a>
            )}
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/reports/docx?id=${reportId}`}
            download
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Download Word
          </a>
          {report.storage_path && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#ccc] hover:bg-[#1a1a1a] hover:text-white disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {downloading ? "..." : "HTML"}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Score */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <p className="text-xs text-[#9ca3af]">Score</p>
          {report.score !== null ? (
            <p
              className="mt-1 text-3xl font-bold"
              style={{ color: scoreColor(report.score) }}
            >
              {report.score}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-bold text-[#555]">--</p>
          )}
        </div>

        {/* Report Type */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <p className="text-xs text-[#9ca3af]">Type</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {reportTypeLabel(report.report_type)}
          </p>
        </div>

        {/* Score Rating */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <p className="text-xs text-[#9ca3af]">Rating</p>
          {report.score !== null ? (
            <span
              className="mt-1 inline-block rounded-full px-3 py-1 text-sm font-bold"
              style={{
                color: scoreColor(report.score),
                backgroundColor: scoreBg(report.score),
              }}
            >
              {report.score >= 76
                ? "Good"
                : report.score >= 51
                ? "Needs Work"
                : "Poor"}
            </span>
          ) : (
            <p className="mt-1 text-lg font-semibold text-[#555]">N/A</p>
          )}
        </div>

        {/* Linked Job */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <p className="text-xs text-[#9ca3af]">Job Status</p>
          {linkedJob ? (
            <Link
              href="/jobs"
              className="mt-1 inline-flex items-center gap-1.5"
            >
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{
                  color:
                    jobStatusConfig[linkedJob.status]?.text ?? "#9ca3af",
                  backgroundColor:
                    jobStatusConfig[linkedJob.status]?.bg ?? "#9ca3af15",
                }}
              >
                {linkedJob.status === "completed" && (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {linkedJob.status === "running" && (
                  <Clock className="h-3 w-3 animate-spin" />
                )}
                {jobStatusConfig[linkedJob.status]?.label ?? linkedJob.status}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-lg font-semibold text-[#555]">--</p>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {/* Content: HTML */}
        {report.content_html ? (
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[#9ca3af]">
              <BarChart3 className="h-4 w-4" />
              Report Content
            </h3>
            {/*
              Note: content_html is generated server-side by our agents.
              In production, consider running this through DOMPurify or a
              similar sanitizer before rendering.
            */}
            <div
              className="prose prose-invert max-w-none text-sm leading-relaxed text-[#ccc]
                         prose-headings:text-white prose-headings:font-semibold
                         prose-a:text-[#4FC3F7] prose-strong:text-white
                         prose-code:text-[#F5C542] prose-code:bg-[#111] prose-code:rounded prose-code:px-1.5 prose-code:py-0.5
                         prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222] prose-pre:rounded-lg
                         prose-table:border-collapse prose-td:border prose-td:border-[#222] prose-td:px-3 prose-td:py-2
                         prose-th:border prose-th:border-[#222] prose-th:px-3 prose-th:py-2 prose-th:bg-[#111]
                         prose-ul:text-[#ccc] prose-ol:text-[#ccc] prose-li:text-[#ccc]"
              dangerouslySetInnerHTML={{ __html: report.content_html }}
            />
          </div>
        ) : report.content_markdown ? (
          /* Content: Markdown (rendered as formatted preformatted text) */
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[#9ca3af]">
              <BarChart3 className="h-4 w-4" />
              Report Content
            </h3>
            <div className="rounded-lg bg-[#111] border border-[#222] p-5">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-[#ccc] font-sans">
                {report.content_markdown}
              </pre>
            </div>
          </div>
        ) : report.content_json ? (
          /* Content: JSON viewer */
          <div className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[#9ca3af]">
              <BarChart3 className="h-4 w-4" />
              Report Data
            </h3>
            <div className="rounded-lg bg-[#111] border border-[#222] p-5 overflow-x-auto">
              <pre className="text-xs leading-relaxed font-mono">
                <JsonNode data={report.content_json} />
              </pre>
            </div>
          </div>
        ) : (
          /* No content */
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-10 w-10 text-[#333]" />
            <p className="mt-3 text-sm text-[#9ca3af]">
              No content available for this report.
            </p>
            {report.storage_path && (
              <button
                onClick={handleDownload}
                className="mt-4 flex items-center gap-2 text-sm text-[#4FC3F7] hover:underline"
              >
                <Download className="h-4 w-4" />
                Download the report file instead
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
