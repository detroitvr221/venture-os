"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { Brain, Search, RefreshCw, Database, Link2, Lightbulb, Sparkles } from "lucide-react";
import { InlineReportPreview } from "@/components/InlineReportPreview";
import Pagination from "@/components/Pagination";

type Memory = {
  id: string;
  content: string | null;
  category: string | null;
  source: string | null;
  agent_id: string | null;
  confidence: number | null;
  created_at: string;
};

type MemoryEntity = {
  id: string;
  name: string;
  entity_type: string | null;
  metadata: Record<string, unknown> | null;
};

export default function MemoryPage() {
  const orgId = useOrgId();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [entities, setEntities] = useState<MemoryEntity[]>([]);
  const [edges, setEdges] = useState<{ id: string; from_entity: string; to_entity: string; relation: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"memories" | "entities" | "graph">("memories");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [page]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [mem, ent, edg] = await Promise.all([
      supabase.from("memories").select("*", { count: "exact" }).eq("organization_id", orgId).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
      supabase.from("memory_entities").select("*").eq("organization_id", orgId).order("name").limit(100),
      supabase.from("memory_edges").select("id, from_entity, to_entity, relation").eq("organization_id", orgId).limit(100),
    ]);
    setMemories(mem.data || []);
    setTotalCount(mem.count ?? 0);
    setEntities(ent.data || []);
    setEdges(edg.data || []);
    setLoading(false);
  }

  const handleAskAi = async () => {
    if (!search.trim()) return;
    setAiLoading(true);
    try {
      const supabase = createClient();
      const { data: job } = await supabase.from("audit_jobs").insert({
        organization_id: orgId,
        job_type: "custom",
        status: "queued",
        input_payload: {
          message: `Search organizational knowledge and answer: ${search.trim()}. Use context from memories and entities.`,
          query: search.trim(),
        },
        target_entity_type: "memory",
        external_system: "openclaw",
        started_at: new Date().toISOString(),
      }).select("id").single();

      if (job?.id) {
        setAiJobId(job.id);
        fetch("/api/openclaw/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer vos-hooks-token-2026" },
          body: JSON.stringify({
            agent_id: "main",
            message: `Search organizational knowledge and answer: ${search.trim()}. Use context from memories and entities.`,
            organization_id: orgId,
            job_id: job.id,
            context: { source: "memory_page", query: search.trim() },
          }),
        });
      }
    } catch (err) {
      console.error("Ask AI error:", err);
    }
    setAiLoading(false);
  };

  const filteredMemories = memories.filter(
    (m) => !search || m.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Memory</h1>
          <p className="mt-1 text-sm text-[#888]">
            Agent knowledge base &middot; {memories.length} memories &middot; {entities.length} entities &middot; {edges.length} connections
          </p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] hover:bg-[#222]">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Memories", value: memories.length, icon: Brain, color: "text-[#F5C542]" },
          { label: "Entities", value: entities.length, icon: Database, color: "text-[#4FC3F7]" },
          { label: "Connections", value: edges.length, icon: Link2, color: "text-[#10b981]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <p className="text-xs text-[#888]">{s.label}</p>
            </div>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {(["memories", "entities"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-[#4FC3F7] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "memories" && (
        <>
          <div className="relative mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories..."
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) handleAskAi(); }}
              />
            </div>
            <button
              onClick={handleAskAi}
              disabled={!search.trim() || aiLoading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {aiLoading ? "Asking..." : "Ask AI"}
            </button>
          </div>
          {aiJobId && <div className="mb-4"><InlineReportPreview jobId={aiJobId} autoExpand showStatusBar /></div>}
          <div className="space-y-2">
            {loading ? (
              <div className="py-16 text-center text-[#666]">Loading...</div>
            ) : filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <Brain className="mb-3 h-10 w-10 text-[#333]" />
                <p className="text-sm text-[#666]">No memories stored yet</p>
                <p className="mt-1 text-xs text-[#555]">Agent memories from Mem0 will appear here</p>
              </div>
            ) : (
              filteredMemories.map((m) => (
                <div key={m.id} className="rounded-lg border border-[#222] bg-[#0a0a0a] p-3">
                  <p className="text-sm text-[#ddd]">{m.content}</p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-[#666]">
                    {m.agent_id && <span className="rounded bg-[#F5C542]/20 px-1.5 py-0.5 text-[#F5C542]">{m.agent_id}</span>}
                    {m.category && <span className="rounded bg-[#4FC3F7]/20 px-1.5 py-0.5 text-[#4FC3F7]">{m.category}</span>}
                    {m.confidence && <span>{Math.round(m.confidence * 100)}% confidence</span>}
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={Math.ceil(totalCount / PAGE_SIZE)}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {tab === "entities" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entities.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-16">
              <Database className="mb-3 h-10 w-10 text-[#333]" />
              <p className="text-sm text-[#666]">No entities yet</p>
            </div>
          ) : (
            entities.map((e) => (
              <div key={e.id} className="rounded-lg border border-[#222] bg-[#0a0a0a] p-3">
                <h3 className="font-medium text-white">{e.name}</h3>
                {e.entity_type && <p className="text-xs text-[#888]">{e.entity_type}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "graph" && (
        <div className="flex flex-col items-center rounded-xl border border-[#222] bg-[#0a0a0a] py-16">
          <Lightbulb className="mb-3 h-10 w-10 text-[#f59e0b]/50" />
          <p className="text-sm text-[#666]">Knowledge graph visualization coming soon</p>
          <p className="mt-1 text-xs text-[#555]">{edges.length} connections between {entities.length} entities</p>
        </div>
      )}
    </div>
  );
}
