"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import {
  CheckSquare,
  Plus,
  ChevronDown,
  Calendar,
  Filter,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  org_id: string | null;
  created_at: string;
  projects?: { name: string } | null;
};

type Project = {
  id: string;
  name: string;
};

type StatusColumn = "todo" | "in_progress" | "review" | "done";

// ─── Constants ──────────────────────────────────────────────────────────────

const COLUMNS: { key: StatusColumn; label: string; color: string; bgHeader: string }[] = [
  { key: "todo", label: "To Do", color: "#888", bgHeader: "bg-[#888]/10" },
  { key: "in_progress", label: "In Progress", color: "#4FC3F7", bgHeader: "bg-[#4FC3F7]/10" },
  { key: "review", label: "Review", color: "#F5C542", bgHeader: "bg-[#F5C542]/10" },
  { key: "done", label: "Done", color: "#10b981", bgHeader: "bg-[#10b981]/10" },
];

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  low: { color: "text-[#888]", bg: "bg-[#888]/20", label: "Low" },
  medium: { color: "text-[#4FC3F7]", bg: "bg-[#4FC3F7]/20", label: "Medium" },
  high: { color: "text-[#f59e0b]", bg: "bg-[#f59e0b]/20", label: "High" },
  urgent: { color: "text-[#ef4444]", bg: "bg-[#ef4444]/20", label: "Urgent" },
};

