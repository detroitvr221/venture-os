"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FolderKanban, Plus, Search, Clock, CheckCircle2, AlertCircle, Pause } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  clients?: { name: string } | null;
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  planning: { color: "text-[#f59e0b] bg-[#f59e0b]/20", icon: Clock },
  active: { color: "text-[#3b82f6] bg-[#3b82f6]/20", icon: AlertCircle },
  on_hold: { color: "text-[#888] bg-[#888]/20", icon: Pause },
  completed: { color: "text-[#10b981] bg-[#10b981]/20", icon: CheckCircle2 },
  cancelled: { color: "text-[#ef4444] bg-[#ef4444]/20", icon: AlertCircle },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="mt-1 text-sm text-[#888]">{stats.active} active &middot; {stats.completed} completed</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: stats.total, color: "from-[#3b82f6] to-[#8b5cf6]" },
          { label: "Active", value: stats.active, color: "from-[#3b82f6] to-[#06b6d4]" },
          { label: "Completed", value: stats.completed, color: "from-[#10b981] to-[#059669]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <p className="text-xs text-[#888]">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {["all", "planning", "active", "on_hold", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === f ? "bg-[#3b82f6] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-[#666]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <FolderKanban className="mb-3 h-10 w-10 text-[#333]" />
            <p className="text-sm text-[#666]">No projects yet</p>
            <p className="mt-1 text-xs text-[#555]">Projects are created when proposals are accepted</p>
          </div>
        ) : (
          filtered.map((project) => {
            const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
            const Icon = cfg.icon;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#222] bg-[#0a0a0a] p-4 transition hover:border-[#333]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${cfg.color.split(" ")[1]}`}>
                  <Icon className={`h-5 w-5 ${cfg.color.split(" ")[0]}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{project.name}</h3>
                  <p className="text-xs text-[#888]">
                    {project.clients?.name || "No client"} &middot; {project.description?.slice(0, 80) || "No description"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${cfg.color}`}>
                  {project.status}
                </span>
                <span className="text-xs text-[#666]">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
