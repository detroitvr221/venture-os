"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useOrgId } from "@/lib/useOrgId";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock,
  Users, FileText, CheckCircle2, Mail, X,
} from "lucide-react";

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  type: "meeting" | "deadline" | "follow_up" | "review" | "task";
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  duration_minutes: number | null;
  client_id: string | null;
  project_id: string | null;
  status: "scheduled" | "completed" | "cancelled";
  metadata: Record<string, unknown>;
  created_at: string;
};

const TYPE_CONFIG = {
  meeting: { icon: Users, color: "bg-[#4FC3F7]/20 text-[#4FC3F7]", label: "Meeting" },
  deadline: { icon: Clock, color: "bg-[#ef4444]/20 text-[#ef4444]", label: "Deadline" },
  follow_up: { icon: Mail, color: "bg-[#f59e0b]/20 text-[#f59e0b]", label: "Follow-up" },
  review: { icon: FileText, color: "bg-[#F5C542]/20 text-[#F5C542]", label: "Review" },
  task: { icon: CheckCircle2, color: "bg-[#10b981]/20 text-[#10b981]", label: "Task" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    title: "", description: "", type: "meeting" as CalEvent["type"],
    date: "", time: "09:00", duration_minutes: 30,
  });

  // Cal.com bookings
  const [bookings, setBookings] = useState<{ id: string; title: string; start: string; status: string }[]>([]);
  const orgId = useOrgId();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => { loadEvents(); loadBookings(); }, []);

  async function loadEvents() {
    const supabase = createClient();
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, status, priority, assigned_agent, due_date, created_at, metadata")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true });

    // Map tasks with due_dates to calendar events
    const mapped: CalEvent[] = (data || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      title: t.title as string,
      description: t.description as string | null,
      type: "task" as const,
      date: (t.due_date as string)?.split("T")[0] || "",
      time: null,
      duration_minutes: null,
      client_id: null,
      project_id: null,
      status: (t.status === "completed" || t.status === "done") ? "completed" as const : "scheduled" as const,
      metadata: (t.metadata as Record<string, unknown>) || {},
      created_at: t.created_at as string,
    }));

    setEvents(mapped);
    setLoading(false);
  }

  async function loadBookings() {
    try {
      const res = await fetch("/api/cal?type=bookings");
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setBookings((data.data || []).map((b: Record<string, unknown>) => ({
            id: b.uid || b.id,
            title: (b.title as string) || "Cal.com Booking",
            start: b.startTime || b.start,
            status: b.status,
          })));
        }
      }
    } catch { /* Cal.com API may not be configured */ }
  }

  async function handleAddEvent() {
    if (!newEvent.title || !newEvent.date) return;
    const supabase = createClient();
    const { error } = await supabase.from("tasks").insert({
      organization_id: orgId,
      title: newEvent.title,
      description: newEvent.description || null,
      status: "pending",
      priority: "medium",
      due_date: `${newEvent.date}T${newEvent.time || "09:00"}:00`,
      metadata: { type: newEvent.type, duration_minutes: newEvent.duration_minutes },
    });
    if (error) {
      toast.error("Failed to create event");
      return;
    }
    toast.success("Event added to calendar");
    setShowAdd(false);
    setNewEvent({ title: "", description: "", type: "meeting", date: "", time: "09:00", duration_minutes: 30 });
    loadEvents();
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: month - 1, year, isCurrentMonth: false });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month, year, isCurrentMonth: true });
    }
    // Next month days to fill the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function getDateStr(d: { day: number; month: number; year: number }) {
    return `${d.year}-${String(d.month + 1).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  }

  function getEventsForDate(dateStr: string) {
    return events.filter((e) => e.date === dateStr);
  }

  function getBookingsForDate(dateStr: string) {
    return bookings.filter((b) => (b.start as string)?.startsWith(dateStr));
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  // Upcoming events (next 7 days)
  const upcoming = events
    .filter((e) => e.date >= todayStr && e.status === "scheduled")
    .slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="mt-1 text-sm text-[#888]">Schedule, deadlines, and bookings</p>
        </div>
        <div className="flex gap-2">
          <a href="/book" target="_blank" className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] hover:bg-[#222]">
            <CalendarIcon className="h-3.5 w-3.5" /> Cal.com
          </a>
          <button onClick={() => { setShowAdd(true); setNewEvent({ ...newEvent, date: selectedDate || todayStr }); }}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-3 py-2 text-xs font-medium text-white">
            <Plus className="h-3.5 w-3.5" /> Add Event
          </button>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-xl border border-[#333] bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New Event</h3>
              <button onClick={() => setShowAdd(false)} className="text-[#666] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[#888]">Title *</label>
                <input value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Client meeting, deadline..."
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Date *</label>
                  <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Time</label>
                  <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Type</label>
                  <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as CalEvent["type"] })}
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:outline-none">
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#888]">Duration (min)</label>
                  <select value={newEvent.duration_minutes} onChange={(e) => setNewEvent({ ...newEvent, duration_minutes: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:outline-none">
                    {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888]">Description</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} rows={2} placeholder="Optional notes..."
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-[#888]">Cancel</button>
              <button onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.date}
                className="rounded-lg bg-[#4FC3F7] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">Create Event</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar Grid */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          {/* Month Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="rounded-lg p-2 text-[#888] hover:bg-[#111] hover:text-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-semibold text-white">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="rounded-lg p-2 text-[#888] hover:bg-[#111] hover:text-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-medium uppercase tracking-wider text-[#666]">{d}</div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((d, i) => {
              const dateStr = getDateStr(d);
              const dayEvents = getEventsForDate(dateStr);
              const dayBookings = getBookingsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasItems = dayEvents.length > 0 || dayBookings.length > 0;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? null : dateStr)}
                  className={`relative flex min-h-[72px] flex-col items-start rounded-lg p-1.5 text-left transition ${
                    !d.isCurrentMonth ? "text-[#444]" :
                    isSelected ? "bg-[#4FC3F7]/10 ring-1 ring-[#4FC3F7]" :
                    isToday ? "bg-[#1a1a2e]" :
                    "text-[#ccc] hover:bg-[#111]"
                  }`}
                >
                  <span className={`text-xs font-medium ${isToday ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#4FC3F7] text-white" : ""}`}>
                    {d.day}
                  </span>
                  {hasItems && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map((e) => {
                        const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.task;
                        return <div key={e.id} className={`h-1.5 w-1.5 rounded-full ${cfg.color.split(" ")[0].replace("/20", "")}`} />;
                      })}
                      {dayBookings.map((b) => <div key={b.id} className="h-1.5 w-1.5 rounded-full bg-[#F5C542]" />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
              <h3 className="mb-3 text-sm font-medium text-white">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              {selectedEvents.length === 0 && selectedBookings.length === 0 ? (
                <p className="text-xs text-[#666]">No events on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-2 rounded-lg bg-[#F5C542]/10 px-3 py-2">
                      <Users className="h-3.5 w-3.5 text-[#F5C542]" />
                      <div>
                        <p className="text-xs font-medium text-white">{b.title}</p>
                        <p className="text-[10px] text-[#888]">Cal.com booking</p>
                      </div>
                    </div>
                  ))}
                  {selectedEvents.map((e) => {
                    const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.task;
                    const Icon = cfg.icon;
                    return (
                      <div key={e.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${cfg.color.split(" ")[0]}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color.split(" ")[1]}`} />
                        <div>
                          <p className="text-xs font-medium text-white">{e.title}</p>
                          {e.time && <p className="text-[10px] text-[#888]">{e.time}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => { setShowAdd(true); setNewEvent({ ...newEvent, date: selectedDate }); }}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#333] py-2 text-xs text-[#888] hover:border-[#4FC3F7] hover:text-[#4FC3F7]">
                <Plus className="h-3 w-3" /> Add event
              </button>
            </div>
          )}

          {/* Upcoming */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#888]">Upcoming</h3>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-[#1a1a1a]" />)}</div>
            ) : upcoming.length === 0 ? (
              <p className="text-xs text-[#555]">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((e) => {
                  const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.task;
                  const Icon = cfg.icon;
                  return (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${cfg.color.split(" ")[0]}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color.split(" ")[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs text-white">{e.title}</p>
                        <p className="text-[10px] text-[#666]">{new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <h3 className="mb-3 text-sm font-medium text-[#888]">This Month</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#111] p-3">
                <p className="text-lg font-bold text-white">{events.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length}</p>
                <p className="text-[10px] text-[#888]">Events</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3">
                <p className="text-lg font-bold text-white">{bookings.filter((b) => (b.start as string)?.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length}</p>
                <p className="text-[10px] text-[#888]">Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
