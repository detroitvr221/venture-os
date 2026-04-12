"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, MessageSquare, Shield, Activity } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, threads: 0, messages: 0, auditEntries: 0 });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [users, threads, messages, audit] = await Promise.all([
        supabase.from("organization_members").select("id", { count: "exact", head: true }),
        supabase.from("chat_threads").select("id", { count: "exact", head: true }),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        users: users.count || 0,
        threads: threads.count || 0,
        messages: messages.count || 0,
        auditEntries: audit.count || 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Team Members", value: stats.users, icon: Users, color: "text-[#4FC3F7]" },
    { label: "Chat Threads", value: stats.threads, icon: MessageSquare, color: "text-[#F5C542]" },
    { label: "Total Messages", value: stats.messages, icon: Activity, color: "text-[#10b981]" },
    { label: "Audit Events", value: stats.auditEntries, icon: Shield, color: "text-[#f59e0b]" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${c.color}`} />
                <span className="text-xs text-[#888]">{c.label}</span>
              </div>
              <p className={`mt-2 text-3xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        <h2 className="text-sm font-medium text-[#888]">Admin Capabilities</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { title: "User Management", desc: "Add, edit, and manage team member accounts and roles", href: "/admin/users" },
            { title: "Session Monitoring", desc: "View active sessions and user activity", href: "/admin/sessions" },
            { title: "Audit Log", desc: "Review all system actions and admin access history", href: "/admin/audit" },
            { title: "Chat Oversight", desc: "View employee chat threads with logged justification", href: "/admin/audit" },
          ].map((item) => (
            <a key={item.title} href={item.href} className="rounded-lg border border-[#1a1a1a] bg-[#111] p-4 transition hover:border-[#333]">
              <h3 className="text-sm font-medium text-white">{item.title}</h3>
              <p className="mt-1 text-xs text-[#888]">{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
