"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GitBranch, Play, Pause, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

type WorkflowRun = {
  id: string;
  workflow_id: string | null;
  status: string;
  trigger_type: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  workflows?: { name: string; type: string } | null;
};

const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  running: { icon: Play, color: "text-[#3b82f6] bg-[#3b82f6]/20" },
  paused: { icon: Pause, color: "text-[#f59e0b] bg-[#f59e0b]/20" },
  completed: { icon: CheckCircle2, color: "text-[#10b981] bg-[#10b981]/20" },
  failed: { icon: XCircle, color: "text-[#ef4444] bg-[#ef4444]/20" },
  pending: { icon: Clock, color: "text-[#888] bg-[#888]/20" },
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<{ id: string; name: string; type: string; description: string | null }[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const [wf, wr] = await Promise.all([
      supabase.from("workflows").select("id, name, type, description").order("name"),
      supabase.from("workflow_runs").select("*, workflows(name, type)").order("created_at", { ascending: false }).limit(30),
    ]);
    setWorkflows(wf.data || []);
    setRuns(wr.data || []);
    setLoading(false);
  }

  const stats = {
    total: workflows.length,
    running: runs.filter((r) => r.status === "running").length,
    completed: runs.filter((r) => r.status === "completed").length,
    failed: runs.filter((r) => r.status === "failed").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="mt-1 text-sm text-[#888]">Durable workflow execution via Trigger.dev</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] hover:bg-[#222]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Workflows", value: stats.total, color: "text-[#3b82f6]" },
          { label: "Running", value: stats.running, color: "text-[#f59e0b]" },
          { label: "Completed", value: stats.completed, color: "text-[#10b981]" },
          { label: "Failed", value: stats.failed, color: "text-[#ef4444]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <p className="text-xs text-[#888]">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Workflow definitions */}
      {workflows.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-[#888]">Workflow Definitions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workflows.map((wf) => (
              <div key={wf.id} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-[#8b5cf6]" />
                  <h3 className="font-medium text-white">{wf.name}</h3>
                </div>
                <p className="mt-1 text-xs text-[#888]">{wf.type} &middot; {wf.description || "No description"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent runs */}
      <h2 className="mb-3 text-sm font-medium text-[#888]">Recent Runs</h2>
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {loading ? (
          <div className="py-16 text-center text-[#666]">Loading...</div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <GitBranch className="mb-3 h-10 w-10 text-[#333]" />
            <p className="text-sm text-[#666]">No workflow runs yet</p>
            <p className="mt-1 text-xs text-[#555]">Workflows trigger automatically from lead intake, audits, and approvals</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {runs.map((run) => {
              const cfg = STATUS_ICONS[run.status] || STATUS_ICONS.pending;
              const Icon = cfg.icon;
              return (
                <div key={run.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.color.split(" ")[1]}`}>
                    <Icon className={`h-4 w-4 ${cfg.color.split(" ")[0]}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{run.workflows?.name || "Unknown workflow"}</p>
                    <p className="text-xs text-[#888]">
                      {run.trigger_type || "manual"} &middot; {new Date(run.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                    {run.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
