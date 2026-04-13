"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
  UserPlus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  type: "job_complete" | "job_failed" | "email_received" | "approval_needed" | "task_assigned";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  href: string;
}

const TYPE_CONFIG = {
  job_complete: {
    icon: CheckCircle2,
    color: "#66BB6A",
    label: "Completed",
  },
  job_failed: {
    icon: XCircle,
    color: "#EF5350",
    label: "Failed",
  },
  email_received: {
    icon: Mail,
    color: "#4FC3F7",
    label: "Email",
  },
  approval_needed: {
    icon: Clock,
    color: "#F5C542",
    label: "Approval",
  },
  task_assigned: {
    icon: UserPlus,
    color: "#AB47BC",
    label: "Assigned",
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const notifications: NotificationItem[] = [];

    // Fetch pending approvals
    const { data: approvals } = await supabase
      .from("approvals")
      .select("id, title, description, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (approvals) {
      for (const a of approvals) {
        notifications.push({
          id: `approval-${a.id}`,
          type: "approval_needed",
          title: a.title || "Approval needed",
          description: a.description || "Review pending approval",
          timestamp: a.created_at,
          read: false,
          href: "/approvals",
        });
      }
    }

    // Fetch recent completed/failed jobs
    const { data: jobs } = await supabase
      .from("audit_jobs")
      .select("id, job_type, status, target_url, report_id, updated_at")
      .in("status", ["completed", "failed", "running"])
      .order("updated_at", { ascending: false })
      .limit(10);

    if (jobs) {
      for (const j of jobs) {
        const typeLabel = j.job_type?.replace(/_/g, " ") || "Job";
        if (j.status === "completed") {
          notifications.push({
            id: `job-${j.id}`,
            type: "job_complete",
            title: `${typeLabel} completed`,
            description: j.target_url || "View report",
            timestamp: j.updated_at,
            read: false,
            href: j.report_id ? `/reports/${j.report_id}` : "/jobs",
          });
        } else if (j.status === "failed") {
          notifications.push({
            id: `job-${j.id}`,
            type: "job_failed",
            title: `${typeLabel} failed`,
            description: j.target_url || "Check job details",
            timestamp: j.updated_at,
            read: false,
            href: "/jobs",
          });
        }
      }
    }

    // Fetch recent audit_logs for additional context
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (logs) {
      for (const log of logs) {
        // Skip if we already have enough notifications
        if (notifications.length >= 20) break;

        const meta = log.metadata as Record<string, string> | null;
        let type: NotificationItem["type"] = "task_assigned";
        let title = log.action?.replace(/_/g, " ") || "Activity";
        let description = `${log.entity_type || "item"} updated`;
        let href = "/overview";

        if (log.action?.includes("email")) {
          type = "email_received";
          title = meta?.subject || "Email received";
          description = meta?.from || "New email";
          href = "/email";
        } else if (log.action?.includes("assign") || log.action?.includes("task")) {
          type = "task_assigned";
          title = meta?.title || "Task assigned";
          description = meta?.description || `${log.entity_type} assigned`;
          href = "/tasks";
        }

        // Avoid duplicates with jobs/approvals
        const dupeId = `log-${log.id}`;
        if (!notifications.find((n) => n.id === dupeId)) {
          notifications.push({
            id: dupeId,
            type,
            title,
            description,
            timestamp: log.created_at,
            read: false,
            href,
          });
        }
      }
    }

    // Sort by timestamp descending and cap at 20
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setItems(notifications.slice(0, 20));
  }, []);

  // Load on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Load persisted read state
  useEffect(() => {
    try {
      const stored = localStorage.getItem("northbridge_read_notifs");
      if (stored) setReadIds(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("northbridge_read_notifs", JSON.stringify([...next]));
      return next;
    });
  };

  const markAllRead = () => {
    const allIds = items.map((i) => i.id);
    setReadIds(new Set(allIds));
    localStorage.setItem("northbridge_read_notifs", JSON.stringify(allIds));
  };

  const handleItemClick = (item: NotificationItem) => {
    markRead(item.id);
    setOpen(false);
    router.push(item.href);
  };

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        className="relative rounded p-1.5 text-[#888] hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF5350] text-[8px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-xl border border-[#222] bg-[#111] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#4FC3F7] hover:text-[#81D4FA] transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded p-0.5 text-[#666] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#666]">
                No notifications
              </div>
            ) : (
              items.map((item) => {
                const config = TYPE_CONFIG[item.type];
                const Icon = config.icon;
                const isRead = readIds.has(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1a1a1a] ${
                      !isRead ? "bg-[#0d1117]" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${config.color}18` }}
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: config.color }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          isRead ? "text-[#888]" : "text-white font-medium"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-xs text-[#666] truncate mt-0.5">
                        {item.description}
                      </p>
                      <p className="text-[10px] text-[#555] mt-1">
                        {timeAgo(item.timestamp)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!isRead && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#4FC3F7]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
