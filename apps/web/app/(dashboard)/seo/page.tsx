"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Globe,
  ChevronRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart3,
} from "lucide-react";
import { runSeoAudit } from "../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string;
  website_id: string;
  audit_type: string;
  score: number | null;
  summary: string | null;
  findings_count: number;
  created_at: string;
}

interface WebsiteMap {
  [id: string]: { url: string; name: string };
}

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

function scoreColor(score: number | null): string {
  if (score === null) return "#888";
  if (score >= 76) return "#22c55e";
  if (score >= 51) return "#eab308";
  return "#ef4444";
}

function scoreBg(score: number | null): string {
  if (score === null) return "#88888815";
  if (score >= 76) return "#22c55e15";
  if (score >= 51) return "#eab30815";
  return "#ef444415";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SeoAuditsPage() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [websites, setWebsites] = useState<WebsiteMap>({});
  const [loading, setLoading] = useState(true);
  const [showNewAudit, setShowNewAudit] = useState(false);
  const [auditUrl, setAuditUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const db = getClientDb();

    const { data: auditsData } = await db
      .from("website_audits")
      .select(
        "id, website_id, audit_type, score, summary, findings_count, created_at"
      )
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false });

    const rows = (auditsData ?? []) as AuditRow[];
    setAudits(rows);

    // Fetch website URLs
    const websiteIds = [...new Set(rows.map((a) => a.website_id))];
    if (websiteIds.length > 0) {
      const { data: websitesData } = await db
        .from("websites")
        .select("id, url, name")
        .in("id", websiteIds);
      const map: WebsiteMap = {};
      for (const w of (websitesData ?? []) as {
        id: string;
        url: string;
        name: string;
      }[]) {
        map[w.id] = { url: w.url, name: w.name };
      }
      setWebsites(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAudit = async () => {
    if (!auditUrl.trim()) return;
    setSubmitting(true);
    const result = await runSeoAudit(auditUrl.trim());
    setSubmitting(false);
    if (result.success) {
      setMessage(result.data.message);
      setShowNewAudit(false);
      setAuditUrl("");
      fetchData();
    } else {
      setMessage(`Error: ${result.error}`);
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const avgScore =
    audits.filter((a) => a.score !== null).length > 0
      ? Math.round(
          audits
            .filter((a) => a.score !== null)
            .reduce((s, a) => s + (a.score ?? 0), 0) /
            audits.filter((a) => a.score !== null).length
        )
      : null;

  const totalFindings = audits.reduce((s, a) => s + a.findings_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading audits...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 rounded-lg border border-[#222] bg-[#0a0a0a] px-4 py-3 text-sm text-white shadow-lg">
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SEO Audits</h1>
          <p className="mt-1 text-sm text-[#888]">
            {audits.length} audits &middot;{" "}
            {avgScore !== null && (
              <>
                Avg score:{" "}
                <span style={{ color: scoreColor(avgScore) }}>{avgScore}</span>
                {" "}
                &middot;{" "}
              </>
            )}
            {totalFindings} total findings
          </p>
        </div>
        <button
          onClick={() => setShowNewAudit(!showNewAudit)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Audit
        </button>
      </div>

      {/* New Audit Form */}
      {showNewAudit && (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">
            Run SEO Audit
          </h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-xs text-[#888] block mb-1">
                Website URL
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-3 py-2">
                <Globe className="h-4 w-4 text-[#666]" />
                <input
                  value={auditUrl}
                  onChange={(e) => setAuditUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-transparent text-sm text-white placeholder-[#666] focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleRunAudit}
              disabled={submitting || !auditUrl.trim()}
              className="rounded-lg bg-[#4FC3F7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#38B2D8] disabled:opacity-50"
            >
              {submitting ? "Running..." : "Run Audit"}
            </button>
            <button
              onClick={() => {
                setShowNewAudit(false);
                setAuditUrl("");
              }}
              className="rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#888] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Audits Table */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {audits.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Search className="mx-auto h-8 w-8 text-[#333]" />
              <p className="mt-3 text-sm text-[#666]">
                No audits yet. Run your first SEO audit above.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Website
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Score
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Findings
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Date
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => {
                const site = websites[audit.website_id];
                return (
                  <tr
                    key={audit.id}
                    className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/seo/${audit.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-white hover:text-[#4FC3F7] transition-colors"
                      >
                        <Globe className="h-4 w-4 text-[#666]" />
                        {site?.url ?? "Unknown"}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888] capitalize">
                      {audit.audit_type}
                    </td>
                    <td className="px-5 py-4">
                      {audit.score !== null ? (
                        <span
                          className="rounded-full px-3 py-1 text-xs font-bold"
                          style={{
                            color: scoreColor(audit.score),
                            backgroundColor: scoreBg(audit.score),
                          }}
                        >
                          {audit.score}
                        </span>
                      ) : (
                        <span className="text-sm text-[#666]">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-sm text-[#888]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {audit.findings_count}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {formatDate(audit.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/seo/${audit.id}`}>
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
