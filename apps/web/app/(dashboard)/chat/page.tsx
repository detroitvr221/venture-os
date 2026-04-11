"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare, Plus, Search, Pin, Archive, Send, Bot, User,
  MoreHorizontal, ChevronDown, Trash2, Edit3, Clock,
} from "lucide-react";
import { createChatThread, sendChatMessage, archiveChatThread, pinChatThread, deleteChatThread, updateChatThread } from "./actions";

type Thread = {
  id: string;
  title: string | null;
  status: string;
  is_pinned: boolean;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
};

type Message = {
  id: string;
  thread_id: string;
  role: string;
  content: string | null;
  model: string | null;
  created_at: string;
};

export default function ChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads
  const loadThreads = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_threads")
      .select("id, title, status, is_pinned, last_message_at, message_count, created_at")
      .in("status", showArchived ? ["active", "archived"] : ["active"])
      .order("is_pinned", { ascending: false })
      .order("last_message_at", { ascending: false, nullsFirst: false });
    setThreads(data || []);
    setLoading(false);
  }, [showArchived]);

  // Load messages for active thread
  const loadMessages = useCallback(async (threadId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (activeThreadId) loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  // Realtime: new messages in active thread
  useEffect(() => {
    if (!activeThreadId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${activeThreadId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `thread_id=eq.${activeThreadId}`,
      }, (payload) => {
        setMessages((prev) => {
          if (prev.find((m) => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeThreadId]);

  // Realtime: thread list updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chat:threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_threads" }, () => {
        loadThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadThreads]);

  // Create new thread
  async function handleNewThread() {
    const result = await createChatThread();
    if (result.success && result.data) {
      setActiveThreadId(result.data.id);
      loadThreads();
      inputRef.current?.focus();
    }
  }

  // Send message
  async function handleSend() {
    if (!input.trim() || !activeThreadId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic: add user message immediately
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, thread_id: activeThreadId, role: "user", content: text, model: null, created_at: new Date().toISOString() }]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const result = await sendChatMessage(activeThreadId, text);
    if (result.success) {
      // Remove temp, realtime will add the real messages
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      loadMessages(activeThreadId);
    }
    setSending(false);
    loadThreads();
  }

  // Key handler
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Thread actions
  async function handleArchive(id: string) {
    await archiveChatThread(id);
    if (activeThreadId === id) { setActiveThreadId(null); setMessages([]); }
    loadThreads();
  }
  async function handlePin(id: string, pinned: boolean) {
    await pinChatThread(id, !pinned);
    loadThreads();
  }
  async function handleDelete(id: string) {
    await deleteChatThread(id);
    if (activeThreadId === id) { setActiveThreadId(null); setMessages([]); }
    loadThreads();
  }
  async function handleRename(id: string) {
    if (!editTitle.trim()) return;
    await updateChatThread(id, { title: editTitle.trim() });
    setEditingTitle(null);
    loadThreads();
  }

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const filteredThreads = threads.filter((t) =>
    !searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedThreads = filteredThreads.filter((t) => t.is_pinned);
  const recentThreads = filteredThreads.filter((t) => !t.is_pinned && t.status === "active");
  const archivedThreads = filteredThreads.filter((t) => t.status === "archived");

  function timeAgo(d: string | null) {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 lg:-m-8">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-[#222] bg-[#0a0a0a]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Chat</h2>
          <button onClick={handleNewThread} className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563eb]">
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666]" />
            <input
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full rounded-lg border border-[#222] bg-[#111] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-[#555] focus:border-[#3b82f6] focus:outline-none"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#666]">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <MessageSquare className="mb-2 h-8 w-8 text-[#333]" />
              <p className="text-xs text-[#666]">No conversations yet</p>
              <button onClick={handleNewThread} className="mt-2 text-xs text-[#3b82f6] hover:underline">Start your first chat</button>
            </div>
          ) : (
            <>
              {/* Pinned */}
              {pinnedThreads.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-[#666]">Pinned</p>
                  {pinnedThreads.map((t) => (
                    <ThreadItem key={t.id} thread={t} active={t.id === activeThreadId}
                      onClick={() => setActiveThreadId(t.id)} onArchive={() => handleArchive(t.id)}
                      onPin={() => handlePin(t.id, t.is_pinned)} onDelete={() => handleDelete(t.id)}
                      onRename={() => { setEditingTitle(t.id); setEditTitle(t.title || ""); }}
                      timeAgo={timeAgo} editing={editingTitle === t.id} editTitle={editTitle}
                      setEditTitle={setEditTitle} onSaveTitle={() => handleRename(t.id)} />
                  ))}
                </div>
              )}
              {/* Recent */}
              {recentThreads.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-[#666]">Recent</p>
                  {recentThreads.map((t) => (
                    <ThreadItem key={t.id} thread={t} active={t.id === activeThreadId}
                      onClick={() => setActiveThreadId(t.id)} onArchive={() => handleArchive(t.id)}
                      onPin={() => handlePin(t.id, t.is_pinned)} onDelete={() => handleDelete(t.id)}
                      onRename={() => { setEditingTitle(t.id); setEditTitle(t.title || ""); }}
                      timeAgo={timeAgo} editing={editingTitle === t.id} editTitle={editTitle}
                      setEditTitle={setEditTitle} onSaveTitle={() => handleRename(t.id)} />
                  ))}
                </div>
              )}
              {/* Archived toggle */}
              {archivedThreads.length > 0 && (
                <div>
                  <button onClick={() => setShowArchived(!showArchived)} className="flex w-full items-center gap-1 px-2 py-1 text-[10px] text-[#666] hover:text-[#999]">
                    <Archive className="h-3 w-3" /> Archived ({archivedThreads.length})
                    <ChevronDown className={`ml-auto h-3 w-3 transition ${showArchived ? "rotate-180" : ""}`} />
                  </button>
                  {showArchived && archivedThreads.map((t) => (
                    <ThreadItem key={t.id} thread={t} active={t.id === activeThreadId}
                      onClick={() => setActiveThreadId(t.id)} onArchive={() => handleArchive(t.id)}
                      onPin={() => handlePin(t.id, t.is_pinned)} onDelete={() => handleDelete(t.id)}
                      onRename={() => {}} timeAgo={timeAgo} editing={false} editTitle="" setEditTitle={() => {}} onSaveTitle={() => {}} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-[#111]">
        {!activeThreadId ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6]/20 to-[#8b5cf6]/20">
              <MessageSquare className="h-8 w-8 text-[#3b82f6]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Your Workspace</h2>
            <p className="mt-1 text-sm text-[#888]">Start a conversation or select an existing thread</p>
            <button onClick={handleNewThread} className="mt-4 flex items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb]">
              <Plus className="h-4 w-4" /> New Chat
            </button>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center justify-between border-b border-[#222] bg-[#0a0a0a] px-5 py-3">
              <div>
                <h3 className="text-sm font-medium text-white">{activeThread?.title || "New Chat"}</h3>
                <p className="text-[10px] text-[#666]">{activeThread?.message_count || 0} messages &middot; Private workspace</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => activeThread && handlePin(activeThread.id, activeThread.is_pinned)}
                  className={`rounded p-1.5 ${activeThread?.is_pinned ? "text-[#f59e0b]" : "text-[#666] hover:text-white"}`}>
                  <Pin className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => activeThread && handleArchive(activeThread.id)} className="rounded p-1.5 text-[#666] hover:text-white">
                  <Archive className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#555]">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role !== "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/20">
                          <Bot className="h-4 w-4 text-[#8b5cf6]" />
                        </div>
                      )}
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-[#3b82f6] text-white"
                          : "bg-[#1a1a1a] text-[#ddd]"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`mt-1 text-[10px] ${msg.role === "user" ? "text-white/60" : "text-[#666]"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {msg.model && msg.role === "assistant" && ` · ${msg.model}`}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/20">
                          <User className="h-4 w-4 text-[#3b82f6]" />
                        </div>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8b5cf6]/20">
                        <Bot className="h-4 w-4 text-[#8b5cf6]" />
                      </div>
                      <div className="rounded-2xl bg-[#1a1a1a] px-4 py-3">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-[#666]" style={{ animationDelay: "0ms" }} />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-[#666]" style={{ animationDelay: "150ms" }} />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-[#666]" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[#222] bg-[#0a0a0a] px-5 py-3">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-[#333] bg-[#111] px-4 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#3b82f6] focus:outline-none"
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3b82f6] text-white transition hover:bg-[#2563eb] disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Thread List Item ───────────────────────────────────────────────────────

function ThreadItem({ thread, active, onClick, onArchive, onPin, onDelete, onRename, timeAgo, editing, editTitle, setEditTitle, onSaveTitle }: {
  thread: Thread; active: boolean; onClick: () => void; onArchive: () => void; onPin: () => void; onDelete: () => void;
  onRename: () => void; timeAgo: (d: string | null) => string; editing: boolean; editTitle: string;
  setEditTitle: (v: string) => void; onSaveTitle: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative mb-0.5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition cursor-pointer ${
        active ? "bg-[#1a1a2e] text-white" : "text-[#999] hover:bg-[#111] hover:text-white"
      }`}
      onClick={onClick}
    >
      <MessageSquare className={`h-4 w-4 shrink-0 ${active ? "text-[#3b82f6]" : "text-[#555]"}`} />
      <div className="min-w-0 flex-1">
        {editing ? (
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSaveTitle(); if (e.key === "Escape") setEditTitle(""); }}
            onBlur={onSaveTitle} autoFocus onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-xs text-white focus:outline-none" />
        ) : (
          <p className="truncate text-xs">{thread.title || "New Chat"}</p>
        )}
        <p className="text-[10px] text-[#666]">{timeAgo(thread.last_message_at)}</p>
      </div>
      {thread.is_pinned && <Pin className="h-3 w-3 shrink-0 text-[#f59e0b]" />}

      {/* Context menu */}
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="hidden rounded p-1 text-[#666] hover:text-white group-hover:block">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-6 z-50 w-36 rounded-lg border border-[#333] bg-[#1a1a1a] py-1 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { onRename(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#222]">
              <Edit3 className="h-3 w-3" /> Rename
            </button>
            <button onClick={() => { onPin(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#222]">
              <Pin className="h-3 w-3" /> {thread.is_pinned ? "Unpin" : "Pin"}
            </button>
            <button onClick={() => { onArchive(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#222]">
              <Archive className="h-3 w-3" /> Archive
            </button>
            <button onClick={() => { onDelete(); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[#ef4444] hover:bg-[#222]">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
