"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import {
  Hash,
  Users,
  Send,
  MessageSquare,
  AtSign,
  ChevronRight,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

// ── Types ──────────────────────────────────────────────────────────

type OrgMember = {
  user_id: string;
  display_name: string;
  email: string;
  avatar_letter: string;
};

type Message = {
  id: string;
  organization_id: string;
  channel: string;
  user_id: string;
  content: string;
  mentions: string[] | null;
  parent_id: string | null;
  created_at: string;
};

// ── Constants ──────────────────────────────────────────────────────

const DEFAULT_CHANNELS = [
  { name: "general", label: "#general" },
  { name: "sales", label: "#sales" },
  { name: "delivery", label: "#delivery" },
  { name: "ops", label: "#ops" },
  { name: "random", label: "#random" },
];

// ── Helpers ────────────────────────────────────────────────────────

function makeDmChannel(a: string, b: string) {
  return `dm-${[a, b].sort().join("-")}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getUnreadKey(orgId: string, channel: string) {
  return `nb-team-lastread-${orgId}-${channel}`;
}

// ── Main Component ─────────────────────────────────────────────────

export default function TeamPage() {
  const orgId = useOrgId();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState("general");
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const effectiveChannel = dmTarget
    ? makeDmChannel(currentUserId || "", dmTarget)
    : activeChannel;

  // ── Auth ──────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // ── Load members ──────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();

    supabase
      .from("organization_members")
      .select("user_id, role, employee_profiles(full_name, email)")
      .eq("organization_id", orgId)
      .then(({ data }) => {
        if (!data) return;
        const mapped: OrgMember[] = data.map((m: any) => {
          const profile = m.employee_profiles;
          const name = profile?.full_name || profile?.email || m.user_id.slice(0, 8);
          const email = profile?.email || "";
          return {
            user_id: m.user_id,
            display_name: name,
            email,
            avatar_letter: (name[0] || "?").toUpperCase(),
          };
        });
        setMembers(mapped);
      });
  }, [orgId]);

  // ── Load messages for active channel ──────────────────────────────

  const loadMessages = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("team_messages")
      .select("*")
      .eq("organization_id", orgId)
      .eq("channel", effectiveChannel)
      .is("parent_id", null)
      .order("created_at", { ascending: true })
      .limit(200);

    setMessages(data || []);
    setLoading(false);

    // Mark as read
    if (data?.length) {
      const lastTs = data[data.length - 1].created_at;
      localStorage.setItem(getUnreadKey(orgId, effectiveChannel), lastTs);
    }
  }, [orgId, effectiveChannel]);

  useEffect(() => {
    loadMessages();
    setThreadParent(null);
    setThreadMessages([]);
  }, [loadMessages]);

  // ── Scroll to bottom ──────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  // ── Realtime subscription ─────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`team-${orgId}-${effectiveChannel}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.channel !== effectiveChannel) {
            // Increment unread for other channels
            setUnreadCounts((prev) => ({
              ...prev,
              [msg.channel]: (prev[msg.channel] || 0) + 1,
            }));
            return;
          }
          if (msg.parent_id) {
            // Thread reply
            if (threadParent && msg.parent_id === threadParent.id) {
              setThreadMessages((prev) => [...prev, msg]);
            }
          } else {
            setMessages((prev) => [...prev, msg]);
            // Mark as read
            localStorage.setItem(
              getUnreadKey(orgId, effectiveChannel),
              msg.created_at
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, effectiveChannel, threadParent]);

  // ── Unread counts on load ─────────────────────────────────────────

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();

    DEFAULT_CHANNELS.forEach(async (ch) => {
      const lastRead = localStorage.getItem(getUnreadKey(orgId, ch.name));
      let query = supabase
        .from("team_messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("channel", ch.name)
        .is("parent_id", null);

      if (lastRead) {
        query = query.gt("created_at", lastRead);
      }

      const { count } = await query;
      if (count && count > 0) {
        setUnreadCounts((prev) => ({ ...prev, [ch.name]: count }));
      }
    });
  }, [orgId]);

  // ── Send message ──────────────────────────────────────────────────

  const sendMessage = async (parentId?: string) => {
    const text = parentId ? threadInput.trim() : input.trim();
    if (!text || !currentUserId || !orgId) return;

    const supabase = createClient();

    // Extract @mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentionIds: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionIds.push(match[2]);
    }
    // Clean display text
    const cleanContent = text.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, "@$1");

    await supabase.from("team_messages").insert({
      organization_id: orgId,
      channel: effectiveChannel,
      user_id: currentUserId,
      content: cleanContent,
      mentions: mentionIds.length > 0 ? mentionIds : null,
      parent_id: parentId || null,
    });

    // Agent @mention handler — detect agent mentions and fire to OpenClaw
    const agentMentions: Record<string, string> = { "@Atlas": "main", "@Mercury": "sales", "@Beacon": "seo", "@Scout": "research" };
    for (const [mention, agentId] of Object.entries(agentMentions)) {
      if (cleanContent.includes(mention)) {
        fetch("/api/openclaw/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer vos-hooks-token-2026" },
          body: JSON.stringify({
            agent_id: agentId,
            message: cleanContent,
            organization_id: orgId,
            context: { channel: effectiveChannel, source: "team_chat", respond_to_channel: true },
          }),
        });
        break;
      }
    }

    if (parentId) {
      setThreadInput("");
    } else {
      setInput("");
    }
    setShowMentions(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    parentId?: string
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(parentId);
    }
    if (e.key === "@" || (input.endsWith("@") && e.key !== "Backspace")) {
      setShowMentions(true);
      setMentionFilter("");
    }
    if (e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const handleInputChange = (value: string, isThread?: boolean) => {
    if (isThread) {
      setThreadInput(value);
    } else {
      setInput(value);
    }
    // Track @mention typing
    const atIdx = value.lastIndexOf("@");
    if (atIdx >= 0 && atIdx === value.length - 1) {
      setShowMentions(true);
      setMentionFilter("");
    } else if (atIdx >= 0 && !value.substring(atIdx).includes(" ")) {
      setShowMentions(true);
      setMentionFilter(value.substring(atIdx + 1));
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: OrgMember) => {
    const atIdx = input.lastIndexOf("@");
    const before = input.substring(0, atIdx);
    const mention = `@[${member.display_name}](${member.user_id}) `;
    setInput(before + mention);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  // ── Load thread replies ───────────────────────────────────────────

  const openThread = async (msg: Message) => {
    setThreadParent(msg);
    const supabase = createClient();
    const { data } = await supabase
      .from("team_messages")
      .select("*")
      .eq("parent_id", msg.id)
      .order("created_at", { ascending: true });
    setThreadMessages(data || []);
  };

  // ── Member lookup ─────────────────────────────────────────────────

  const getMember = (userId: string): OrgMember => {
    return (
      members.find((m) => m.user_id === userId) || {
        user_id: userId,
        display_name: userId.slice(0, 8),
        email: "",
        avatar_letter: "?",
      }
    );
  };

  // ── Switch channel ────────────────────────────────────────────────

  const switchChannel = (name: string) => {
    setActiveChannel(name);
    setDmTarget(null);
    setUnreadCounts((prev) => ({ ...prev, [name]: 0 }));
  };

  const switchDm = (userId: string) => {
    setDmTarget(userId);
    setActiveChannel("");
  };

  // ── Channel display name ──────────────────────────────────────────

  const channelDisplayName = dmTarget
    ? getMember(dmTarget).display_name
    : `#${activeChannel}`;

  const memberCount = members.length;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-[#222] bg-[#0a0a0a]">
      {/* Channel Sidebar */}
      <div className="hidden sm:flex w-[250px] shrink-0 flex-col border-r border-[#222] bg-[#0a0a0a]">
        {/* Channels header */}
        <div className="border-b border-[#222] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Channels</h2>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-0.5">
            {DEFAULT_CHANNELS.map((ch) => {
              const isActive = !dmTarget && activeChannel === ch.name;
              const unread = unreadCounts[ch.name] || 0;
              return (
                <li key={ch.name}>
                  <button
                    onClick={() => switchChannel(ch.name)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "bg-[#1a1a2a] text-[#4FC3F7]"
                        : "text-[#888] hover:bg-[#111] hover:text-[#ccc]"
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">{ch.name}</span>
                    {unread > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#4FC3F7] px-1.5 text-[10px] font-bold text-black">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Direct Messages */}
          <div className="mt-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
              Direct Messages
            </p>
            <ul className="space-y-0.5">
              {members
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => {
                  const isActive = dmTarget === m.user_id;
                  return (
                    <li key={m.user_id}>
                      <button
                        onClick={() => switchDm(m.user_id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "bg-[#1a1a2a] text-[#4FC3F7]"
                            : "text-[#888] hover:bg-[#111] hover:text-[#ccc]"
                        }`}
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a1a2a] text-[10px] font-bold text-[#4FC3F7]">
                          {m.avatar_letter}
                        </div>
                        <span className="flex-1 truncate text-left">
                          {m.display_name}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex flex-1 flex-col">
        {/* Channel Header */}
        <div className="flex items-center gap-3 border-b border-[#222] px-4 py-3">
          <h3 className="text-sm font-semibold text-white">
            {channelDisplayName}
          </h3>
          <span className="text-xs text-[#555]">
            <Users className="mr-1 inline h-3 w-3" />
            {memberCount} members
          </span>

          {/* Mobile channel selector */}
          <div className="ml-auto sm:hidden">
            <select
              value={dmTarget ? `dm-${dmTarget}` : activeChannel}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith("dm-")) {
                  switchDm(v.replace("dm-", ""));
                } else {
                  switchChannel(v);
                }
              }}
              className="rounded-lg border border-[#333] bg-[#111] px-2 py-1 text-xs text-white"
            >
              {DEFAULT_CHANNELS.map((ch) => (
                <option key={ch.name} value={ch.name}>
                  #{ch.name}
                </option>
              ))}
              {members
                .filter((m) => m.user_id !== currentUserId)
                .map((m) => (
                  <option key={m.user_id} value={`dm-${m.user_id}`}>
                    {m.display_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a]">
                    <MessageSquare className="h-7 w-7 text-[#555]" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">
                    No messages in {channelDisplayName} yet
                  </p>
                  <p className="mt-1 text-xs text-[#555]">
                    Start the conversation!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, i) => {
                    const member = getMember(msg.user_id);
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDateDivider =
                      !prevMsg ||
                      formatDate(msg.created_at) !==
                        formatDate(prevMsg.created_at);
                    const sameAuthorGroup =
                      prevMsg &&
                      prevMsg.user_id === msg.user_id &&
                      !showDateDivider &&
                      new Date(msg.created_at).getTime() -
                        new Date(prevMsg.created_at).getTime() <
                        300000;

                    return (
                      <div key={msg.id}>
                        {showDateDivider && (
                          <div className="my-4 flex items-center gap-3">
                            <div className="flex-1 border-t border-[#222]" />
                            <span className="text-[10px] font-medium text-[#555]">
                              {formatDate(msg.created_at)}
                            </span>
                            <div className="flex-1 border-t border-[#222]" />
                          </div>
                        )}

                        <div
                          className={`group flex items-start gap-3 rounded-lg px-2 py-1 hover:bg-[#111] ${
                            sameAuthorGroup ? "mt-0" : "mt-3"
                          }`}
                        >
                          {!sameAuthorGroup ? (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4FC3F7]/20 to-[#F5C542]/20 text-sm font-bold text-[#4FC3F7]">
                              {member.avatar_letter}
                            </div>
                          ) : (
                            <div className="w-9 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            {!sameAuthorGroup && (
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold text-white">
                                  {member.display_name}
                                </span>
                                <span className="text-[10px] text-[#555]">
                                  {formatTime(msg.created_at)}
                                </span>
                              </div>
                            )}
                            <p className="text-sm text-[#ccc] whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </div>
                          <button
                            onClick={() => openThread(msg)}
                            className="mt-1 hidden shrink-0 rounded p-1 text-[#444] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#222] hover:text-[#888]"
                            title="Reply in thread"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="relative border-t border-[#222] px-4 py-3">
              {/* Mention dropdown */}
              {showMentions && (
                <div className="absolute bottom-full left-4 right-4 mb-1 max-h-[200px] overflow-y-auto rounded-lg border border-[#222] bg-[#111] shadow-lg">
                  {members
                    .filter(
                      (m) =>
                        !mentionFilter ||
                        m.display_name
                          .toLowerCase()
                          .includes(mentionFilter.toLowerCase())
                    )
                    .map((m) => (
                      <button
                        key={m.user_id}
                        onClick={() => insertMention(m)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#ccc] hover:bg-[#1a1a2a]"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a2a] text-[10px] font-bold text-[#4FC3F7]">
                          {m.avatar_letter}
                        </div>
                        <span>{m.display_name}</span>
                        <span className="text-xs text-[#555]">{m.email}</span>
                      </button>
                    ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowMentions(!showMentions)}
                  className="mb-1 rounded p-1.5 text-[#555] hover:bg-[#1a1a1a] hover:text-[#888]"
                  title="Mention someone"
                >
                  <AtSign className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e)}
                  placeholder={`Message ${channelDisplayName}...`}
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-[#222] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-[#4FC3F7]/50"
                  style={{ maxHeight: "120px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = target.scrollHeight + "px";
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="mb-1 rounded-lg bg-[#4FC3F7] p-2 text-black transition-colors hover:bg-[#4FC3F7]/80 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-[10px] text-[#444]">
                Enter to send, Shift+Enter for newline
              </p>
            </div>
          </div>

          {/* Thread Sidebar */}
          {threadParent && (
            <div className="flex w-[320px] shrink-0 flex-col border-l border-[#222] bg-[#0a0a0a]">
              {/* Thread header */}
              <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
                <h4 className="text-sm font-semibold text-white">Thread</h4>
                <button
                  onClick={() => setThreadParent(null)}
                  className="rounded p-1 text-[#555] hover:bg-[#111] hover:text-[#999]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Thread parent message */}
              <div className="border-b border-[#1a1a1a] px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4FC3F7]/20 to-[#F5C542]/20 text-xs font-bold text-[#4FC3F7]">
                    {getMember(threadParent.user_id).avatar_letter}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-white">
                        {getMember(threadParent.user_id).display_name}
                      </span>
                      <span className="text-[10px] text-[#555]">
                        {formatTime(threadParent.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#ccc] whitespace-pre-wrap">
                      {threadParent.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Thread replies */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {threadMessages.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#555]">
                    No replies yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {threadMessages.map((msg) => {
                      const member = getMember(msg.user_id);
                      return (
                        <div key={msg.id} className="flex items-start gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a1a2a] text-[10px] font-bold text-[#4FC3F7]">
                            {member.avatar_letter}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-white">
                                {member.display_name}
                              </span>
                              <span className="text-[10px] text-[#555]">
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-[#ccc] whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={threadEndRef} />
                  </div>
                )}
              </div>

              {/* Thread input */}
              <div className="border-t border-[#222] px-3 py-2">
                <div className="flex items-end gap-2">
                  <textarea
                    value={threadInput}
                    onChange={(e) =>
                      handleInputChange(e.target.value, true)
                    }
                    onKeyDown={(e) => handleKeyDown(e, threadParent.id)}
                    placeholder="Reply..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-[#222] bg-[#111] px-2.5 py-1.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#4FC3F7]/50"
                    style={{ maxHeight: "80px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = target.scrollHeight + "px";
                    }}
                  />
                  <button
                    onClick={() => sendMessage(threadParent.id)}
                    disabled={!threadInput.trim()}
                    className="mb-0.5 rounded p-1.5 text-[#4FC3F7] hover:bg-[#1a1a2a] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
