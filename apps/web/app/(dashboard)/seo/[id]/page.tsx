"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Globe,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  Download,
  ExternalLink,
} from "lucide-react";
import { runSeoAudit } from "../../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditDetail {
  id: string;
  website_id: string;
  audit_type: string;
  score: number | null;
  summary: string | null;
  findings_count: number;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface FindingRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string | null;
  page_url: string | null;
}

interface WebsiteInfo {
  url: string;
  name: string;
}

type Severity = "critical" | "warning" | "info" | "pass";

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
    hour: "numeric",
    minute: "2-digit",
  });
}

const severityConfig: Record<
  Severity,
  { color: string; bg: string; icon: typeof AlertCircle; label: string }
> = {
  critical: {
    color: "#ef4444",
    bg: "#ef444415",
    icon: AlertCircle,
    label: "Critical",
  },
  warning: {
    color: "#eab308",
    bg: "#eab30815",
    icon: AlertTriangle,
    label: "Warning",
  },
  info: { color: "#4FC3F7", bg: "#4FC3F715", icon: Info, label: "Info" },
  pass: {
    color: "#22c55e",
    bg: "#22c55e15",
    icon: CheckCircle2,
    label: "Pass",
  },
};

const severityOrder: Severity[] = ["critical", "warning", "info", "pass"];

function scoreColor(score: number | null): string {
  if (score === null) return "#888";
  if (score >= 76) return "#22c55e";
  if (score >= 51) return "#eab308";
  return "#ef4444";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SeoAuditDetailPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [website, setWebsite] = useState<WebsiteInfo | null>(null);
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);

  const fetchData = useCallback(async () => {
    const db = getClientDb();

    const [auditResult, findingsResult] = await Promise.all([
      db
        .from("website_audits")
        .select("*")
        .eq("id", auditId)
        .eq("organization_id", ORG_ID)
        .single(),
      db
        .from("seo_findings")
        .select(
          "id, category, severity, title, description, recommendation, page_url"
        )
        .eq("organization_id", ORG_ID)
        .eq("audit_id", auditId)
        .order("created_at", { ascending: true }),
    ]);

    if (auditResult.data) {
      const a = auditResult.data as AuditDetail;
      setAudit(a);

      // Fetch website info
      const { data: websiteData } = await db
        .from("websites")
        .select("url, name")
        .eq("id", a.website_id)
        .single();
      if (websiteData)
        setWebsite(websiteData as WebsiteInfo);
    }

    if (findingsResult.data) {
      setFindings(findingsResult.data as FindingRow[]);
    }

    setLoading(false);
  }, [auditId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRerun = async () => {
    if (!website) return;
    setRerunning(true);
    const result = await runSeoAudit(website.url);
    setRerunning(false);
    if (result.success) {
      toast.success("Re-audit triggered. New results will appear shortly.");
    } else {
      toast.error(`Error: ${result.error}`);
    }
  };

  // Group findings by severity
  const groupedFindings: Record<Severity, FindingRow[]> = {
    critical: [],
    warning: [],
    info: [],
    pass: [],
  };
  for (const f of findings) {
    const sev = (f.severity as Severity) || "info";
    if (groupedFindings[sev]) {
      groupedFindings[sev].push(f);
    } else {
      groupedFindings.info.push(f);
    }
  }

  const severityCounts = {
    critical: groupedFindings.critical.length,
    warning: groupedFindings.warning.length,
    info: groupedFindings.info.length,
    pass: groupedFindings.pass.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading audit...</div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[#888]">Audit not found</p>
        <Link href="/seo" className="text-[#4FC3F7] hover:underline text-sm">
          Back to Audits
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/seo"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          SEO Audits
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white">{website?.url ?? "Audit"}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="h-6 w-6 text-[#4FC3F7]" />
            {website?.url ?? "Website Audit"}
          </h1>
          <p className="mt-2 text-sm text-[#888]">
            {audit.audit_type} audit &middot; {formatDate(audit.created_at)}{" "}
            &middot; {audit.findings_count} findings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${rerunning ? "animate-spin" : ""}`}
            />
            {rerunning ? "Running..." : "Re-run Audit"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {/* Score */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <p className="text-xs text-[#888]">Score</p>
          <p
            className="mt-1 text-3xl font-bold"
            style={{ color: scoreColor(audit.score) }}
          >
            {audit.score ?? "-"}
          </p>
        </div>
        {/* Severity counts */}
        {severityOrder.map((sev) => {
          const cfg = severityConfig[sev];
          const Icon = cfg.icon;
          return (
            <div
              key={sev}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                <p className="text-xs text-[#888]">{cfg.label}</p>
              </div>
              <p
                className="mt-1 text-2xl font-bold"
                style={{ color: cfg.color }}
              >
                {severityCounts[sev]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {audit.summary && (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h3 className="text-sm font-medium text-[#888] mb-2">Summary</h3>
          <p className="text-sm text-[#ccc] leading-relaxed">
            {audit.summary}
          </p>
        </div>
      )}

      {/* Findings grouped by severity */}
      <div className="space-y-6">
        {severityOrder.map((sev) => {
          const items = groupedFindings[sev];
          if (items.length === 0) return null;
          const cfg = severityConfig[sev];
          const Icon = cfg.icon;

          return (
            <div key={sev}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                <h3 className="text-sm font-semibold text-white">
                  {cfg.label} ({items.length})
                </h3>
              </div>
              <div className="space-y-3">
                {items.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              color: cfg.color,
                              backgroundColor: cfg.bg,
                            }}
                          >
                            {f.category}
                          </span>
                          <h4 className="text-sm font-medium text-white">
                            {f.title}
                          </h4>
                        </div>
                        <p className="mt-2 text-sm text-[#888] leading-relaxed">
                          {f.description}
                        </p>
                        {f.recommendation && (
                          <div className="mt-3 rounded-lg bg-[#111] px-4 py-3">
                            <p className="text-xs font-medium text-[#4FC3F7] mb-1">
                              Recommendation
                            </p>
                            <p className="text-sm text-[#ccc]">
                              {f.recommendation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {f.page_url && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#666]">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{f.page_url}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {findings.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-[#333]" />
            <p className="mt-3 text-sm text-[#666]">
              No findings recorded for this audit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
