"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { UserPlus, CheckCircle2, Clock, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

type OnboardingStep = { index: number; title: string; completed: boolean; completed_at: string | null };

type Onboarding = {
  id: string;
  client_id: string;
  status: string;
  steps: OnboardingStep[];
  completed_steps: number;
  total_steps: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  clients?: { name: string } | null;
  service_templates?: { name: string; tier: string; track: string } | null;
};

export default function OnboardingPage() {
  const [onboardings, setOnboardings] = useState<Onboarding[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; tier: string; track: string; setup_tasks: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newTemplateId, setNewTemplateId] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const [ob, cl, tpl] = await Promise.all([
      supabase.from("onboarding_checklists").select("*, clients(name), service_templates(name, tier, track)").order("created_at", { ascending: false }),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("service_templates").select("id, name, tier, track, setup_tasks").eq("is_active", true),
    ]);
    setOnboardings(ob.data || []);
    setClients(cl.data || []);
    setTemplates(tpl.data || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newClientId || !newTemplateId) return;
    const tpl = templates.find((t) => t.id === newTemplateId);
    const steps = (tpl?.setup_tasks || []).map((task: string, i: number) => ({
      index: i, title: task, completed: false, completed_at: null,
    }));

    const supabase = createClient();
    await supabase.from("onboarding_checklists").insert({
      organization_id: "00000000-0000-0000-0000-000000000001",
      client_id: newClientId,
      template_id: newTemplateId,
      status: "in_progress",
      steps,
      total_steps: steps.length,
      started_at: new Date().toISOString(),
    });
    setShowNew(false);
    loadData();
  }

  async function toggleStep(onboardingId: string, stepIndex: number, currentSteps: unknown[]) {
    const supabase = createClient();
    const updated = (currentSteps as { index: number; completed: boolean; completed_at: string | null }[]).map((s) =>
      s.index === stepIndex ? { ...s, completed: !s.completed, completed_at: !s.completed ? new Date().toISOString() : null } : s
    );
    const completedCount = updated.filter((s) => s.completed).length;
    const allDone = completedCount === updated.length;

    const stepName = (updated.find((s) => s.index === stepIndex) as { index: number; completed: boolean; title?: string })?.title || "Step";
    const wasCompleted = updated.find((s) => s.index === stepIndex)?.completed;
    await supabase.from("onboarding_checklists").update({
      steps: updated,
      completed_steps: completedCount,
      status: allDone ? "completed" : "in_progress",
      completed_at: allDone ? new Date().toISOString() : null,
    }).eq("id", onboardingId);
    if (wasCompleted) {
      toast.success("Step completed");
    } else {
      toast.info("Step marked incomplete");
    }
    loadData();
  }

  const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
    pending: { color: "bg-[#888]/20 text-[#888]", icon: Clock },
    in_progress: { color: "bg-[#3b82f6]/20 text-[#3b82f6]", icon: AlertCircle },
    completed: { color: "bg-[#10b981]/20 text-[#10b981]", icon: CheckCircle2 },
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Onboarding</h1>
          <p className="mt-1 text-sm text-[#888]">{onboardings.filter((o) => o.status === "in_progress").length} active onboardings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] hover:bg-[#222]">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-2 text-xs font-medium text-white hover:bg-[#2563eb]">
            <UserPlus className="h-3.5 w-3.5" /> New Onboarding
          </button>
        </div>
      </div>

      {showNew && (
        <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <h3 className="mb-3 text-sm font-medium text-white">Start Client Onboarding</h3>
          <div className="flex gap-3">
            <select value={newClientId} onChange={(e) => setNewClientId(e.target.value)}
              className="flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white">
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={newTemplateId} onChange={(e) => setNewTemplateId(e.target.value)}
              className="flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white">
              <option value="">Select package...</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.track.toUpperCase()} — {t.name} (${t.tier === "launch" || t.tier === "visibility" ? "99" : t.tier === "build" || t.tier === "growth" ? "199" : "299"}/mo)</option>)}
            </select>
            <button onClick={handleCreate} disabled={!newClientId || !newTemplateId}
              className="rounded-lg bg-[#10b981] px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
              Start
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#666]">Loading...</div>
      ) : onboardings.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <UserPlus className="mb-3 h-10 w-10 text-[#333]" />
          <p className="text-sm text-[#666]">No onboardings yet</p>
          <p className="mt-1 text-xs text-[#555]">Start one when a client signs up for a package</p>
        </div>
      ) : (
        <div className="space-y-4">
          {onboardings.map((ob) => {
            const cfg = statusConfig[ob.status] || statusConfig.pending;
            const Icon = cfg.icon;
            const progress = ob.total_steps > 0 ? (ob.completed_steps / ob.total_steps) * 100 : 0;
            const steps: OnboardingStep[] = ob.steps || [];

            return (
              <div key={ob.id} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-white">{ob.clients?.name || "Unknown Client"}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                      {ob.status}
                    </span>
                    {ob.service_templates && (
                      <span className="rounded-full bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] text-[#8b5cf6]">
                        {ob.service_templates.track} — {ob.service_templates.name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#888]">{ob.completed_steps}/{ob.total_steps} steps</span>
                </div>

                {/* Progress bar */}
                <div className="mb-3 h-1.5 rounded-full bg-[#222]">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#10b981] transition-all" style={{ width: `${progress}%` }} />
                </div>

                {/* Steps */}
                <div className="space-y-1.5">
                  {steps.map((step) => (
                    <button
                      key={step.index}
                      onClick={() => toggleStep(ob.id, step.index, steps)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-[#111]"
                    >
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${step.completed ? "text-[#10b981]" : "text-[#333]"}`} />
                      <span className={step.completed ? "text-[#666] line-through" : "text-[#ccc]"}>{step.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
