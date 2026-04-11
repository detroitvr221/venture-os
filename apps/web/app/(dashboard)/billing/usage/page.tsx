export const dynamic = 'force-dynamic';

import {
  Zap,
  Database,
  Cpu,
  Globe,
  Bot,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ───────────────────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const ORG_ID =
  process.env.DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Types ──────────────────────────────────────────────────────────────────

interface UsageMeter {
  id: string;
  meter_name: string;
  quantity: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AgentCostRow {
  id: string;
  agent_slug: string;
  cost_usd: number;
  description: string | null;
  created_at: string;
}

interface AgentCostGroup {
  agent_slug: string;
  total_cost: number;
  entries: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonth(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

const meterConfig: Record<
  string,
  { icon: typeof Zap; color: string; threshold: number; unit: string }
> = {
  agent_tokens: { icon: Zap, color: "#3b82f6", threshold: 1000000, unit: "tokens" },
  api_calls: { icon: Zap, color: "#3b82f6", threshold: 100000, unit: "calls" },
  crawl_pages: { icon: Globe, color: "#eab308", threshold: 5000, unit: "pages" },
  storage_gb: { icon: Database, color: "#8b5cf6", threshold: 100, unit: "GB" },
  compute_hours: { icon: Cpu, color: "#22c55e", threshold: 500, unit: "hrs" },
  email_sends: { icon: Zap, color: "#f97316", threshold: 10000, unit: "emails" },
  workflow_runs: { icon: Zap, color: "#ec4899", threshold: 1000, unit: "runs" },
};

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getUsageData() {
  const db = getDb();

  const [usageResult, agentCostsResult] = await Promise.all([
    db
      .from("usage_meters")
      .select("id, meter_name, quantity, period_start, period_end, metadata, created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("agent_costs")
      .select("id, agent_slug, cost_usd, description, created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const meters = (usageResult.data ?? []) as UsageMeter[];
  const agentCosts = (agentCostsResult.data ?? []) as AgentCostRow[];

  // Group agent costs by slug
  const costMap: Record<string, AgentCostGroup> = {};
  for (const cost of agentCosts) {
    if (!costMap[cost.agent_slug]) {
      costMap[cost.agent_slug] = {
        agent_slug: cost.agent_slug,
        total_cost: 0,
        entries: 0,
      };
    }
    costMap[cost.agent_slug].total_cost += cost.cost_usd;
    costMap[cost.agent_slug].entries += 1;
  }
  const agentCostGroups = Object.values(costMap).sort(
    (a, b) => b.total_cost - a.total_cost,
  );

  // Monthly cost trend (last 6 months)
  const monthlyTrend: { month: string; cost: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
    const monthlyCosts = agentCosts.filter((c) => {
      const cDate = new Date(c.created_at);
      return cDate >= new Date(monthStart) && cDate <= new Date(monthEnd);
    });
    monthlyTrend.push({
      month: monthStart,
      cost: monthlyCosts.reduce((sum, c) => sum + c.cost_usd, 0),
    });
  }

  // Total cost
  const totalCost = agentCosts.reduce((sum, c) => sum + c.cost_usd, 0);
  const totalMeters = meters.length;

  return {
    meters,
    agentCostGroups,
    monthlyTrend,
    totalCost,
    totalMeters,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default async function UsagePage() {
  const data = await getUsageData();

  // Deduplicate meters by name (take the most recent)
  const seenMeters = new Set<string>();
  const uniqueMeters: UsageMeter[] = [];
  for (const m of data.meters) {
    if (!seenMeters.has(m.meter_name)) {
      seenMeters.add(m.meter_name);
      uniqueMeters.push(m);
    }
  }

  // Find max monthly cost for chart scaling
  const maxMonthlyCost = Math.max(...data.monthlyTrend.map((m) => m.cost), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Usage Dashboard</h1>
        <p className="mt-1 text-sm text-[#888]">
          {data.totalMeters} usage meters tracked &middot; Total agent costs:{" "}
          <span className="text-[#22c55e]">
            {formatCurrency(data.totalCost)}
          </span>
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888]">Total Agent Costs</p>
            <DollarSign className="h-4 w-4 text-[#22c55e]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatCurrency(data.totalCost)}
          </p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888]">Active Agents</p>
            <Bot className="h-4 w-4 text-[#8b5cf6]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {data.agentCostGroups.length}
          </p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#888]">Usage Meters</p>
            <BarChart3 className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {uniqueMeters.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage Meters */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white mb-1">
            Usage Meters
          </h2>
          <p className="text-xs text-[#888] mb-5">Current billing period</p>

          {uniqueMeters.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-[#666]">No usage data yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {uniqueMeters.map((meter) => {
                const cfg = meterConfig[meter.meter_name] ?? {
                  icon: Zap,
                  color: "#888",
                  threshold: Math.max(meter.quantity * 2, 100),
                  unit: "",
                };
                const Icon = cfg.icon;
                const pct =
                  cfg.threshold > 0
                    ? (meter.quantity / cfg.threshold) * 100
                    : 0;
                const displayUsed =
                  meter.quantity >= 1000000
                    ? `${(meter.quantity / 1000000).toFixed(1)}M`
                    : meter.quantity >= 1000
                      ? `${(meter.quantity / 1000).toFixed(0)}k`
                      : meter.quantity.toString();
                const displayLimit =
                  cfg.threshold >= 1000000
                    ? `${(cfg.threshold / 1000000).toFixed(0)}M`
                    : cfg.threshold >= 1000
                      ? `${(cfg.threshold / 1000).toFixed(0)}k`
                      : cfg.threshold.toString();

                return (
                  <div key={meter.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon
                          className="h-4 w-4"
                          style={{ color: cfg.color }}
                        />
                        <span className="text-sm text-white capitalize">
                          {meter.meter_name.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-xs text-[#888]">
                        {displayUsed} / {displayLimit} {cfg.unit}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor:
                            pct > 90
                              ? "#ef4444"
                              : pct > 70
                                ? "#eab308"
                                : cfg.color,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-[#666]">
                        {formatDate(meter.period_start)} -{" "}
                        {formatDate(meter.period_end)}
                      </span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{
                          color:
                            pct > 90
                              ? "#ef4444"
                              : pct > 70
                                ? "#eab308"
                                : "#888",
                        }}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Costs */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white mb-1">
            Per-Agent Costs
          </h2>
          <p className="text-xs text-[#888] mb-5">Grouped by agent slug</p>

          {data.agentCostGroups.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-[#666]">No agent cost data yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="pb-3 text-left text-xs font-medium text-[#888]">
                      Agent
                    </th>
                    <th className="pb-3 text-right text-xs font-medium text-[#888]">
                      Entries
                    </th>
                    <th className="pb-3 text-right text-xs font-medium text-[#888]">
                      Total Cost
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentCostGroups.map((group) => (
                    <tr
                      key={group.agent_slug}
                      className="border-b border-[#1a1a1a] last:border-0"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-[#8b5cf6]" />
                          <span className="text-sm font-medium text-white">
                            {group.agent_slug}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-[#888]">
                        {group.entries}
                      </td>
                      <td className="py-3 text-right text-sm font-medium text-[#22c55e]">
                        {formatCurrency(group.total_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#333]">
                    <td className="pt-3 text-sm font-semibold text-white">
                      Total
                    </td>
                    <td className="pt-3 text-right text-sm text-[#888]">
                      {data.agentCostGroups.reduce(
                        (s, g) => s + g.entries,
                        0,
                      )}
                    </td>
                    <td className="pt-3 text-right text-sm font-bold text-[#22c55e]">
                      {formatCurrency(data.totalCost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Cost Trend */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Monthly Cost Trend
            </h2>
            <p className="text-xs text-[#888]">Last 6 months</p>
          </div>
          <TrendingUp className="h-5 w-5 text-[#3b82f6]" />
        </div>

        <div className="flex items-end gap-3 h-40">
          {data.monthlyTrend.map((month, idx) => {
            const heightPct =
              maxMonthlyCost > 0
                ? (month.cost / maxMonthlyCost) * 100
                : 0;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <span className="text-[10px] text-[#888] font-medium">
                  {formatCurrency(month.cost)}
                </span>
                <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                  <div
                    className="w-full max-w-[40px] rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(heightPct, 2)}%`,
                      background:
                        idx === data.monthlyTrend.length - 1
                          ? "linear-gradient(to top, #3b82f6, #8b5cf6)"
                          : "#1a1a1a",
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#666]">
                  {formatMonth(month.month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
