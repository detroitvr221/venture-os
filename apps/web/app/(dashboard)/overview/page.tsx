"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Filter,
  Zap,
  Mail,
  CheckSquare,
  FolderKanban,
  Search,
  Send,
  Phone,
  Plus,
  ArrowRight,
  Clock,
  User,
  Bot,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import CallModal from "@/components/CallModal";
import { DashboardSkeleton } from "@/components/PageSkeleton";

// ─── Types ──────────────────────────────────────────────────────────────────

type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  updated_at: string;
  clients: { name: string } | null;
}

interface ActivityRow {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  created_at: string;
}

interface PipelineCount {
  stage: LeadStage;
  count: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const STAGE_COLORS: Record<LeadStage, string> = {
  new: "#4FC3F7",
  contacted: "#60a5fa",
  qualified: "#a78bfa",
  proposal: "#F5C542",
  negotiation: "#f97316",
  won: "#22c55e",
  lost: "#ef4444",
};

const STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function actionLabel(action: string, resourceType: string): string {
  const verbs: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    approve: "Approved",
    reject: "Rejected",
    send: "Sent",
    convert: "Converted",
    login: "Logged in",
    export: "Exported",
    enrich: "Enriched",
    assign: "Assigned",
    complete: "Completed",
    cancel: "Cancelled",
    queue: "Queued",
    start: "Started",
  };
  const verb = verbs[action] ?? action;
  return `${verb} ${resourceType.replace(/_/g, " ")}`;
}

function actorIcon(actorType: string) {
  if (actorType === "agent") return Bot;
  if (actorType === "system") return Zap;
  return User;
}

function actorColor(actorType: string): string {
  if (actorType === "agent") return "#F5C542";
  if (actorType === "system") return "#9ca3af";
  return "#4FC3F7";
}

