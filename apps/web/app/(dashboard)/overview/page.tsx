export const dynamic = 'force-dynamic';

import {
  TrendingUp,
  TrendingDown,
  Users,
  FolderKanban,
  CheckCircle2,
  DollarSign,
  Bot,
  Filter,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Server Client ─────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const ORG_ID =
  process.env.DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getOverviewData() {
  const db = getDb();

  const [
    leadsResult,
    clientsResult,
    projectsResult,
    approvalsResult,
    invoicesResult,
    agentCostsResult,
    auditLogsResult,
    agentsResult,
  ] = await Promise.all([
    // Count leads
    db
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ORG_ID),
    // Count active clients
    db
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ORG_ID)
      .eq("status", "active"),
    // Count active projects
    db
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ORG_ID)
      .eq("status", "active"),
    // Count pending approvals
    db
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ORG_ID)
      .eq("status", "pending"),
    // Sum paid invoices this month
    db
      .from("invoices")
      .select("amount_paid")
      .eq("organization_id", ORG_ID)
      .eq("status", "paid")
      .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    // Sum agent costs this month
    db
      .from("agent_costs")
      .select("cost_usd")
      .eq("organization_id", ORG_ID)
      .gte("recorded_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    // Recent audit logs for activity feed
    db
      .from("audit_logs")
      .select("id, actor_type, actor_id, action, resource_type, resource_id, changes, created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(10),
    // Top agents (by tool call count)
    db
      .from("agents")
      .select("name, display_name, is_active, model")
      .eq("organization_id", ORG_ID)
      .eq("is_active", true)
      .limit(5),
  ]);

  const monthlyRevenue = (invoicesResult.data ?? []).reduce(
    (sum: number, inv: { amount_paid: number }) => sum + (inv.amount_paid ?? 0),
    0,
  );

  const agentSpend = (agentCostsResult.data ?? []).reduce(
    (sum: number, c: { cost_usd: number }) => sum + (c.cost_usd ?? 0),
    0,
  );

  return {
    leadCount: leadsResult.count ?? 0,
    clientCount: clientsResult.count ?? 0,
    projectCount: projectsResult.count ?? 0,
    pendingApprovals: approvalsResult.count ?? 0,
    monthlyRevenue,
    agentSpend,
    recentActivity: (auditLogsResult.data ?? []) as Array<{
      id: string;
      actor_type: string;
      actor_id: string;
      action: string;
      resource_type: string;
      resource_id: string;
      changes: Record<string, unknown> | null;
      created_at: string;
    }>,
    topAgents: (agentsResult.data ?? []) as Array<{
      name: string;
      display_name: string;
      is_active: boolean;
      model: string;
    }>,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function actionLabel(action: string, resourceType: string): string {
  const labels: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    approve: "Approved",
    reject: "Rejected",
    send: "Sent",
    convert: "Converted",
    login: "Logged in",
    export: "Exported",
  };
  const verb = labels[action] ?? action;
  return `${verb} ${resourceType.replace(/_/g, " ")}`;
}

function activityTypeColor(resourceType: string): string {
  if (resourceType.includes("lead")) return "bg-[#3b82f6]";
  if (resourceType.includes("agent")) return "bg-[#8b5cf6]";
  if (resourceType.includes("invoice") || resourceType.includes("billing")) return "bg-[#22c55e]";
  if (resourceType.includes("approval")) return "bg-[#eab308]";
  return "bg-[#888]";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default async function OverviewPage() {
  const data = await getOverviewData();

  const stats = [
    {
      label: "Total Leads",
      value: data.leadCount.toString(),
      icon: Filter,
      color: "#3b82f6",
    },
    {
      label: "Active Clients",
      value: data.clientCount.toString(),
      icon: Users,
      color: "#8b5cf6",
    },
    {
      label: "Running Projects",
      value: data.projectCount.toString(),
      icon: FolderKanban,
      color: "#22c55e",
    },
    {
      label: "Pending Approvals",
      value: data.pendingApprovals.toString(),
      icon: CheckCircle2,
      color: "#eab308",
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(data.monthlyRevenue),
      icon: DollarSign,
      color: "#22c55e",
    },
    {
      label: "Agent Costs",
      value: formatCurrency(Math.round(data.agentSpend * 100) / 100),
      icon: Bot,
      color: "#ef4444",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-[#888]">
          Welcome back. Here is what is happening across your ventures.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 transition-colors hover:border-[#333]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#888]">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {stat.value}
                  </p>
                </div>
                <div
                  className="rounded-lg p-2.5"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: stat.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <div className="lg:col-span-3 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {data.recentActivity.length === 0 && (
              <p className="text-sm text-[#666]">No recent activity</p>
            )}
            {data.recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] p-3.5"
              >
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${activityTypeColor(item.resource_type)}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {actionLabel(item.action, item.resource_type)}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-[#888]">
                    by {item.actor_type === "agent" ? item.actor_id : item.actor_type} &middot; {item.resource_id.slice(0, 8)}...
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#666]">
                  {timeAgo(item.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents */}
        <div className="lg:col-span-2 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">
            Active Agents
          </h2>
          <div className="mt-4 space-y-3">
            {data.topAgents.length === 0 && (
              <p className="text-sm text-[#666]">No active agents</p>
            )}
            {data.topAgents.map((agent, i) => (
              <div
                key={agent.name}
                className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] p-3.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {agent.display_name}
                  </p>
                  <p className="text-xs text-[#888]">
                    {agent.model}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${agent.is_active ? "bg-[#22c55e]" : "bg-[#666]"}`} />
                  <span className="text-xs text-[#888]">
                    {agent.is_active ? "online" : "offline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
