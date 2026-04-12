"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, RefreshCw, Filter, Shield, Eye } from "lucide-react";

type AuditEntry = {
  id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
};

type AdminAccess = {
  id: string;
  admin_user_id: string;
  thread_id: string;
  thread_owner_id: string;
  access_type: string;
  reason: string | null;
  created_at: string;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [adminAccess, setAdminAccess] = useState<AdminAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"general" | "chat_access">("general");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [auditRes, accessRes] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("chat_admin_access_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setLogs(auditRes.data || []);
    setAdminAccess(accessRes.data || []);
    setLoading(false);
  }

  const actionColors: Record<string, string> = {
    create: "bg-[#10b981]/20 text-[#10b981]",
    update: "bg-[#4FC3F7]/20 text-[#4FC3F7]",
    delete: "bg-[#ef4444]/20 text-[#ef4444]",
    invite: "bg-[#F5C542]/20 text-[#F5C542]",
    update_role: "bg-[#f59e0b]/20 text-[#f59e0b]",
    admin_view_chat: "bg-[#ef4444]/20 text-[#ef4444]",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Audit Log</h2>
          <p className="text-xs text-[#888]">Track all system actions and admin access</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#222]">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("general")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${tab === "general" ? "bg-[#4FC3F7] text-white" : "bg-[#1a1a1a] text-[#888]"}`}>
          <FileText className="h-3.5 w-3.5" /> General ({logs.length})
        </button>
        <button onClick={() => setTab("chat_access")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${tab === "chat_access" ? "bg-[#ef4444] text-white" : "bg-[#1a1a1a] text-[#888]"}`}>
          <Eye className="h-3.5 w-3.5" /> Chat Access ({adminAccess.length})
        </button>
      </div>

      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#666]">Loading...</div>
        ) : tab === "general" ? (
          logs.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Shield className="mb-2 h-8 w-8 text-[#333]" />
              <p className="text-xs text-[#666]">No audit events yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${actionColors[log.action] || "bg-[#666]/20 text-[#666]"}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-[#ccc]">{log.resource_type}</span>
                    <span className="text-[10px] text-[#666]">{log.resource_id?.slice(0, 8)}</span>
                    <span className="ml-auto text-[10px] text-[#666]">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-[#888]">
                    <span>by {log.actor_type}:{log.actor_id?.slice(0, 8)}</span>
                    {log.changes && <span className="text-[#555]">| {JSON.stringify(log.changes).slice(0, 80)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          adminAccess.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Eye className="mb-2 h-8 w-8 text-[#333]" />
              <p className="text-xs text-[#666]">No admin chat access events</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {adminAccess.map((a) => (
                <div key={a.id} className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[#ef4444]/20 px-2 py-0.5 text-[10px] font-medium text-[#ef4444]">{a.access_type}</span>
                    <span className="text-xs text-[#ccc]">Admin {a.admin_user_id.slice(0, 8)} viewed thread {a.thread_id.slice(0, 8)}</span>
                    <span className="ml-auto text-[10px] text-[#666]">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  {a.reason && <p className="mt-1 text-[10px] text-[#888]">Reason: {a.reason}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
