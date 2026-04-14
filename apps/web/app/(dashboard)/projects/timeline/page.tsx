"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { useCompany } from "@/lib/company-context";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Diamond,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  progress?: number;
}

interface Milestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string;
  status: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "#4FC3F7",
  planning: "#F5C542",
  completed: "#22c55e",
  on_hold: "#f59e0b",
  cancelled: "#ef4444",
};

const STATUS_DOTS: Record<string, string> = {
  active: "bg-[#4FC3F7]",
  planning: "bg-[#F5C542]",
  completed: "bg-[#22c55e]",
  on_hold: "bg-[#f59e0b]",
  cancelled: "bg-[#ef4444]",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[#1a1a1a]" />
        <div className="h-4 w-36 animate-pulse rounded-lg bg-[#1a1a1a]" />
      </div>
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-[250px] shrink-0 animate-pulse rounded bg-[#1a1a1a]" />
              <div className="h-10 flex-1 animate-pulse rounded bg-[#1a1a1a]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProjectTimelinePage() {
  const orgId = useOrgId();
  const { companyId } = useCompany();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tooltip, setTooltip] = useState<{
    text: string;
    subtext?: string;
    x: number;
    y: number;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDay = today.getDate();

  // ── Navigate months ──
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    const db = createClient();

    let projectQuery = db
      .from("projects")
      .select("id, name, status, start_date, end_date, created_at")
      .order("created_at", { ascending: true });
    if (companyId) projectQuery = projectQuery.eq("company_id", companyId);

    const { data: projectData } = await projectQuery;
    const loadedProjects = (projectData || []) as Project[];
    setProjects(loadedProjects);

    if (loadedProjects.length > 0) {
      const projectIds = loadedProjects.map((p) => p.id);
      const { data: milestoneData } = await db
        .from("milestones")
        .select("id, project_id, name, due_date, status")
        .in("project_id", projectIds);
      setMilestones((milestoneData || []) as Milestone[]);
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Bar calculations ──
  function getBarStyle(project: Project) {
    const dayWidth = 100 / daysInMonth;

    let startDay: number;
    let endDay: number;

    const pStart = project.start_date ? new Date(project.start_date) : null;
    const pEnd = project.end_date ? new Date(project.end_date) : null;
    const pCreated = new Date(project.created_at);

    // Determine start day within this month
    if (pStart && pStart.getFullYear() === year && pStart.getMonth() === month) {
      startDay = pStart.getDate();
    } else if (pStart && pStart < new Date(year, month, 1)) {
      startDay = 1;
    } else if (!pStart) {
      // Use created_at as fallback
      if (pCreated.getFullYear() === year && pCreated.getMonth() === month) {
        startDay = pCreated.getDate();
      } else if (pCreated < new Date(year, month, 1)) {
        startDay = 1;
      } else {
        return null; // Not in this month
      }
    } else {
      return null; // Start is after this month
    }

    // Determine end day within this month
    if (pEnd && pEnd.getFullYear() === year && pEnd.getMonth() === month) {
      endDay = pEnd.getDate();
    } else if (pEnd && pEnd > new Date(year, month, daysInMonth)) {
      endDay = daysInMonth;
    } else if (!pEnd) {
      endDay = daysInMonth;
    } else if (pEnd < new Date(year, month, 1)) {
      return null; // Ended before this month
    } else {
      endDay = daysInMonth;
    }

    if (startDay > daysInMonth || endDay < 1 || startDay > endDay) return null;

    const left = `${(startDay - 1) * dayWidth}%`;
    const width = `${(endDay - startDay + 1) * dayWidth}%`;
    const color = STATUS_COLORS[project.status] || "#888";

    return { left, width, color };
  }

  function getMilestonePosition(milestone: Milestone): number | null {
    const d = new Date(milestone.due_date);
    if (d.getFullYear() !== year || d.getMonth() !== month) return null;
    const dayWidth = 100 / daysInMonth;
    return (d.getDate() - 0.5) * dayWidth;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#4FC3F715] p-2">
            <Calendar className="h-5 w-5 text-[#4FC3F7]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Project Timeline</h1>
            <p className="mt-0.5 text-sm text-[#888]">
              {projects.length} project{projects.length !== 1 ? "s" : ""} across
              your organization
            </p>
          </div>
        </div>
        <Link
          href="/projects"
          className="rounded-lg border border-[#333] px-3 py-1.5 text-xs text-[#888] hover:text-white transition-colors"
        >
          Back to Projects
        </Link>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between rounded-xl border border-[#222] bg-[#0a0a0a] px-4 py-3">
        <button
          onClick={goToPreviousMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#333] bg-[#111] text-[#888] transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">{formatMonth(currentDate)}</h2>
          {!isCurrentMonth && (
            <button
              onClick={goToToday}
              className="rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#4FC3F7] hover:bg-[#222] transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={goToNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#333] bg-[#111] text-[#888] transition hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Timeline Grid */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-[#666]" />
          <p className="mt-3 text-sm text-[#888]">No projects to display.</p>
          <p className="mt-1 text-xs text-[#555]">Create a project to see it on the timeline.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#222] bg-[#0a0a0a]">
          <div className="flex">
            {/* Left Column: Project Names */}
            <div className="w-[250px] shrink-0 border-r border-[#1a1a1a]">
              {/* Header spacer */}
              <div className="h-[40px] border-b border-[#1a1a1a] bg-[#0a0a0a] px-4 flex items-center">
                <span className="text-[10px] font-medium text-[#666] uppercase tracking-wider">
                  Project
                </span>
              </div>
              {/* Project rows */}
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex h-[52px] items-center gap-2.5 border-b border-[#1a1a1a] px-4 cursor-pointer hover:bg-[#111] transition-colors"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[project.status] || "bg-[#888]"}`}
                  />
                  <span className="truncate text-sm text-white">{project.name}</span>
                </div>
              ))}
            </div>

            {/* Right Area: Timeline */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div className="min-w-[800px] relative">
                {/* Day headers */}
                <div className="flex h-[40px] border-b border-[#1a1a1a] bg-[#0a0a0a]">
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateObj = new Date(year, month, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const isToday = isCurrentMonth && day === todayDay;
                    return (
                      <div
                        key={day}
                        className="flex-1 flex items-center justify-center border-r border-[#1a1a1a] last:border-r-0"
                        style={{ minWidth: "26px" }}
                      >
                        <span
                          className={`text-[10px] font-medium ${
                            isToday
                              ? "text-[#ef4444] font-bold"
                              : isWeekend
                                ? "text-[#444]"
                                : "text-[#666]"
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Project rows with bars */}
                {projects.map((project) => {
                  const barStyle = getBarStyle(project);
                  const projectMilestones = milestones.filter(
                    (m) => m.project_id === project.id
                  );

                  return (
                    <div
                      key={project.id}
                      className="relative flex h-[52px] border-b border-[#1a1a1a]"
                    >
                      {/* Grid columns */}
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dateObj = new Date(year, month, day);
                        const isWeekend =
                          dateObj.getDay() === 0 || dateObj.getDay() === 6;
                        return (
                          <div
                            key={day}
                            className={`flex-1 border-r border-[#1a1a1a] last:border-r-0 ${
                              isWeekend ? "bg-[#0d0d0d]" : ""
                            }`}
                            style={{ minWidth: "26px" }}
                          />
                        );
                      })}

                      {/* Project bar */}
                      {barStyle && (
                        <div
                          className="absolute top-[14px] h-[24px] rounded-md cursor-pointer transition-all hover:brightness-125 hover:shadow-lg"
                          style={{
                            left: barStyle.left,
                            width: barStyle.width,
                            backgroundColor: barStyle.color,
                            opacity: 0.85,
                          }}
                          onClick={() => router.push(`/projects/${project.id}`)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltip({
                              text: project.name,
                              subtext: `${project.start_date || project.created_at.split("T")[0]} - ${project.end_date || "ongoing"} | ${project.status}`,
                              x: rect.left + rect.width / 2,
                              y: rect.top - 8,
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="flex h-full items-center px-2 text-[10px] font-medium text-white truncate">
                            {project.name}
                          </span>
                        </div>
                      )}

                      {/* Milestones */}
                      {projectMilestones.map((ms) => {
                        const pos = getMilestonePosition(ms);
                        if (pos === null) return null;
                        return (
                          <div
                            key={ms.id}
                            className="absolute top-[16px] z-10 cursor-pointer"
                            style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                            onMouseEnter={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              setTooltip({
                                text: ms.name,
                                subtext: `Due: ${ms.due_date} | ${ms.status}`,
                                x: rect.left + rect.width / 2,
                                y: rect.top - 8,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <Diamond
                              className="h-5 w-5 text-[#F5C542] drop-shadow-sm hover:scale-125 transition-transform"
                              fill="#F5C542"
                            />
                          </div>
                        );
                      })}

                      {/* Today marker */}
                      {isCurrentMonth && (
                        <div
                          className="absolute top-0 bottom-0 z-20 pointer-events-none"
                          style={{
                            left: `${((todayDay - 0.5) / daysInMonth) * 100}%`,
                          }}
                        >
                          <div className="h-full w-px border-l border-dashed border-[#ef4444]" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Today marker in header area */}
                {isCurrentMonth && (
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{
                      left: `${((todayDay - 0.5) / daysInMonth) * 100}%`,
                    }}
                  >
                    <div className="h-full w-px border-l border-dashed border-[#ef4444] opacity-40" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 border-t border-[#1a1a1a] px-4 py-2.5">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] capitalize text-[#888]">{status.replace("_", " ")}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Diamond className="h-3 w-3 text-[#F5C542]" fill="#F5C542" />
              <span className="text-[10px] text-[#888]">Milestone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-px border-l border-dashed border-[#ef4444]" />
              <span className="text-[10px] text-[#888]">Today</span>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip (portal-style, fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 shadow-xl">
            <p className="text-xs font-medium text-white whitespace-nowrap">{tooltip.text}</p>
            {tooltip.subtext && (
              <p className="mt-0.5 text-[10px] text-[#888] whitespace-nowrap">{tooltip.subtext}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
