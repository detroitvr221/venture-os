"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/PageSkeleton";
import {
  Clock,
  Play,
  Square,
  Plus,
  DollarSign,
  Timer,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type TimeEntry = {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  billable: boolean;
  created_at: string;
  tasks?: { title: string } | null;
  projects?: { name: string } | null;
};

type Task = { id: string; title: string; project_id: string | null };
type Project = { id: string; name: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Component ──────────────────────────────────────────────────────────────

export default function TimesheetPage() {
  const orgId = useOrgId();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerTask, setTimerTask] = useState("");
  const [timerProject, setTimerProject] = useState("");
  const [timerDescription, setTimerDescription] = useState("");
  const [timerBillable, setTimerBillable] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    task_id: "",
    project_id: "",
    description: "",
    date: toDateKey(new Date()),
    hours: "1",
    minutes: "0",
    billable: true,
  });

  // Edit entry
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState("");

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeek = getWeekRange(
    new Date(Date.now() + weekOffset * 7 * 24 * 60 * 60 * 1000)
  );

  // ── Get user ──────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // ── Timer interval ────────────────────────────────────────────────────

  useEffect(() => {
    if (timerRunning && timerStart) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStart) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerStart]);

  // ── Load data ─────────────────────────────────────────────────────────

  const loadEntries = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("time_entries")
      .select("*, tasks(title), projects(name)")
      .eq("user_id", userId)
      .gte("started_at", currentWeek.start.toISOString())
      .lte("started_at", currentWeek.end.toISOString())
      .order("started_at", { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [userId, currentWeek.start.toISOString(), currentWeek.end.toISOString()]);

  const loadTasksAndProjects = useCallback(async () => {
    if (!orgId) return;
    const supabase = createClient();
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, title, project_id")
        .eq("org_id", orgId)
        .neq("status", "done")
        .order("title"),
      supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name"),
    ]);
    setTasks(t || []);
    setProjects(p || []);
  }, [orgId]);

  useEffect(() => {
    if (userId) loadEntries();
  }, [userId, loadEntries]);

  useEffect(() => {
    loadTasksAndProjects();
  }, [loadTasksAndProjects]);

  // ── Timer actions ─────────────────────────────────────────────────────

  function handleStart() {
    setTimerStart(Date.now());
    setElapsed(0);
    setTimerRunning(true);
  }

  async function handleStop() {
    if (!timerStart || !userId) return;
    setTimerRunning(false);
    const endTime = Date.now();
    const durationMin = Math.max(1, Math.round((endTime - timerStart) / 60000));

    const supabase = createClient();
    const { error } = await supabase.from("time_entries").insert({
      user_id: userId,
      task_id: timerTask || null,
      project_id: timerProject || null,
      description: timerDescription || null,
      started_at: new Date(timerStart).toISOString(),
      ended_at: new Date(endTime).toISOString(),
      duration_minutes: durationMin,
      billable: timerBillable,
      org_id: orgId,
    });

    if (error) {
      toast.error("Failed to save time entry");
      return;
    }

    toast.success(`Tracked ${formatDuration(durationMin)}`);
    setTimerStart(null);
    setElapsed(0);
    setTimerDescription("");
    loadEntries();
  }

  // ── Manual entry ──────────────────────────────────────────────────────

  async function handleManualEntry() {
    if (!userId) return;
    const totalMin =
      parseInt(manualForm.hours || "0") * 60 +
      parseInt(manualForm.minutes || "0");
    if (totalMin <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    const startDate = new Date(manualForm.date + "T09:00:00");
    const endDate = new Date(startDate.getTime() + totalMin * 60000);

    const supabase = createClient();
    const { error } = await supabase.from("time_entries").insert({
      user_id: userId,
      task_id: manualForm.task_id || null,
      project_id: manualForm.project_id || null,
      description: manualForm.description || null,
      started_at: startDate.toISOString(),
      ended_at: endDate.toISOString(),
      duration_minutes: totalMin,
      billable: manualForm.billable,
      org_id: orgId,
    });

    if (error) {
      toast.error("Failed to add entry");
      return;
    }

    toast.success("Time entry added");
    setShowManual(false);
    setManualForm({
      task_id: "",
      project_id: "",
      description: "",
      date: toDateKey(new Date()),
      hours: "1",
      minutes: "0",
      billable: true,
    });
    loadEntries();
  }

  // ── Edit / Delete ─────────────────────────────────────────────────────

  async function handleUpdateDuration(entryId: string) {
    const mins = parseInt(editMinutes);
    if (isNaN(mins) || mins <= 0) {
      toast.error("Invalid duration");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("time_entries")
      .update({ duration_minutes: mins })
      .eq("id", entryId);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    toast.success("Duration updated");
    setEditingId(null);
    loadEntries();
  }

  async function handleDelete(entryId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", entryId);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Entry deleted");
    loadEntries();
  }

  // ── Computed stats ────────────────────────────────────────────────────

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;

  // Group entries by day of week
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeek.start);
    d.setDate(d.getDate() + i);
    weekDates.push(toDateKey(d));
  }

  const entriesByDay: Record<string, TimeEntry[]> = {};
  weekDates.forEach((dk) => (entriesByDay[dk] = []));
  entries.forEach((e) => {
    const dk = toDateKey(new Date(e.started_at));
    if (entriesByDay[dk]) entriesByDay[dk].push(e);
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Clock className="h-6 w-6 text-[#4FC3F7]" />
            Time Tracking
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            This week: <span className="text-white font-medium">{(totalMinutes / 60).toFixed(1)}h</span>
            <span className="mx-2 text-[#333]">|</span>
            <DollarSign className="inline h-3 w-3 text-[#10b981]" />
            <span className="text-[#10b981]">{(billableMinutes / 60).toFixed(1)}h billable</span>
            <span className="mx-2 text-[#333]">|</span>
            <span className="text-[#666]">{(nonBillableMinutes / 60).toFixed(1)}h non-billable</span>
          </p>
        </div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Manual Entry
        </button>
      </div>

      {/* Active Timer Section */}
      <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="h-4 w-4 text-[#4FC3F7]" />
          <h3 className="text-sm font-medium text-white">Timer</h3>
          {timerRunning && (
            <span className="ml-2 h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
          )}
        </div>

        {/* Timer display */}
        <div className="mb-4 text-center">
          <span
            className={`font-mono text-5xl font-bold tracking-wider ${
              timerRunning ? "text-[#10b981]" : "text-[#666]"
            }`}
          >
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Timer controls */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-[#888]">Project</label>
            <select
              value={timerProject}
              onChange={(e) => setTimerProject(e.target.value)}
              disabled={timerRunning}
              className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none disabled:opacity-50"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#888]">Task</label>
            <select
              value={timerTask}
              onChange={(e) => setTimerTask(e.target.value)}
              disabled={timerRunning}
              className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none disabled:opacity-50"
            >
              <option value="">No task</option>
              {tasks
                .filter((t) => !timerProject || t.project_id === timerProject)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#888]">Description</label>
            <input
              value={timerDescription}
              onChange={(e) => setTimerDescription(e.target.value)}
              placeholder="What are you working on?"
              className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#888]">Billable</label>
            <button
              onClick={() => setTimerBillable(!timerBillable)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                timerBillable
                  ? "border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]"
                  : "border-[#333] bg-[#111] text-[#666]"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              {timerBillable ? "Billable" : "Non-billable"}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#888]">&nbsp;</label>
            {!timerRunning ? (
              <button
                onClick={handleStart}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ef4444] to-[#dc2626] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Entry Form */}
      {showManual && (
        <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Add Manual Entry</h3>
            <button
              onClick={() => setShowManual(false)}
              className="text-[#666] transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[#888]">Project</label>
              <select
                value={manualForm.project_id}
                onChange={(e) =>
                  setManualForm({ ...manualForm, project_id: e.target.value })
                }
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Task</label>
              <select
                value={manualForm.task_id}
                onChange={(e) =>
                  setManualForm({ ...manualForm, task_id: e.target.value })
                }
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              >
                <option value="">No task</option>
                {tasks
                  .filter(
                    (t) =>
                      !manualForm.project_id ||
                      t.project_id === manualForm.project_id
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Description</label>
              <input
                value={manualForm.description}
                onChange={(e) =>
                  setManualForm({ ...manualForm, description: e.target.value })
                }
                placeholder="What did you work on?"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#888]">Date</label>
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) =>
                  setManualForm({ ...manualForm, date: e.target.value })
                }
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-[#888]">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={manualForm.hours}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, hours: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888]">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={manualForm.minutes}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, minutes: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() =>
                  setManualForm({
                    ...manualForm,
                    billable: !manualForm.billable,
                  })
                }
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  manualForm.billable
                    ? "border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]"
                    : "border-[#333] bg-[#111] text-[#666]"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                {manualForm.billable ? "Billable" : "Non-billable"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowManual(false)}
              className="px-3 py-1.5 text-xs text-[#888] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleManualEntry}
              className="rounded-lg bg-[#4FC3F7] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#38B2D8]"
            >
              Add Entry
            </button>
          </div>
        </div>
      )}

      {/* Weekly Timesheet */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {/* Week header */}
        <div className="flex items-center justify-between border-b border-[#222] px-5 py-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="rounded-lg px-2 py-1 text-[#888] transition hover:bg-[#1a1a1a] hover:text-white"
          >
            &larr;
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-white">
              {currentWeek.start.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              &ndash;{" "}
              {currentWeek.end.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="mt-0.5 text-[10px] text-[#4FC3F7] hover:underline"
              >
                Back to this week
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="rounded-lg px-2 py-1 text-[#888] transition hover:bg-[#1a1a1a] hover:text-white"
          >
            &rarr;
          </button>
        </div>

        {loading ? (
          <div className="p-4">
            <TableSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-0 divide-y divide-[#1a1a1a] lg:grid-cols-7 lg:divide-x lg:divide-y-0">
            {weekDates.map((dateKey, i) => {
              const dayEntries = entriesByDay[dateKey] || [];
              const dayTotal = dayEntries.reduce(
                (sum, e) => sum + (e.duration_minutes || 0),
                0
              );
              const isToday = dateKey === toDateKey(new Date());
              const dateObj = new Date(dateKey + "T12:00:00");

              return (
                <div
                  key={dateKey}
                  className={`min-h-[160px] p-3 ${
                    isToday ? "bg-[#4FC3F7]/5" : ""
                  }`}
                >
                  {/* Day header */}
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          isToday ? "text-[#4FC3F7]" : "text-[#888]"
                        }`}
                      >
                        {DAY_LABELS[i]}
                      </p>
                      <p className="text-[10px] text-[#555]">
                        {dateObj.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        dayTotal > 0
                          ? "bg-[#4FC3F7]/10 text-[#4FC3F7]"
                          : "text-[#555]"
                      }`}
                    >
                      {dayTotal > 0 ? formatDuration(dayTotal) : "0h"}
                    </span>
                  </div>

                  {/* Entries */}
                  <div className="space-y-1.5">
                    {dayEntries.length === 0 ? (
                      <p className="text-center text-[10px] text-[#444] py-4">
                        No entries
                      </p>
                    ) : (
                      dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="group rounded-lg border border-[#222] bg-[#111] p-2 transition hover:border-[#333]"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-[11px] font-medium text-white">
                                {entry.tasks?.title ||
                                  entry.description ||
                                  "Untitled"}
                              </p>
                              {entry.projects?.name && (
                                <p className="truncate text-[10px] text-[#666]">
                                  {entry.projects.name}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  setEditingId(entry.id);
                                  setEditMinutes(
                                    String(entry.duration_minutes)
                                  );
                                }}
                                className="p-0.5 text-[#666] hover:text-[#4FC3F7]"
                              >
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-0.5 text-[#666] hover:text-[#ef4444]"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            {editingId === entry.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editMinutes}
                                  onChange={(e) =>
                                    setEditMinutes(e.target.value)
                                  }
                                  className="w-14 rounded border border-[#333] bg-[#0a0a0a] px-1.5 py-0.5 text-[10px] text-white focus:border-[#4FC3F7] focus:outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleUpdateDuration(entry.id);
                                    if (e.key === "Escape")
                                      setEditingId(null);
                                  }}
                                  autoFocus
                                />
                                <span className="text-[9px] text-[#666]">
                                  min
                                </span>
                                <button
                                  onClick={() =>
                                    handleUpdateDuration(entry.id)
                                  }
                                  className="p-0.5 text-[#10b981]"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-0.5 text-[#666]"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#888]">
                                {formatDuration(entry.duration_minutes)}
                              </span>
                            )}
                            {entry.billable && (
                              <span className="rounded-full bg-[#10b981]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#10b981]">
                                $
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
