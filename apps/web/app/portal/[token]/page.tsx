"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  FolderKanban,
  FileText,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  BarChart3,
  Shield,
} from "lucide-react";

// Direct Supabase client with anon key — no auth required
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ── Types ──────────────────────────────────────────────────────── */

type PortalToken = {
  id: string;
  client_id: string;
  token: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

type ClientInfo = {
  id: string;
  name: string;
  company: string | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

type Milestone = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project_id: string;
};

type Report = {
  id: string;
  title: string | null;
  summary: string | null;
  report_type: string | null;
  score: number | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  action: string;
  resource_type: string | null;
  created_at: string;
};

/* ── Helpers ─────────────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const statusDot: Record<string, string> = {
  done: "text-[#10b981]",
  completed: "text-[#10b981]",
  complete: "text-[#10b981]",
  active: "text-[#4FC3F7]",
  in_progress: "text-[#4FC3F7]",
  planning: "text-[#f59e0b]",
  pending: "text-[#f59e0b]",
  on_hold: "text-[#888]",
  cancelled: "text-[#ef4444]",
};

const statusBadge: Record<string, string> = {
  active: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30",
  in_progress: "bg-[#4FC3F7]/15 text-[#4FC3F7] border-[#4FC3F7]/30",
  planning: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30",
  completed: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30",
  on_hold: "bg-[#888]/15 text-[#888] border-[#888]/30",
  cancelled: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30",
};

/* ── Main Component ──────────────────────────────────────────────── */

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function loadPortal() {
      setLoading(true);
      setError(null);

      // 1. Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("portal_tokens")
        .select("*")
        .eq("token", token)
        .eq("active", true)
        .single();

      if (tokenError || !tokenData) {
        setError("Invalid or expired link");
        setLoading(false);
        return;
      }

      const portalToken = tokenData as PortalToken;

      // Check expiration
      if (portalToken.expires_at && new Date(portalToken.expires_at) < new Date()) {
        setError("This portal link has expired. Please request a new link from your account manager.");
        setLoading(false);
        return;
      }

      const clientId = portalToken.client_id;

      // 2. Get client info
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("id", clientId)
        .single();

      if (!clientData) {
        setError("Client not found");
        setLoading(false);
        return;
      }

      setClient(clientData);

      // 3. Load projects for this client
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, name, status, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      const projectList = projectData || [];
      setProjects(projectList);

      // 4. Load milestones for all projects
      if (projectList.length > 0) {
        const projectIds = projectList.map((p) => p.id);
        const { data: milestoneData } = await supabase
          .from("milestones")
          .select("id, title, status, due_date, project_id")
          .in("project_id", projectIds)
          .order("due_date", { ascending: true });
        setMilestones(milestoneData || []);
      }

      // 5. Load reports linked to this client's websites
      const { data: websites } = await supabase
        .from("websites")
        .select("id")
        .eq("client_id", clientId);

      if (websites && websites.length > 0) {
        const websiteIds = websites.map((w) => w.id);
        const { data: reportData } = await supabase
          .from("reports")
          .select("id, title, summary, report_type, score, created_at")
          .in("website_id", websiteIds)
          .order("created_at", { ascending: false })
          .limit(10);
        setReports(reportData || []);
      }

      // 6. Load recent audit logs for this client
      const { data: logData } = await supabase
        .from("audit_logs")
        .select("id, action, resource_type, created_at")
        .eq("resource_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);
      setAuditLogs(logData || []);

      setLoading(false);
    }

    loadPortal();
  }, [token]);

  /* ── Error State ─────────────────────────────────────────────── */

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <PortalHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#ef4444]/10">
            <AlertCircle className="h-10 w-10 text-[#ef4444]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Invalid or Expired Link</h1>
          <p className="mt-3 text-[#888]">
            {error}
          </p>
          <p className="mt-6 text-sm text-[#555]">
            If you believe this is an error, please contact your account manager at Northbridge Digital.
          </p>
        </div>
      </div>
    );
  }

  /* ── Loading State ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <PortalHeader />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded bg-[#1a1a1a]" />
            <div className="h-4 w-40 rounded bg-[#1a1a1a]" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-xl border border-[#222] bg-[#111]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Milestone helpers ───────────────────────────────────────── */

  function getMilestonesForProject(projectId: string) {
    return milestones.filter((m) => m.project_id === projectId);
  }

  function getProjectProgress(projectId: string): number {
    const ms = getMilestonesForProject(projectId);
    if (ms.length === 0) return 0;
    const done = ms.filter(
      (m) => m.status === "done" || m.status === "completed" || m.status === "complete"
    ).length;
    return Math.round((done / ms.length) * 100);
  }

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PortalHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Client info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{client?.name}</h1>
          <p className="mt-1 text-[#888]">
            {client?.company ? `${client.company} -- ` : ""}Project Portal
          </p>
        </div>

        {/* ── Active Projects ─────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-[#4FC3F7]" />
            <h2 className="text-lg font-semibold text-white">Active Projects</h2>
          </div>

          {projects.length === 0 ? (
            <EmptyCard message="No active projects at this time." />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {projects.map((project) => {
                const progress = getProjectProgress(project.id);
                const ms = getMilestonesForProject(project.id);
                return (
                  <div
                    key={project.id}
                    className="rounded-xl border border-[#222] bg-[#111] p-5"
                  >
                    {/* Project header */}
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">
                        {project.name}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
                          statusBadge[project.status] ||
                          "bg-[#888]/15 text-[#888] border-[#888]/30"
                        }`}
                      >
                        {project.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-1 flex items-center justify-between text-xs text-[#888]">
                      <span>Progress</span>
                      <span className="font-medium text-white">{progress}%</span>
                    </div>
                    <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-[#4FC3F7] to-[#22c55e] transition-all duration-500"
                        style={{ width: `${progress}%`, minWidth: progress > 0 ? "8px" : "0px" }}
                      />
                    </div>

                    {/* Milestones list */}
                    {ms.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-[#555]">
                          Milestones
                        </p>
                        {ms.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between rounded-lg bg-[#0a0a0a] px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              {m.status === "done" || m.status === "completed" || m.status === "complete" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
                              ) : (
                                <Circle
                                  className={`h-3.5 w-3.5 ${
                                    statusDot[m.status] || "text-[#555]"
                                  }`}
                                />
                              )}
                              <span className="text-sm text-[#ccc]">{m.title}</span>
                            </div>
                            {m.due_date && (
                              <span className="flex items-center gap-1 text-xs text-[#666]">
                                <Clock className="h-3 w-3" />
                                {new Date(m.due_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {ms.length === 0 && (
                      <p className="text-xs text-[#555]">No milestones defined yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Recent Reports ──────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F5C542]" />
            <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
          </div>

          {reports.length === 0 ? (
            <EmptyCard message="No reports available yet." />
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-xl border border-[#222] bg-[#111] px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F5C542]/10">
                      <BarChart3 className="h-5 w-5 text-[#F5C542]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        {report.title || report.report_type || "Report"}
                      </h3>
                      {report.summary && (
                        <p className="mt-0.5 text-xs text-[#888] line-clamp-1">
                          {report.summary}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-[#555]">
                        {new Date(report.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {report.score !== null && (
                    <ScoreBadge score={report.score} />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent Activity ─────────────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#a78bfa]" />
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          </div>

          {auditLogs.length === 0 ? (
            <EmptyCard message="No recent activity to show." />
          ) : (
            <div className="rounded-xl border border-[#222] bg-[#111]">
              <div className="divide-y divide-[#1a1a1a]">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a78bfa]/10">
                      <Activity className="h-3.5 w-3.5 text-[#a78bfa]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#ccc]">{log.action}</span>
                        {log.resource_type && (
                          <span className="rounded-full bg-[#222] px-2 py-0.5 text-[10px] text-[#666]">
                            {log.resource_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#555]">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-[#222] py-8 text-center">
          <p className="text-xs text-[#555]">
            Powered by{" "}
            <span className="bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text font-medium text-transparent">
              Northbridge Digital
            </span>
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function PortalHeader() {
  return (
    <header className="border-b border-[#222] bg-[#0a0a0a]">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
          <span className="text-sm font-bold text-white">NB</span>
        </div>
        <div>
          <span className="bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-lg font-bold text-transparent">
            Northbridge Digital
          </span>
          <p className="text-[10px] uppercase tracking-widest text-[#555]">Client Portal</p>
        </div>
      </div>
    </header>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[#222] bg-[#111] px-5 py-12 text-center">
      <p className="text-sm text-[#555]">{message}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color = "text-[#10b981] bg-[#10b981]/15 border-[#10b981]/30";
  if (score < 50) color = "text-[#ef4444] bg-[#ef4444]/15 border-[#ef4444]/30";
  else if (score < 75) color = "text-[#f59e0b] bg-[#f59e0b]/15 border-[#f59e0b]/30";

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold ${color}`}>
      {score}
    </div>
  );
}
