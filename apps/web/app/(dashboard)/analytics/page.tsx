"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { BarChart3, TrendingUp, DollarSign, Users, CheckCircle2, Calendar, AlertTriangle, Heart, ShieldAlert, ArrowUpRight, ArrowDownRight, Minus, Sparkles } from "lucide-react";
import { InlineReportPreview } from "@/components/InlineReportPreview";

/* ── Types ──────────────────────────────────────────────────────── */

type DateRange = "week" | "month" | "quarter" | "year";

type KPI = {
  label: string;
  value: string;
  sub: string;
  icon: typeof BarChart3;
  color: string;
};

type BarData = { label: string; value: number; color: string };

type ForecastMonth = {
  month: string;
  projected: number;
  baseline: number;
  pipelineWeighted: number;
  confidence: number;
};

type ClientHealth = {
  id: string;
  name: string;
  score: number;
  lastEmail: string | null;
  lastActivity: string | null;
  outstandingInvoices: number;
};

/* ── Chart Components ───────────────────────────────────────────── */

function BarChart({ data }: { data: BarData[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-[#9ca3af]">{d.value.toLocaleString()}</span>
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{
              height: `${(d.value / max) * 100}%`,
              backgroundColor: d.color,
              minHeight: d.value > 0 ? "4px" : "0px",
            }}
          />
          <span className="text-xs text-[#737373] truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ data }: { data: BarData[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#ccc] truncate max-w-[60%]">{d.label}</span>
            <span className="text-[#9ca3af]">{d.value.toLocaleString()}</span>
          </div>
          <div className="h-5 w-full rounded-full bg-[#1a1a1a]">
            <div
              className="h-5 rounded-full transition-all duration-500"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color,
                minWidth: d.value > 0 ? "8px" : "0px",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StackedBarChart({
  data,
}: {
  data: { label: string; done: number; total: number }[];
}) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-3 h-48">
      {data.map((d) => {
        const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-[#9ca3af]">{pct}%</span>
            <div
              className="w-full rounded-t bg-[#1a1a1a] relative overflow-hidden"
              style={{ height: `${(d.total / max) * 100}%`, minHeight: "4px" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-t bg-[#22c55e] transition-all duration-500"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-[#737373] truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────────────── */

function KPICard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon;
  return (
    <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[#888]">
          {kpi.label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: kpi.color + "1a" }}
        >
          <Icon className="h-4 w-4" style={{ color: kpi.color }} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{kpi.value}</p>
      <p className="mt-1 text-xs text-[#666]">{kpi.sub}</p>
    </div>
  );
}

/* ── Section Wrapper ────────────────────────────────────────────── */

function ChartSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-[#222] bg-[#0a0a0a]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-72 rounded-xl border border-[#222] bg-[#0a0a0a]" />
        ))}
      </div>
    </div>
  );
}

/* ── Date Helpers ───────────────────────────────────────────────── */

function getRangeStart(range: DateRange): Date {
  const now = new Date();
  switch (range) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
  }
}

function getMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short" });
}

function getWeekLabel(weekOffset: number): string {
  if (weekOffset === 0) return "This Week";
  if (weekOffset === 1) return "Last Week";
  return `${weekOffset}w ago`;
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const orgId = useOrgId();
  const [range, setRange] = useState<DateRange>("month");
  const [loading, setLoading] = useState(true);

  // Data states
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState<BarData[]>([]);
  const [leadPipeline, setLeadPipeline] = useState<BarData[]>([]);
  const [leadConversion, setLeadConversion] = useState({ won: 0, total: 0 });
  const [taskCompletion, setTaskCompletion] = useState<
    { label: string; done: number; total: number }[]
  >([]);
  const [teamActivity, setTeamActivity] = useState<BarData[]>([]);
  const [forecast, setForecast] = useState<ForecastMonth[]>([]);
  const [currentMRR, setCurrentMRR] = useState(0);
  const [clientHealthList, setClientHealthList] = useState<ClientHealth[]>([]);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiInsighting, setAiInsighting] = useState(false);

  const rangeStart = useMemo(() => getRangeStart(range), [range]);

  /* ── Data Fetch ─────────────────────────────────────────────── */

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const rangeISO = rangeStart.toISOString();

      // ── KPI: Total Revenue (paid invoices) ──
      const { data: invoices } = await supabase
        .from("invoices")
        .select("amount, status, created_at")
        .eq("organization_id", orgId)
        .eq("status", "paid")
        .gte("created_at", rangeISO);

      const rev = (invoices || []).reduce(
        (sum, inv) => sum + (Number(inv.amount) || 0),
        0
      );
      setTotalRevenue(rev);

      // ── KPI: Active Clients ──
      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "active");
      setActiveClients(clientCount ?? 0);

      // ── KPI: Pipeline Value ──
      const { data: leads } = await supabase
        .from("leads")
        .select("value, stage, created_at")
        .eq("organization_id", orgId);

      const pVal = (leads || [])
        .filter((l) => l.stage !== "won" && l.stage !== "lost")
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
      setPipelineValue(pVal);

      // ── KPI: Tasks Completed ──
      const { count: tasksDone } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "done")
        .gte("created_at", rangeISO);
      setTasksCompleted(tasksDone ?? 0);

      // ── Chart 1: Revenue Trend (last 6 months) ──
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("amount, created_at")
        .eq("organization_id", orgId)
        .eq("status", "paid")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at");

      const monthBuckets = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthBuckets.set(getMonthLabel(d), 0);
      }
      for (const inv of allInvoices || []) {
        const label = getMonthLabel(new Date(inv.created_at));
        if (monthBuckets.has(label)) {
          monthBuckets.set(label, (monthBuckets.get(label) || 0) + Number(inv.amount || 0));
        }
      }
      setRevenueTrend(
        Array.from(monthBuckets.entries()).map(([label, value]) => ({
          label,
          value,
          color: "#4FC3F7",
        }))
      );

      // ── Chart 2: Lead Pipeline Velocity ──
      const stageColors: Record<string, string> = {
        new: "#4FC3F7",
        contacted: "#F5C542",
        qualified: "#22c55e",
        proposal: "#a78bfa",
        negotiation: "#f97316",
        won: "#22c55e",
        lost: "#ef4444",
      };
      const stageCounts = new Map<string, number>();
      let wonCount = 0;
      for (const l of leads || []) {
        const stage = (l.stage || "new").toLowerCase();
        stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
        if (stage === "won") wonCount++;
      }
      setLeadConversion({ won: wonCount, total: (leads || []).length });
      setLeadPipeline(
        Array.from(stageCounts.entries()).map(([label, value]) => ({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          value,
          color: stageColors[label] || "#4FC3F7",
        }))
      );

      // ── Chart 3: Task Completion Rate (last 4 weeks) ──
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("status, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", fourWeeksAgo.toISOString());

      const weekBuckets: { label: string; done: number; total: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - w * 7);

        const weekTasks = (recentTasks || []).filter((t) => {
          const d = new Date(t.created_at);
          return d >= weekStart && d < weekEnd;
        });
        weekBuckets.push({
          label: getWeekLabel(w),
          done: weekTasks.filter((t) => t.status === "done").length,
          total: weekTasks.length,
        });
      }
      setTaskCompletion(weekBuckets);

      // ── Chart 4: Team Activity (audit_logs) ──
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("actor_id")
        .eq("organization_id", orgId)
        .gte("created_at", rangeISO);

      const actorCounts = new Map<string, number>();
      for (const log of logs || []) {
        const actor = log.actor_id || "unknown";
        actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
      }
      const sortedActors = Array.from(actorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const actorColors = [
        "#4FC3F7", "#F5C542", "#22c55e", "#a78bfa", "#f97316",
        "#ec4899", "#14b8a6", "#f43f5e", "#6366f1", "#84cc16",
      ];
      setTeamActivity(
        sortedActors.map(([label, value], i) => ({
          label: label.slice(0, 8) + "...",
          value,
          color: actorColors[i % actorColors.length],
        }))
      );

      // ── Revenue Forecast (Next 3 Months) ──
      const winProb: Record<string, number> = {
        qualified: 0.25,
        proposal: 0.5,
        negotiation: 0.75,
      };

      // Current MRR from paid invoices this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: mrrInvoices } = await supabase
        .from("invoices")
        .select("amount")
        .eq("organization_id", orgId)
        .eq("status", "paid")
        .gte("created_at", monthStart.toISOString());

      const mrr = (mrrInvoices || []).reduce(
        (sum, inv) => sum + (Number(inv.amount) || 0),
        0
      );
      setCurrentMRR(mrr);

      // Pipeline leads in qualifying stages
      const pipelineLeads = (leads || []).filter(
        (l) => l.stage in winProb
      );

      // Build forecast for next 3 months
      const forecastMonths: ForecastMonth[] = [];
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + i);
        const monthName = futureDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });

        // Weighted pipeline value (spread evenly across 3 months for simplicity)
        const weightedPipeline = pipelineLeads.reduce((sum, l) => {
          const prob = winProb[l.stage] || 0;
          return sum + (Number(l.value) || 0) * prob;
        }, 0) / 3;

        const projected = mrr + weightedPipeline;
        // Confidence decreases for further months
        const confidence = Math.max(90 - (i - 1) * 15, 50);

        forecastMonths.push({
          month: monthName,
          projected,
          baseline: mrr,
          pipelineWeighted: weightedPipeline,
          confidence,
        });
      }
      setForecast(forecastMonths);

      // ── Client Health Scores (simplified — no N+1 queries) ──
      const { data: allClients } = await supabase
        .from("clients")
        .select("id, name, email, status, updated_at, created_at")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .limit(20);

      const healthScores: ClientHealth[] = (allClients || []).map((cl) => {
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(cl.updated_at || cl.created_at).getTime()) / 86400000
        );
        let score = 50;
        if (daysSinceUpdate <= 7) score += 30;
        else if (daysSinceUpdate <= 14) score += 20;
        else if (daysSinceUpdate <= 30) score += 10;
        else if (daysSinceUpdate > 60) score -= 20;
        score = Math.max(0, Math.min(100, score));
        return { id: cl.id, name: cl.name, score, lastEmail: null, lastActivity: cl.updated_at, outstandingInvoices: 0 };
      });

      setClientHealthList(healthScores.sort((a, b) => a.score - b.score));

      setLoading(false);
    }

    load();
  }, [orgId, rangeStart]);

  /* ── AI Insights ────────────────────────────────────────────── */

  const handleAiInsights = async () => {
    setAiInsighting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const { data: job } = await supabase.from("audit_jobs").insert({
        organization_id: orgId,
        job_type: "custom",
        status: "queued",
        input_payload: {
          total_revenue: totalRevenue,
          active_clients: activeClients,
          pipeline_value: pipelineValue,
          tasks_completed: tasksCompleted,
          lead_conversion: leadConversion,
          current_mrr: currentMRR,
          range,
        },
        target_entity_type: "analytics",
        external_system: "openclaw",
        started_at: new Date().toISOString(),
      }).select("id").single();

      if (job?.id) {
        setAiJobId(job.id);
        fetch("/api/openclaw/trigger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            agent_id: "main",
            message: `Generate business insights from these KPIs. Period: ${range}. Revenue: $${totalRevenue.toLocaleString()}. Active Clients: ${activeClients}. Pipeline Value: $${pipelineValue.toLocaleString()}. Tasks Completed: ${tasksCompleted}. Lead Conversion: ${leadConversion.won}/${leadConversion.total}. Current MRR: $${currentMRR.toLocaleString()}. Analyze trends, identify opportunities, flag risks, and recommend 3-5 actionable next steps.`,
            job_id: job.id,
          }),
        }).catch(() => {});
      }
    } catch {}
    setAiInsighting(false);
  };

  /* ── KPI Data ───────────────────────────────────────────────── */

  const kpis: KPI[] = [
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toLocaleString()}`,
      sub: `Paid invoices this ${range}`,
      icon: DollarSign,
      color: "#22c55e",
    },
    {
      label: "Active Clients",
      value: activeClients.toLocaleString(),
      sub: "Currently active",
      icon: Users,
      color: "#4FC3F7",
    },
    {
      label: "Pipeline Value",
      value: `$${pipelineValue.toLocaleString()}`,
      sub: "Open leads total value",
      icon: TrendingUp,
      color: "#F5C542",
    },
    {
      label: "Tasks Completed",
      value: tasksCompleted.toLocaleString(),
      sub: `Completed this ${range}`,
      icon: CheckCircle2,
      color: "#a78bfa",
    },
  ];

  const conversionRate =
    leadConversion.total > 0
      ? Math.round((leadConversion.won / leadConversion.total) * 100)
      : 0;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4FC3F7]/10">
            <BarChart3 className="h-5 w-5 text-[#4FC3F7]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm text-[#888]">Business performance overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAiInsights}
            disabled={aiInsighting || loading}
            className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-[#F5C542] transition-colors hover:bg-[#111] disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {aiInsighting ? "Analyzing..." : "AI Insights"}
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-[#333] bg-[#0a0a0a] p-1">
          {(
            [
              { key: "week", label: "This Week" },
              { key: "month", label: "This Month" },
              { key: "quarter", label: "This Quarter" },
              { key: "year", label: "This Year" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                range === opt.key
                  ? "bg-[#4FC3F7] text-white"
                  : "text-[#888] hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* AI Insights Preview */}
      {aiJobId && (
        <div className="mb-6">
          <InlineReportPreview jobId={aiJobId} autoExpand showStatusBar />
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <KPICard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Revenue Trend */}
            <ChartSection title="Revenue Trend (Last 6 Months)">
              {revenueTrend.length > 0 ? (
                <BarChart data={revenueTrend} />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[#666]">
                  No revenue data
                </div>
              )}
            </ChartSection>

            {/* Lead Pipeline */}
            <ChartSection title="Lead Pipeline Velocity">
              {leadPipeline.length > 0 ? (
                <>
                  <HorizontalBarChart data={leadPipeline} />
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#111] px-3 py-2">
                    <TrendingUp className="h-4 w-4 text-[#22c55e]" />
                    <span className="text-xs text-[#ccc]">
                      Conversion rate:{" "}
                      <strong className="text-white">{conversionRate}%</strong>{" "}
                      ({leadConversion.won} won / {leadConversion.total} total)
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[#666]">
                  No lead data
                </div>
              )}
            </ChartSection>

            {/* Task Completion */}
            <ChartSection title="Task Completion Rate (Last 4 Weeks)">
              {taskCompletion.some((w) => w.total > 0) ? (
                <StackedBarChart data={taskCompletion} />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[#666]">
                  No task data
                </div>
              )}
            </ChartSection>

            {/* Team Activity */}
            <ChartSection title="Team Activity (Top 10)">
              {teamActivity.length > 0 ? (
                <HorizontalBarChart data={teamActivity} />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-[#666]">
                  No activity data
                </div>
              )}
            </ChartSection>
          </div>

          {/* ── Revenue Forecast ─────────────────────────────────────── */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#22c55e]" />
                <h3 className="text-sm font-semibold text-white">
                  Revenue Forecast (Next 3 Months)
                </h3>
              </div>
              <div className="rounded-lg bg-[#111] px-3 py-1.5 text-xs text-[#888]">
                Current MRR:{" "}
                <span className="font-semibold text-white">
                  ${currentMRR.toLocaleString()}
                </span>
              </div>
            </div>

            {forecast.length > 0 ? (
              <>
                {/* Forecast Cards */}
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {forecast.map((fm, i) => {
                    const trend =
                      i === 0
                        ? fm.projected > currentMRR
                          ? "growing"
                          : fm.projected < currentMRR
                          ? "declining"
                          : "flat"
                        : fm.projected > forecast[i - 1].projected
                        ? "growing"
                        : fm.projected < forecast[i - 1].projected
                        ? "declining"
                        : "flat";
                    const trendColor =
                      trend === "growing"
                        ? "text-[#22c55e]"
                        : trend === "declining"
                        ? "text-[#ef4444]"
                        : "text-[#f59e0b]";
                    const TrendIcon =
                      trend === "growing"
                        ? ArrowUpRight
                        : trend === "declining"
                        ? ArrowDownRight
                        : Minus;

                    return (
                      <div
                        key={fm.month}
                        className="rounded-lg border border-[#222] bg-[#111] p-4"
                      >
                        <p className="text-xs font-medium uppercase tracking-wider text-[#888]">
                          {fm.month}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-xl font-bold text-white">
                            ${Math.round(fm.projected).toLocaleString()}
                          </p>
                          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                        </div>
                        <p className="mt-1 text-[10px] text-[#666]">
                          Base: ${currentMRR.toLocaleString()} + Pipeline: $
                          {Math.round(fm.pipelineWeighted).toLocaleString()}
                        </p>
                        {/* Confidence bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#888]">Confidence</span>
                            <span className="text-[#ccc]">{fm.confidence}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${fm.confidence}%`,
                                backgroundColor:
                                  fm.confidence >= 80
                                    ? "#22c55e"
                                    : fm.confidence >= 60
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Forecast Bar Chart: Current vs Projected */}
                <div className="flex items-end gap-3 h-40">
                  {/* Current month bar */}
                  {(() => {
                    const allValues = [
                      currentMRR,
                      ...forecast.map((f) => f.projected),
                    ];
                    const max = Math.max(...allValues, 1);
                    const currentMonth = new Date().toLocaleDateString("en-US", {
                      month: "short",
                    });
                    return (
                      <>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs text-[#9ca3af]">
                            ${currentMRR.toLocaleString()}
                          </span>
                          <div
                            className="w-full rounded-t bg-[#4FC3F7] transition-all duration-500"
                            style={{
                              height: `${(currentMRR / max) * 100}%`,
                              minHeight: currentMRR > 0 ? "4px" : "0px",
                            }}
                          />
                          <span className="text-xs text-[#737373]">
                            {currentMonth} (Actual)
                          </span>
                        </div>
                        {forecast.map((fm) => {
                          const color =
                            fm.projected > currentMRR
                              ? "#22c55e"
                              : fm.projected < currentMRR
                              ? "#ef4444"
                              : "#f59e0b";
                          const shortMonth = new Date(
                            fm.month
                          ).toLocaleDateString("en-US", { month: "short" });
                          return (
                            <div
                              key={fm.month}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <span className="text-xs text-[#9ca3af]">
                                ${Math.round(fm.projected).toLocaleString()}
                              </span>
                              <div
                                className="w-full rounded-t transition-all duration-500"
                                style={{
                                  height: `${(fm.projected / max) * 100}%`,
                                  backgroundColor: color,
                                  minHeight:
                                    fm.projected > 0 ? "4px" : "0px",
                                }}
                              />
                              <span className="text-xs text-[#737373]">
                                {shortMonth}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-[#666]">
                No pipeline data for forecasting
              </div>
            )}
          </div>

          {/* ── Client Health Scores ─────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* At-Risk Clients */}
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#ef4444]" />
                <h3 className="text-sm font-semibold text-white">
                  At-Risk Clients
                </h3>
                <span className="rounded-full bg-[#ef4444]/15 px-2 py-0.5 text-[10px] font-medium text-[#ef4444]">
                  Score &lt; 50
                </span>
              </div>

              {(() => {
                const atRisk = clientHealthList.filter((c) => c.score < 50).slice(0, 5);
                if (atRisk.length === 0) {
                  return (
                    <div className="flex h-40 items-center justify-center text-sm text-[#666]">
                      No at-risk clients
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {atRisk.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {c.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-[#666]">
                            {c.lastEmail && (
                              <span>
                                Email:{" "}
                                {Math.floor(
                                  (Date.now() - new Date(c.lastEmail).getTime()) /
                                    86400000
                                )}
                                d ago
                              </span>
                            )}
                            {c.outstandingInvoices > 0 && (
                              <span className="text-[#ef4444]">
                                ${c.outstandingInvoices.toLocaleString()} owed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1a1a1a]">
                            <div
                              className="h-1.5 rounded-full bg-[#ef4444] transition-all"
                              style={{ width: `${c.score}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-bold text-[#ef4444]">
                            {c.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Healthy Clients */}
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-[#22c55e]" />
                <h3 className="text-sm font-semibold text-white">
                  Healthy Clients
                </h3>
                <span className="rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-medium text-[#22c55e]">
                  Score &gt; 80
                </span>
              </div>

              {(() => {
                const healthy = clientHealthList
                  .filter((c) => c.score > 80)
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5);
                if (healthy.length === 0) {
                  return (
                    <div className="flex h-40 items-center justify-center text-sm text-[#666]">
                      No clients above 80 score
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {healthy.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {c.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-[#666]">
                            {c.lastActivity && (
                              <span>
                                Active:{" "}
                                {Math.floor(
                                  (Date.now() -
                                    new Date(c.lastActivity).getTime()) /
                                    86400000
                                )}
                                d ago
                              </span>
                            )}
                            {c.outstandingInvoices === 0 && (
                              <span className="text-[#22c55e]">All paid</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1a1a1a]">
                            <div
                              className="h-1.5 rounded-full bg-[#22c55e] transition-all"
                              style={{ width: `${c.score}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-bold text-[#22c55e]">
                            {c.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