function formatBudget(amount: number | null): string {
  if (!amount) return "--";
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const router = useRouter();
  const orgId = useOrgId();

  // ── State ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [callModalOpen, setCallModalOpen] = useState(false);

  // Priority bar counts
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activeJobs, setActiveJobs] = useState(0);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [newLeadsWeek, setNewLeadsWeek] = useState(0);

  // Pipeline
  const [pipeline, setPipeline] = useState<PipelineCount[]>([]);

  // Active projects
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  // Activity feed
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  // ── Data Fetching ───────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [
      approvalsRes,
      jobsRes,
      emailsRes,
      tasksRes,
      leadsWeekRes,
      leadsAllRes,
      projectsRes,
      activityRes,
    ] = await Promise.all([
      // Pending approvals count
      supabase
        .from("approvals")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "pending"),

      // Active jobs count (running + queued)
      supabase
        .from("audit_jobs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .in("status", ["running", "queued"]),

      // Unread emails count
      supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "received"),

      // Open tasks count
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .neq("status", "done"),

      // New leads this week count
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("created_at", sevenDaysAgo),

      // All leads with stage for pipeline
      supabase
        .from("leads")
        .select("stage")
        .eq("organization_id", orgId),

      // Active projects (top 3)
      supabase
        .from("projects")
        .select("id, name, status, budget, start_date, end_date, updated_at, clients(name)")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(3),

      // Recent activity
      supabase
        .from("audit_logs")
        .select(
          "id, actor_type, actor_id, action, resource_type, resource_id, created_at",
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    // Set priority counts
    setPendingApprovals(approvalsRes.count ?? 0);
    setActiveJobs(jobsRes.count ?? 0);
    setUnreadEmails(emailsRes.count ?? 0);
    setOpenTasks(tasksRes.count ?? 0);
    setNewLeadsWeek(leadsWeekRes.count ?? 0);

    // Build pipeline from leads
    const stageCounts: Record<string, number> = {};
    (leadsAllRes.data ?? []).forEach((row: { stage: string }) => {
      stageCounts[row.stage] = (stageCounts[row.stage] || 0) + 1;
    });
    const pipelineData: PipelineCount[] = STAGE_ORDER.map((stage) => ({
      stage,
      count: stageCounts[stage] || 0,
    }));
    setPipeline(pipelineData);

    // Set projects
    setProjects((projectsRes.data as ProjectRow[]) ?? []);

    // Set activity
    setActivity((activityRes.data as ActivityRow[]) ?? []);

    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Realtime: audit_logs live feed ──────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();

    const channel = supabase
      .channel("overview_audit_logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as ActivityRow;
          setActivity((prev) => [row, ...prev].slice(0, 15));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  // ── Pipeline total for bar widths ──────────────────────────────────────

  const pipelineTotal = useMemo(
    () => pipeline.reduce((sum, p) => sum + p.count, 0),
    [pipeline],
  );

  // ── Priority bar config ────────────────────────────────────────────────

  const priorityCards = [
    {
      label: "Pending Approvals",
      value: pendingApprovals,
      icon: AlertCircle,
      color: "#F5C542",
      href: "/approvals",
    },
    {
      label: "Active Jobs",
      value: activeJobs,
      icon: Zap,
      color: "#4FC3F7",
      href: "/jobs",
    },
    {
      label: "Unread Emails",
      value: unreadEmails,
      icon: Mail,
      color: "#a78bfa",
      href: "/email",
    },
    {
      label: "Open Tasks",
      value: openTasks,
      icon: CheckSquare,
      color: "#f97316",
      href: "/tasks",
    },
    {
      label: "New Leads (7d)",
      value: newLeadsWeek,
      icon: Filter,
      color: "#22c55e",
      href: "/leads",
    },
  ];

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-[#666]">Loading operations...</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-[#4FC3F7]" />
            Command Center
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            Live operations across all ventures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#222] bg-[#111] px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-xs text-[#888]">Live</span>
          </div>
        </div>
      </div>

      {/* ── Priority Bar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {priorityCards.map((card) => {
          const Icon = card.icon;
          const hasItems = card.value > 0;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group relative rounded-xl border border-[#222] bg-[#0a0a0a] p-4 transition-all hover:border-[#333] hover:bg-[#0f0f0f]"
            >
              {hasItems && (
                <div
                  className="absolute top-0 left-0 h-[2px] rounded-t-xl"
                  style={{
                    backgroundColor: card.color,
                    width: "100%",
                  }}
                />
              )}
              <div className="flex items-center justify-between">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color: card.color }} />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#333] transition-colors group-hover:text-[#666]" />
              </div>
              <p
                className="mt-3 text-2xl font-bold"
                style={{ color: hasItems ? card.color : "#555" }}
              >
                {card.value}
              </p>
              <p className="mt-0.5 text-xs text-[#888]">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Lead Pipeline ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#4FC3F7]" />
            Lead Pipeline
          </h2>
          <Link
            href="/leads"
            className="text-xs text-[#4FC3F7] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {pipelineTotal === 0 ? (
          <p className="text-sm text-[#555] py-4 text-center">
            No leads in pipeline
          </p>
        ) : (
          <>
            {/* Bar visualization */}
            <div className="flex h-10 w-full overflow-hidden rounded-lg">
              {pipeline.map((p) => {
                if (p.count === 0) return null;
                const widthPct = Math.max(
                  (p.count / pipelineTotal) * 100,
                  4,
                );
                return (
                  <button
                    key={p.stage}
                    onClick={() =>
                      router.push(`/leads?stage=${p.stage}`)
                    }
                    className="flex items-center justify-center text-xs font-semibold text-white transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: STAGE_COLORS[p.stage],
                      width: `${widthPct}%`,
                      minWidth: "32px",
                    }}
                    title={`${STAGE_LABELS[p.stage]}: ${p.count}`}
                  >
                    {p.count}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {pipeline.map((p) => (
                <button
                  key={p.stage}
                  onClick={() =>
                    router.push(`/leads?stage=${p.stage}`)
                  }
                  className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                >
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: STAGE_COLORS[p.stage] }}
                  />
                  {STAGE_LABELS[p.stage]}
                  <span className="text-[#555]">({p.count})</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Middle row: Active Projects + Quick Actions ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Projects */}
        <div className="lg:col-span-2 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-[#22c55e]" />
              Active Projects
            </h2>
            <Link
              href="/projects"
              className="text-xs text-[#4FC3F7] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <p className="text-sm text-[#555] py-6 text-center">
              No active projects
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                // Compute progress from dates if available
                let progress = 0;
                if (project.start_date && project.end_date) {
                  const start = new Date(project.start_date).getTime();
                  const end = new Date(project.end_date).getTime();
                  const now = Date.now();
                  if (end > start) {
                    progress = Math.min(
                      Math.max(
                        Math.round(
                          ((now - start) / (end - start)) * 100,
                        ),
                        0,
                      ),
                      100,
                    );
                  }
                }

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group flex items-center gap-4 rounded-lg border border-[#1a1a1a] bg-[#111] p-4 transition-colors hover:border-[#333]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-[#666] mt-0.5">
                        {project.clients?.name ?? "No client"}
                        {project.budget
                          ? ` \u00b7 ${formatBudget(project.budget)}`
                          : ""}
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-24 shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-[#666]">
                          {progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#1a1a1a]">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-[#4FC3F7] to-[#22c55e] transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-[#333] group-hover:text-[#666]" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-[#F5C542]" />
            Quick Actions
          </h2>
          <div className="space-y-2.5">
            <Link
              href="/leads"
              className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-sm text-white transition-colors hover:border-[#333] hover:bg-[#161616]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22c55e]/15">
                <Plus className="h-4 w-4 text-[#22c55e]" />
              </div>
              New Lead
            </Link>

            <Link
              href="/seo"
              className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-sm text-white transition-colors hover:border-[#333] hover:bg-[#161616]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4FC3F7]/15">
                <Search className="h-4 w-4 text-[#4FC3F7]" />
              </div>
              Run Audit
            </Link>

            <Link
              href="/email/compose"
              className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-sm text-white transition-colors hover:border-[#333] hover:bg-[#161616]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a78bfa]/15">
                <Send className="h-4 w-4 text-[#a78bfa]" />
              </div>
              Send Email
            </Link>

            <button
              onClick={() => setCallModalOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-sm text-white transition-colors hover:border-[#333] hover:bg-[#161616] text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5C542]/15">
                <Phone className="h-4 w-4 text-[#F5C542]" />
              </div>
              Make Call
            </button>

            <Link
              href="/projects"
              className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] px-4 py-3 text-sm text-white transition-colors hover:border-[#333] hover:bg-[#161616]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f97316]/15">
                <FolderKanban className="h-4 w-4 text-[#f97316]" />
              </div>
              New Project
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Feed ────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#9ca3af]" />
            Recent Activity
          </h2>
          <div className="flex items-center gap-1.5 rounded-full bg-[#111] px-2.5 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[10px] text-[#666]">Realtime</span>
          </div>
        </div>

        {activity.length === 0 ? (
          <p className="text-sm text-[#555] py-6 text-center">
            No recent activity
          </p>
        ) : (
          <div className="space-y-1.5">
            {activity.map((item) => {
              const ActorIcon = actorIcon(item.actor_type);
              const aColor = actorColor(item.actor_type);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#111]"
                >
                  {/* Actor icon */}
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${aColor}20` }}
                  >
                    <ActorIcon
                      className="h-3.5 w-3.5"
                      style={{ color: aColor }}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">
                      {actionLabel(item.action, item.resource_type)}
                    </p>
                    <p className="text-xs text-[#555] truncate">
                      {item.actor_type === "agent"
                        ? item.actor_id
                        : item.actor_type}
                      {item.resource_id
                        ? ` \u00b7 ${item.resource_id.slice(0, 8)}`
                        : ""}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="shrink-0 text-xs text-[#444]">
                    {timeAgo(item.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Call Modal ──────────────────────────────────────────────────── */}
      <CallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
      />
    </div>
  );
}
