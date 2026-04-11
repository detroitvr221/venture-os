export const dynamic = 'force-dynamic';

import {
  Bot,
  Cpu,
  Wrench,
  Activity,
  Database,
  Zap,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ───────────────────────────────────────────────────────────────

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

// ─── Types ──────────────────────────────────────────────────────────────────

interface AgentRow {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  model: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getAgentsData() {
  const db = getDb();

  const { data: agents, error } = await db
    .from("agents")
    .select("id, name, display_name, description, model, is_active, config")
    .eq("organization_id", ORG_ID)
    .order("name");

  if (error) {
    console.error("Failed to fetch agents:", error.message);
    return { agents: [], totalTasksToday: 0 };
  }

  // Get today's tool call count per agent
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: toolCalls } = await db
    .from("agent_tool_calls")
    .select("agent_name")
    .eq("organization_id", ORG_ID)
    .gte("called_at", todayStart.toISOString());

  const tasksByAgent: Record<string, number> = {};
  for (const call of toolCalls ?? []) {
    const name = (call as { agent_name: string }).agent_name;
    tasksByAgent[name] = (tasksByAgent[name] ?? 0) + 1;
  }

  const enrichedAgents = (agents ?? []).map((agent: AgentRow) => ({
    ...agent,
    tasksToday: tasksByAgent[agent.name] ?? 0,
    tools: Array.isArray((agent.config as Record<string, unknown>)?.tools)
      ? ((agent.config as Record<string, unknown>).tools as string[]).length
      : 0,
    memoryScope: ((agent.config as Record<string, unknown>)?.memory_scope as string) ?? "Default",
  }));

  const totalTasksToday = Object.values(tasksByAgent).reduce((a, b) => a + b, 0);

  return { agents: enrichedAgents, totalTasksToday };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default async function AgentsPage() {
  const { agents, totalTasksToday } = await getAgentsData();

  const onlineCount = agents.filter((a: { is_active: boolean }) => a.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Roster</h1>
          <p className="mt-1 text-sm text-[#888]">
            {agents.length} agents &middot; {onlineCount} online &middot;{" "}
            {totalTasksToday} tasks today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] border border-[#222] px-3 py-2">
            <Activity className="h-4 w-4 text-[#22c55e]" />
            <span className="text-sm text-[#888]">System Healthy</span>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-10 text-center">
          <Bot className="mx-auto h-10 w-10 text-[#666]" />
          <p className="mt-3 text-sm text-[#888]">No agents configured yet.</p>
          <p className="text-xs text-[#666]">Agents will appear here once added to the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent: {
            id: string;
            name: string;
            display_name: string;
            description: string | null;
            model: string;
            is_active: boolean;
            tasksToday: number;
            tools: number;
            memoryScope: string;
          }) => (
            <div
              key={agent.id}
              className="group rounded-xl border border-[#222] bg-[#0a0a0a] p-5 transition-all hover:border-[#333]"
            >
              {/* Agent header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {agent.display_name}
                    </h3>
                    <p className="text-xs text-[#888]">{agent.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      agent.is_active ? "bg-[#22c55e]" : "bg-[#666]"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      agent.is_active ? "text-[#22c55e]" : "text-[#666]"
                    }`}
                  >
                    {agent.is_active ? "online" : "offline"}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="mt-3 text-xs leading-relaxed text-[#888]">
                {agent.description ?? "No description provided."}
              </p>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#111] p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Cpu className="h-3 w-3 text-[#666]" />
                    <span className="text-[10px] text-[#666]">Model</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-white">
                    {agent.model.replace("Claude ", "").replace("claude-", "")}
                  </p>
                </div>
                <div className="rounded-lg bg-[#111] p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Wrench className="h-3 w-3 text-[#666]" />
                    <span className="text-[10px] text-[#666]">Tools</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-white">
                    {agent.tools}
                  </p>
                </div>
                <div className="rounded-lg bg-[#111] p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3 text-[#666]" />
                    <span className="text-[10px] text-[#666]">Today</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-white">
                    {agent.tasksToday}
                  </p>
                </div>
              </div>

              {/* Memory scope */}
              <div className="mt-3 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-[#666]" />
                <span className="text-[10px] text-[#666]">Memory:</span>
                <span className="text-[10px] font-medium text-[#888]">
                  {agent.memoryScope}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