const STATUS_OPTIONS: { value: StatusColumn; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "";
  const d = new Date(dueDate);
  const today = new Date();
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `In ${diff}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // New task form
  const [newTask, setNewTask] = useState({
    title: "",
    project_id: "",
    priority: "medium",
    due_date: "",
  });

  // ── Resolve org_id ────────────────────────────────────────────────────

  useEffect(() => {
    async function resolveOrg() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership) {
        setOrgId(membership.organization_id);
      }
    }
    resolveOrg();
  }, []);

  // ── Load tasks ────────────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("*, projects(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }, [orgId]);

  const loadProjects = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name");
    setProjects(data || []);
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      loadTasks();
      loadProjects();
    }
  }, [orgId, loadTasks, loadProjects]);

  // ── Create task ───────────────────────────────────────────────────────

  async function handleCreateTask() {
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!orgId) {
      toast.error("No organization found");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("tasks").insert({
      title: newTask.title.trim(),
      status: "todo",
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      project_id: newTask.project_id || null,
      org_id: orgId,
    });

    if (error) {
      toast.error("Failed to create task");
      return;
    }

    toast.success("Task created");
    setNewTask({ title: "", project_id: "", priority: "medium", due_date: "" });
    setShowNewTask(false);
    loadTasks();
  }

  // ── Update task status ────────────────────────────────────────────────

  async function handleStatusChange(taskId: string, newStatus: StatusColumn) {
    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    setOpenDropdown(null);
    toast.success("Task updated");
  }

  // ── Click outside handler for dropdowns ───────────────────────────────

  useEffect(() => {
    function handleClickOutside() {
      setOpenDropdown(null);
    }
    if (openDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openDropdown]);

  // ── Filter tasks ──────────────────────────────────────────────────────

  const filteredTasks = tasks.filter((t) => {
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  // ── Group tasks by status ─────────────────────────────────────────────

  const tasksByStatus: Record<StatusColumn, Task[]> = {
    todo: filteredTasks.filter((t) => t.status === "todo"),
    in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
    review: filteredTasks.filter((t) => t.status === "review"),
    done: filteredTasks.filter((t) => t.status === "done"),
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Tasks</h1>
          <p className="mt-1 text-sm text-[#888]">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            {filteredTasks.filter((t) => isOverdue(t.due_date) && t.status !== "done").length > 0 && (
              <span className="ml-2 text-[#ef4444]">
                {filteredTasks.filter((t) => isOverdue(t.due_date) && t.status !== "done").length} overdue
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowNewTask(!showNewTask)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Create Task</h3>
            <button
              onClick={() => setShowNewTask(false)}
              className="text-[#666] transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-[#888]">Title *</label>
              <input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="What needs to be done?"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Project</label>
              <select
                value={newTask.project_id}
                onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Due Date</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowNewTask(false)}
              className="px-3 py-1.5 text-xs text-[#888] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              className="rounded-lg bg-[#4FC3F7] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#38B2D8]"
            >
              Create Task
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-[#666]" />
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="rounded-lg border border-[#333] bg-[#111] px-3 py-1.5 text-xs text-white focus:border-[#4FC3F7] focus:outline-none"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-lg border border-[#333] bg-[#111] px-3 py-1.5 text-xs text-white focus:border-[#4FC3F7] focus:outline-none"
        >
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        {(filterProject !== "all" || filterPriority !== "all") && (
          <button
            onClick={() => {
              setFilterProject("all");
              setFilterPriority("all");
            }}
            className="flex items-center gap-1 text-xs text-[#4FC3F7] hover:underline"
          >
            <X className="h-3 w-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <TableSkeleton />
      ) : filteredTasks.length === 0 && tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks assigned"
          description="Tasks from projects will appear here."
          actionLabel="Create Task"
          onAction={() => setShowNewTask(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const columnTasks = tasksByStatus[col.key];
            return (
              <div key={col.key} className="flex flex-col">
                {/* Column header */}
                <div
                  className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2 ${col.bgHeader}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-sm font-medium text-white">{col.label}</span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      color: col.color,
                      backgroundColor: `${col.color}20`,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-1 flex-col gap-2" role="list" aria-label={`${col.label} - ${columnTasks.length} tasks`}>
                  {columnTasks.length === 0 ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-[#222] py-8">
                      <p className="text-xs text-[#555]">No tasks</p>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                      const overdue = isOverdue(task.due_date) && task.status !== "done";

                      return (
                        <div
                          key={task.id}
                          role="listitem"
                          tabIndex={0}
                          aria-label={`${task.title}, ${priority.label} priority${overdue ? ", overdue" : ""}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              setOpenDropdown(
                                openDropdown === task.id ? null : task.id
                              );
                            } else if (e.key === "ArrowDown") {
                              e.preventDefault();
                              const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                              next?.focus();
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                              prev?.focus();
                            } else if (e.key === "Escape") {
                              setOpenDropdown(null);
                            }
                          }}
                          className={`group rounded-lg border bg-[#0a0a0a] p-3.5 transition hover:border-[#333] focus:outline-none focus:ring-1 focus:ring-[#4FC3F7] ${
                            overdue ? "border-[#ef4444]/50" : "border-[#222]"
                          }`}
                        >
                          {/* Title + priority */}
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-white leading-snug">
                              {task.title}
                            </h4>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${priority.bg} ${priority.color}`}
                            >
                              {priority.label}
                            </span>
                          </div>

                          {/* Project name */}
                          {task.projects?.name && (
                            <p className="mb-2 text-xs text-[#888]">
                              {task.projects.name}
                            </p>
                          )}

                          {/* Bottom row: due date + status changer */}
                          <div className="flex items-center justify-between">
                            {task.due_date ? (
                              <span
                                className={`flex items-center gap-1 text-[11px] ${
                                  overdue ? "text-[#ef4444]" : "text-[#666]"
                                }`}
                              >
                                {overdue ? (
                                  <AlertTriangle className="h-3 w-3" />
                                ) : (
                                  <Calendar className="h-3 w-3" />
                                )}
                                {formatDueDate(task.due_date)}
                              </span>
                            ) : (
                              <span />
                            )}

                            {/* Status dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(
                                    openDropdown === task.id ? null : task.id
                                  );
                                }}
                                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[#666] transition hover:bg-[#1a1a1a] hover:text-white"
                              >
                                Move
                                <ChevronDown className="h-3 w-3" />
                              </button>

                              {openDropdown === task.id && (
                                <div
                                  className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-[#333] bg-[#111] py-1 shadow-xl"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {STATUS_OPTIONS.filter(
                                    (opt) => opt.value !== task.status
                                  ).map((opt) => (
                                    <button
                                      key={opt.value}
                                      onClick={() =>
                                        handleStatusChange(task.id, opt.value)
                                      }
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#ccc] transition hover:bg-[#1a1a1a] hover:text-white"
                                    >
                                      <div
                                        className="h-2 w-2 rounded-full"
                                        style={{
                                          backgroundColor: COLUMNS.find(
                                            (c) => c.key === opt.value
                                          )?.color,
                                        }}
                                      />
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
