"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { useCompany } from "@/lib/company-context";
import { toast } from "sonner";
import { FolderKanban, Plus, Search, Clock, CheckCircle2, AlertCircle, Pause } from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";

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
  active: { color: "text-[#4FC3F7] bg-[#4FC3F7]/20", icon: AlertCircle },
  on_hold: { color: "text-[#888] bg-[#888]/20", icon: Pause },
  completed: { color: "text-[#10b981] bg-[#10b981]/20", icon: CheckCircle2 },
  cancelled: { color: "text-[#ef4444] bg-[#ef4444]/20", icon: AlertCircle },
};

type Client = {
  id: string;
  name: string;
};

export default function ProjectsPage() {
  const orgId = useOrgId();
  const { companyId } = useCompany();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", status: "planning", client_id: "" });

  useEffect(() => {
    loadProjects();
    loadClients();
  }, [orgId, companyId]);

  async function loadProjects() {
    const supabase = createClient();
    let query = supabase
      .from("projects")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    const { data } = await query;
    setProjects(data || []);
    setLoading(false);
  }

  async function loadClients() {
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name");
    setClients(data || []);
  }

  async function handleCreateProject() {
    if (!newProject.name) return;
    const supabase = createClient();

    // Look up the user's organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    if (!member?.organization_id) {
      toast.error("No organization found");
      return;
    }

    const { error } = await supabase.from("projects").insert({
      name: newProject.name,
      description: newProject.description || null,
      status: newProject.status,
      organization_id: member.organization_id,
      client_id: newProject.client_id || null,
    });
    if (error) {
      toast.error("Failed to create project");
      return;
    }
    toast.success("Project created");
    setNewProject({ name: "", description: "", status: "planning", client_id: "" });
    setShowAdd(false);
    loadProjects();
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
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <h3 className="mb-3 text-sm font-medium text-white">Create Project</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[#888]">Project Name *</label>
              <input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Website Redesign"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Client</label>
              <select
                value={newProject.client_id}
                onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Status</label>
              <select
                value={newProject.status}
                onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Description</label>
              <input
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Brief project description..."
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-[#888]">Cancel</button>
            <button onClick={handleCreateProject} className="rounded-lg bg-[#4FC3F7] px-4 py-1.5 text-xs font-medium text-white">Create</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: stats.total, color: "from-[#4FC3F7] to-[#F5C542]" },
          { label: "Active", value: stats.active, color: "from-[#4FC3F7] to-[#06b6d4]" },
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
              filter === f ? "bg-[#4FC3F7] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {loading ? (
          <SkeletonList rows={5} />
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
