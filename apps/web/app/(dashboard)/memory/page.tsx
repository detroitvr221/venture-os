"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Brain, Search, RefreshCw, Database, Link2, Lightbulb } from "lucide-react";

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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [entities, setEntities] = useState<MemoryEntity[]>([]);
  const [edges, setEdges] = useState<{ id: string; from_entity: string; to_entity: string; relation: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"memories" | "entities" | "graph">("memories");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [mem, ent, edg] = await Promise.all([
      supabase.from("memories").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("memory_entities").select("*").order("name").limit(100),
      supabase.from("memory_edges").select("id, from_entity, to_entity, relation").limit(100),
    ]);
    setMemories(mem.data || []);
    setEntities(ent.data || []);
    setEdges(edg.data || []);
    setLoading(false);
  }

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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories..."
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none"
            />
          </div>
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
