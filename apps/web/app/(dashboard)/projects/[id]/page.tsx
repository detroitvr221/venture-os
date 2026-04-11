"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, FolderKanban, Clock, CheckCircle2, Users, FileText, ListTodo } from "lucide-react";

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

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  assigned_agent: string | null;
  due_date: string | null;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    const supabase = createClient();
    const [p, t] = await Promise.all([
      supabase.from("projects").select("*, clients(name)").eq("id", params.id).single(),
      supabase.from("tasks").select("id, title, status, priority, assigned_agent, due_date").eq("project_id", params.id).order("created_at", { ascending: false }),
    ]);
    setProject(p.data);
    setTasks(t.data || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-32"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" /></div>;
  if (!project) return <div className="py-16 text-center"><p className="text-[#666]">Project not found</p><Link href="/projects" className="mt-2 text-sm text-[#3b82f6]">Back to projects</Link></div>;

  const statusColors: Record<string, string> = {
    planning: "bg-[#f59e0b]/20 text-[#f59e0b]",
    active: "bg-[#3b82f6]/20 text-[#3b82f6]",
    on_hold: "bg-[#888]/20 text-[#888]",
    completed: "bg-[#10b981]/20 text-[#10b981]",
    cancelled: "bg-[#ef4444]/20 text-[#ef4444]",
  };

  const taskStats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "completed" || t.status === "done").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/projects" className="mb-6 flex items-center gap-2 text-sm text-[#888] hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-[#3b82f6]" />
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[project.status] || statusColors.planning}`}>{project.status}</span>
        </div>
        {project.description && <p className="mt-2 text-sm text-[#888]">{project.description}</p>}
        <div className="mt-3 flex items-center gap-4 text-xs text-[#666]">
          {project.clients?.name && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {project.clients.name}</span>}
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Created {new Date(project.created_at).toLocaleDateString()}</span>
          {project.start_date && <span>Started {new Date(project.start_date).toLocaleDateString()}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#888]">Total Tasks</p>
          <p className="mt-1 text-2xl font-bold text-white">{taskStats.total}</p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#888]">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-[#3b82f6]">{taskStats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <p className="text-xs text-[#888]">Completed</p>
          <p className="mt-1 text-2xl font-bold text-[#10b981]">{taskStats.done}</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        <div className="border-b border-[#1a1a1a] px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-[#888]"><ListTodo className="h-4 w-4" /> Tasks</h2>
        </div>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <ListTodo className="mb-2 h-8 w-8 text-[#333]" />
            <p className="text-sm text-[#666]">No tasks yet</p>
            <p className="mt-1 text-xs text-[#555]">Tasks are created by agents working on this project</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                <CheckCircle2 className={`h-4 w-4 ${task.status === "completed" || task.status === "done" ? "text-[#10b981]" : "text-[#333]"}`} />
                <div className="flex-1">
                  <p className={`text-sm ${task.status === "completed" || task.status === "done" ? "text-[#666] line-through" : "text-white"}`}>{task.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#666]">
                    {task.assigned_agent && <span className="rounded bg-[#8b5cf6]/20 px-1.5 py-0.5 text-[#8b5cf6]">{task.assigned_agent}</span>}
                    {task.priority && <span>{task.priority}</span>}
                    {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  task.status === "completed" || task.status === "done" ? "bg-[#10b981]/20 text-[#10b981]"
                  : task.status === "in_progress" ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                  : "bg-[#666]/20 text-[#666]"
                }`}>{task.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
