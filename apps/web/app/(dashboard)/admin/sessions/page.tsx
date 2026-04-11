"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Activity, Clock, MessageSquare, User } from "lucide-react";

type MemberSession = {
  id: string;
  user_id: string;
  role: string;
  invited_email: string | null;
  thread_count: number;
  message_count: number;
  last_activity: string | null;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<MemberSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get members
      const { data: members } = await supabase
        .from("organization_members")
        .select("id, user_id, role, invited_email")
        .order("created_at");

      if (!members) { setLoading(false); return; }

      // Get thread/message counts per user
      const enriched: MemberSession[] = await Promise.all(
        members.map(async (m) => {
          const [threads, messages] = await Promise.all([
            supabase.from("chat_threads").select("id", { count: "exact", head: true }).eq("user_id", m.user_id),
            supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("user_id", m.user_id),
          ]);

          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("created_at")
            .eq("user_id", m.user_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          return {
            ...m,
            thread_count: threads.count || 0,
            message_count: messages.count || 0,
            last_activity: lastMsg?.created_at || null,
          };
        })
      );

      setSessions(enriched);
      setLoading(false);
    }
    load();
  }, []);

  function timeAgo(d: string | null) {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white">Active Sessions</h2>
        <p className="text-xs text-[#888]">Monitor team member activity and workspace usage</p>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#666]">Loading...</div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            <div className="grid grid-cols-5 gap-4 px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-[#666]">
              <span>User</span>
              <span>Role</span>
              <span>Threads</span>
              <span>Messages</span>
              <span>Last Activity</span>
            </div>
            {sessions.map((s) => {
              const isOnline = s.last_activity && (Date.now() - new Date(s.last_activity).getTime()) < 15 * 60000;
              return (
                <div key={s.id} className="grid grid-cols-5 gap-4 px-5 py-3 items-center">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]">
                        <User className="h-3.5 w-3.5 text-[#888]" />
                      </div>
                      {isOnline && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-[#22c55e]" />}
                    </div>
                    <span className="text-xs text-white truncate">{s.invited_email || s.user_id.slice(0, 12)}</span>
                  </div>
                  <span className="text-xs text-[#888]">{s.role}</span>
                  <div className="flex items-center gap-1 text-xs text-[#888]">
                    <MessageSquare className="h-3 w-3" /> {s.thread_count}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#888]">
                    <Activity className="h-3 w-3" /> {s.message_count}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3 text-[#666]" />
                    <span className={isOnline ? "text-[#22c55e]" : "text-[#888]"}>
                      {isOnline ? "Online" : timeAgo(s.last_activity)}
                    </span>
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
