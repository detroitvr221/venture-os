"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Mail, Inbox, Send, Archive, RefreshCw, PenSquare, Search,
  User, ChevronRight, Trash2, ChevronDown, Mailbox,
} from "lucide-react";
import { SkeletonList } from "@/components/Skeleton";
import { useOrgId } from "@/lib/useOrgId";

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

type FolderType = "all_inbox" | "sent" | "archived" | "all" | string; // string = mailbox name like "info", "hello"

export default function EmailPage() {
  const orgId = useOrgId();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<FolderType>("all_inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showMailboxes, setShowMailboxes] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Load all emails
  const loadEmails = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("emails")
      .select("id, direction, from_address, from_name, to_addresses, subject, body_text, status, received_at, read_at, lead_id, client_id")
      .eq("organization_id", orgId)
      .order("received_at", { ascending: false })
      .limit(200);
    setEmails(data || []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  // Extract mailbox names from to_addresses (e.g., "info@thenorthbridgemi.org" → "info")
  function getMailboxName(email: Email): string {
    if (email.direction === "outbound") return "_sent";
    const toAddr = email.to_addresses?.[0] || "";
    const match = toAddr.match(/^([^@]+)@/);
    return match ? match[1].toLowerCase() : "other";
  }

  // Build dynamic mailbox list from actual emails
  const mailboxes = (() => {
    const inboundEmails = emails.filter((e) => e.direction === "inbound" && e.status !== "archived");
    const boxes: Record<string, { count: number; unread: number }> = {};
    for (const e of inboundEmails) {
      const name = getMailboxName(e);
      if (!boxes[name]) boxes[name] = { count: 0, unread: 0 };
      boxes[name].count++;
      if (e.status === "received" && !e.read_at) boxes[name].unread++;
    }
    return Object.entries(boxes)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, stats]) => ({ name, ...stats }));
  })();

  // Stats
  const totalInbox = emails.filter((e) => e.direction === "inbound" && e.status !== "archived").length;
  const totalUnread = emails.filter((e) => e.direction === "inbound" && e.status === "received" && !e.read_at).length;
  const totalSent = emails.filter((e) => e.direction === "outbound").length;
  const totalArchived = emails.filter((e) => e.status === "archived").length;

  // Filter emails by active folder
  const filteredEmails = emails.filter((e) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (e.subject || "").toLowerCase().includes(q) ||
        (e.from_address || "").toLowerCase().includes(q) ||
        (e.body_text || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    if (activeFolder === "all_inbox") return e.direction === "inbound" && e.status !== "archived";
    if (activeFolder === "sent") return e.direction === "outbound";
    if (activeFolder === "archived") return e.status === "archived";
    if (activeFolder === "all") return true;

    // Mailbox filter (e.g., "info", "hello", "atlas")
    return e.direction === "inbound" && e.status !== "archived" && getMailboxName(e) === activeFolder;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filteredEmails.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredEmails.map((e) => e.id)));
    }
  }

  async function handleBulkDelete() {
    const supabase = createClient();
    const ids = Array.from(selected);
    const { error } = await supabase.from("emails").delete().in("id", ids);
    if (error) {
      toast.error("Failed to delete emails");
    } else {
      toast.success(`${ids.length} email${ids.length > 1 ? "s" : ""} deleted`);
      setEmails((prev) => prev.filter((e) => !selected.has(e.id)));
      setSelected(new Set());
      setSelectMode(false);
    }
  }

  // Delete email
  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("emails").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete email");
    } else {
      toast.success("Email deleted");
      setEmails((prev) => prev.filter((e) => e.id !== id));
    }
    setDeleteConfirm(null);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
  }

  function mailboxIcon(name: string) {
    const firstLetter = name.charAt(0).toUpperCase();
    return firstLetter;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email</h1>
          <p className="mt-1 text-sm text-[#888]">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"} &middot; {totalInbox + totalSent} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${selectMode ? "border-[#4FC3F7] bg-[#4FC3F7]/10 text-[#4FC3F7]" : "border-[#333] bg-[#1a1a1a] text-[#ccc] hover:bg-[#222]"}`}>
            {selectMode ? "Cancel" : "Select"}
          </button>
          <button onClick={loadEmails} className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] hover:bg-[#222]">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link href="/email/compose" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <PenSquare className="h-4 w-4" /> Compose
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 shrink-0 space-y-1">
          {/* System folders */}
          {[
            { key: "all_inbox" as FolderType, label: "All Inbox", icon: Inbox, count: totalUnread },
            { key: "sent" as FolderType, label: "Sent", icon: Send, count: totalSent },
            { key: "archived" as FolderType, label: "Archived", icon: Archive, count: totalArchived },
            { key: "all" as FolderType, label: "All Mail", icon: Mail },
          ].map((f) => {
            const Icon = f.icon;
            const isActive = activeFolder === f.key;
            return (
              <button key={f.key} onClick={() => setActiveFolder(f.key)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-[#1a1a2a] text-[#4FC3F7]" : "text-[#888] hover:bg-[#1a1a1a] hover:text-[#ccc]"}`}>
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {f.label}</span>
                {f.count !== undefined && f.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-[#4FC3F7]/20 text-[#4FC3F7]" : "bg-[#222] text-[#666]"}`}>{f.count}</span>
                )}
              </button>
            );
          })}

          {/* Mailboxes divider */}
          {mailboxes.length > 0 && (
            <>
              <button onClick={() => setShowMailboxes(!showMailboxes)}
                className="mt-4 flex w-full items-center gap-2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#555] hover:text-[#888]">
                <Mailbox className="h-3 w-3" /> Mailboxes
                <ChevronDown className={`ml-auto h-3 w-3 transition-transform ${showMailboxes ? "" : "-rotate-90"}`} />
              </button>

              {showMailboxes && mailboxes.map((mb) => {
                const isActive = activeFolder === mb.name;
                return (
                  <button key={mb.name} onClick={() => setActiveFolder(mb.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-[#1a1a2a] text-[#4FC3F7]" : "text-[#888] hover:bg-[#1a1a1a] hover:text-[#ccc]"}`}>
                    <span className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${isActive ? "bg-[#4FC3F7]/20 text-[#4FC3F7]" : "bg-[#222] text-[#666]"}`}>
                        {mailboxIcon(mb.name)}
                      </span>
                      {mb.name}
                    </span>
                    {mb.unread > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-[#4FC3F7]/20 text-[#4FC3F7]" : "bg-[#222] text-[#666]"}`}>{mb.unread}</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Email list */}
        <div className="flex-1">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
            <input type="text" placeholder="Search emails..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none" />
          </div>

          {/* Bulk action bar */}
          {selectMode && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2">
              <button onClick={selectAll} className="text-xs text-[#4FC3F7] hover:underline">
                {selected.size === filteredEmails.length ? "Deselect all" : "Select all"}
              </button>
              <span className="text-xs text-[#666]">{selected.size} selected</span>
              {selected.size > 0 && (
                <button onClick={handleBulkDelete} className="ml-auto flex items-center gap-1 rounded-lg bg-[#ef4444] px-3 py-1 text-xs font-medium text-white hover:bg-[#dc2626]">
                  <Trash2 className="h-3 w-3" /> Delete {selected.size}
                </button>
              )}
            </div>
          )}

          {/* Active mailbox header */}
          {activeFolder !== "all_inbox" && activeFolder !== "sent" && activeFolder !== "archived" && activeFolder !== "all" && (
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4FC3F7]/20 text-xs font-bold text-[#4FC3F7]">
                {mailboxIcon(activeFolder)}
              </span>
              <span className="text-sm font-medium text-white">{activeFolder}@thenorthbridgemi.org</span>
              <span className="text-xs text-[#666]">&middot; {filteredEmails.length} emails</span>
            </div>
          )}

          {/* Email list */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
            {loading ? (
              <SkeletonList rows={8} />
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Mail className="mb-3 h-10 w-10 text-[#333]" />
                <p className="text-sm text-[#666]">
                  {activeFolder === "all_inbox" ? "No emails yet" :
                   activeFolder !== "sent" && activeFolder !== "archived" && activeFolder !== "all"
                    ? `No emails for ${activeFolder}@`
                    : `No ${activeFolder} emails`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {filteredEmails.map((email) => {
                  const isUnread = email.status === "received" && !email.read_at;
                  const displayFrom = email.direction === "outbound"
                    ? `To: ${email.to_addresses?.[0] || "unknown"}`
                    : email.from_name || email.from_address;
                  const preview = email.body_text?.slice(0, 120) || "";
                  const mailbox = getMailboxName(email);

                  return (
                    <div key={email.id} className={`group flex items-start gap-3 px-4 py-3 transition hover:bg-[#111] ${isUnread ? "bg-[#0d1117]" : ""} ${selected.has(email.id) ? "bg-[#4FC3F7]/5" : ""}`}>
                      {/* Checkbox in select mode */}
                      {selectMode && (
                        <button onClick={() => toggleSelect(email.id)} className="mt-2 shrink-0" aria-label="Select email">
                          <div className={`flex h-5 w-5 items-center justify-center rounded border ${selected.has(email.id) ? "border-[#4FC3F7] bg-[#4FC3F7]" : "border-[#444] bg-transparent"}`}>
                            {selected.has(email.id) && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                          </div>
                        </button>
                      )}
                      {/* Avatar */}
                      <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        email.direction === "outbound" ? "bg-[#F5C542]/20 text-[#F5C542]" : "bg-[#4FC3F7]/20 text-[#4FC3F7]"
                      }`}>
                        {email.direction === "outbound" ? <Send className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>

                      {/* Content — clickable */}
                      <Link href={`/email/${email.id}`} className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`truncate text-sm ${isUnread ? "font-semibold text-white" : "text-[#ccc]"}`}>{displayFrom}</span>
                          <span className="ml-2 shrink-0 text-xs text-[#666]">{timeAgo(email.received_at)}</span>
                        </div>
                        <p className={`truncate text-sm ${isUnread ? "font-medium text-[#ddd]" : "text-[#999]"}`}>{email.subject || "(No Subject)"}</p>
                        <p className="mt-0.5 truncate text-xs text-[#666]">{preview}</p>
                        <div className="mt-1 flex items-center gap-2">
                          {isUnread && <span className="rounded-full bg-[#4FC3F7]/20 px-2 py-0.5 text-[10px] font-medium text-[#4FC3F7]">New</span>}
                          {activeFolder === "all_inbox" && email.direction === "inbound" && (
                            <span className="rounded-full bg-[#222] px-2 py-0.5 text-[10px] text-[#666]">{mailbox}@</span>
                          )}
                          {email.lead_id && <span className="rounded-full bg-[#f59e0b]/20 px-2 py-0.5 text-[10px] text-[#f59e0b]">Lead</span>}
                        </div>
                      </Link>

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.preventDefault(); setDeleteConfirm(email.id); }}
                        className="mt-2 hidden shrink-0 rounded p-1 text-[#444] transition hover:bg-[#222] hover:text-[#ef4444] group-hover:block"
                        aria-label="Delete email"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-modal="true" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-xl border border-[#333] bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Delete Email</h3>
            <p className="mt-1 text-sm text-[#888]">This email will be permanently deleted. This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-lg px-4 py-2 text-xs text-[#888] hover:text-white">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-lg bg-[#ef4444] px-4 py-2 text-xs font-medium text-white hover:bg-[#dc2626]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
