"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Mail,
  Inbox,
  Send,
  Archive,
  RefreshCw,
  PenSquare,
  Search,
  Clock,
  User,
  ChevronRight,
  Star,
} from "lucide-react";

type Email = {
  id: string;
  direction: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  subject: string | null;
  body_text: string | null;
  status: string;
  received_at: string;
  read_at: string | null;
  lead_id: string | null;
  client_id: string | null;
};

type Folder = "inbox" | "sent" | "archived" | "all";

export default function EmailPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ inbox: 0, unread: 0, sent: 0, archived: 0 });

  const loadEmails = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("emails")
      .select("id, direction, from_address, from_name, to_addresses, subject, body_text, status, received_at, read_at, lead_id, client_id")
      .order("received_at", { ascending: false })
      .limit(50);

    if (folder === "inbox") {
      query = query.eq("direction", "inbound").neq("status", "archived");
    } else if (folder === "sent") {
      query = query.eq("direction", "outbound");
    } else if (folder === "archived") {
      query = query.eq("status", "archived");
    }

    if (searchQuery) {
      query = query.or(`subject.ilike.%${searchQuery}%,from_address.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%`);
    }

    const { data } = await query;
    setEmails(data || []);
    setLoading(false);
  }, [folder, searchQuery]);

  const loadStats = useCallback(async () => {
    const supabase = createClient();
    const [inbox, unread, sent, archived] = await Promise.all([
      supabase.from("emails").select("id", { count: "exact", head: true }).eq("direction", "inbound").neq("status", "archived"),
      supabase.from("emails").select("id", { count: "exact", head: true }).eq("direction", "inbound").eq("status", "received"),
      supabase.from("emails").select("id", { count: "exact", head: true }).eq("direction", "outbound"),
      supabase.from("emails").select("id", { count: "exact", head: true }).eq("status", "archived"),
    ]);
    setStats({
      inbox: inbox.count || 0,
      unread: unread.count || 0,
      sent: sent.count || 0,
      archived: archived.count || 0,
    });
  }, []);

  useEffect(() => {
    loadEmails();
    loadStats();
  }, [loadEmails, loadStats]);

  const folders: { key: Folder; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: stats.unread },
    { key: "sent", label: "Sent", icon: Send, count: stats.sent },
    { key: "archived", label: "Archived", icon: Archive, count: stats.archived },
    { key: "all", label: "All Mail", icon: Mail },
  ];

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email</h1>
          <p className="mt-1 text-sm text-[#888]">
            {stats.unread > 0 ? `${stats.unread} unread` : "All caught up"} &middot; {stats.inbox + stats.sent} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadEmails(); loadStats(); }}
            className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/email/compose"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar folders */}
        <div className="w-48 shrink-0 space-y-1">
          {folders.map((f) => {
            const Icon = f.icon;
            const isActive = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-[#1a1a2e] text-[#3b82f6]"
                    : "text-[#888] hover:bg-[#1a1a1a] hover:text-[#ccc]"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {f.label}
                </span>
                {f.count !== undefined && f.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive ? "bg-[#3b82f6]/20 text-[#3b82f6]" : "bg-[#222] text-[#666]"
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Email list */}
        <div className="flex-1">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadEmails()}
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#3b82f6] focus:outline-none"
            />
          </div>

          {/* Email list */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-5 w-5 animate-spin text-[#666]" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Mail className="mb-3 h-10 w-10 text-[#333]" />
                <p className="text-sm text-[#666]">
                  {folder === "inbox" ? "No emails yet" : `No ${folder} emails`}
                </p>
                <p className="mt-1 text-xs text-[#555]">
                  Emails to @thenorthbridgemi.org will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {emails.map((email) => {
                  const isUnread = email.status === "received" && !email.read_at;
                  const displayFrom = email.direction === "outbound"
                    ? `To: ${email.to_addresses?.[0] || "unknown"}`
                    : email.from_name || email.from_address;
                  const preview = email.body_text?.slice(0, 120) || "";

                  return (
                    <Link
                      key={email.id}
                      href={`/email/${email.id}`}
                      className={`flex items-start gap-3 px-4 py-3 transition hover:bg-[#111] ${
                        isUnread ? "bg-[#0d1117]" : ""
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        email.direction === "outbound"
                          ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                          : "bg-[#3b82f6]/20 text-[#3b82f6]"
                      }`}>
                        {email.direction === "outbound" ? (
                          <Send className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`truncate text-sm ${isUnread ? "font-semibold text-white" : "text-[#ccc]"}`}>
                            {displayFrom}
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-[#666]">
                            {timeAgo(email.received_at)}
                          </span>
                        </div>
                        <p className={`truncate text-sm ${isUnread ? "font-medium text-[#ddd]" : "text-[#999]"}`}>
                          {email.subject || "(No Subject)"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[#666]">{preview}</p>

                        {/* Tags */}
                        <div className="mt-1 flex items-center gap-2">
                          {isUnread && (
                            <span className="rounded-full bg-[#3b82f6]/20 px-2 py-0.5 text-[10px] font-medium text-[#3b82f6]">
                              New
                            </span>
                          )}
                          {email.lead_id && (
                            <span className="rounded-full bg-[#f59e0b]/20 px-2 py-0.5 text-[10px] text-[#f59e0b]">
                              Lead
                            </span>
                          )}
                          {email.client_id && (
                            <span className="rounded-full bg-[#10b981]/20 px-2 py-0.5 text-[10px] text-[#10b981]">
                              Client
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#444]" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
