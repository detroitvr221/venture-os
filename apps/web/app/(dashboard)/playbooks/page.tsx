"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Search, ChevronDown, ChevronRight } from "lucide-react";

type Playbook = {
  id: string;
  name: string;
  category: string;
  content: string;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("playbooks").select("*").order("category").order("name");
      setPlaybooks(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = playbooks.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.content.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map((p) => p.category))];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Playbooks & SOPs</h1>
        <p className="mt-1 text-sm text-[#888]">{playbooks.length} standard operating procedures</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search playbooks..."
          className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#3b82f6] focus:outline-none" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#666]">Loading...</div>
      ) : playbooks.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <BookOpen className="mb-3 h-10 w-10 text-[#333]" />
          <p className="text-sm text-[#666]">No playbooks yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#888]">{cat}</h2>
              <div className="space-y-2">
                {filtered.filter((p) => p.category === cat).map((pb) => {
                  const isOpen = activeId === pb.id;
                  return (
                    <div key={pb.id} className="rounded-xl border border-[#222] bg-[#0a0a0a]">
                      <button
                        onClick={() => setActiveId(isOpen ? null : pb.id)}
                        className="flex w-full items-center justify-between px-5 py-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-[#3b82f6]" />
                          <span className="text-sm font-medium text-white">{pb.name}</span>
                          <span className="rounded-full bg-[#222] px-2 py-0.5 text-[10px] text-[#888]">v{pb.version}</span>
                        </div>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-[#666]" /> : <ChevronRight className="h-4 w-4 text-[#666]" />}
                      </button>
                      {isOpen && (
                        <div className="border-t border-[#1a1a1a] px-5 py-4">
                          <div className="prose prose-invert max-w-none text-sm">
                            {pb.content.split("\n").map((line, i) => {
                              if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold text-white mt-0">{line.slice(2)}</h1>;
                              if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-semibold text-[#3b82f6] mt-4 mb-1">{line.slice(3)}</h2>;
                              if (line.startsWith("- ")) return <p key={i} className="text-[#ccc] ml-4">&bull; {line.slice(2)}</p>;
                              if (line.match(/^\d+\./)) return <p key={i} className="text-[#ccc] ml-2">{line}</p>;
                              if (line.trim() === "") return <br key={i} />;
                              return <p key={i} className="text-[#888]">{line}</p>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
