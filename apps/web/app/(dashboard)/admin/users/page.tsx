"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Shield, UserCheck, Eye, UserX, Mail } from "lucide-react";
import { inviteUser, updateUserRole, deactivateUser } from "../actions";

type Member = {
  id: string;
  user_id: string;
  role: string;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
};

const ROLES = [
  { value: "owner", label: "Owner", color: "bg-[#f59e0b]/20 text-[#f59e0b]" },
  { value: "admin", label: "Admin", color: "bg-[#ef4444]/20 text-[#ef4444]" },
  { value: "agent", label: "Manager", color: "bg-[#3b82f6]/20 text-[#3b82f6]" },
  { value: "viewer", label: "Employee", color: "bg-[#10b981]/20 text-[#10b981]" },
];

export default function UsersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("organization_members")
      .select("*")
      .order("created_at", { ascending: true });
    setMembers(data || []);
    setLoading(false);
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    await inviteUser(inviteEmail, inviteRole);
    setInviteEmail("");
    setShowInvite(false);
    setInviting(false);
    loadMembers();
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    await updateUserRole(memberId, newRole);
    loadMembers();
  }

  async function handleDeactivate(memberId: string) {
    if (!confirm("Deactivate this user? They will lose access.")) return;
    await deactivateUser(memberId);
    loadMembers();
  }

  function getRoleConfig(role: string) {
    return ROLES.find((r) => r.value === role) || { value: role, label: role, color: "bg-[#666]/20 text-[#666]" };
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">User Management</h2>
          <p className="text-xs text-[#888]">{members.length} team members</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3 py-2 text-xs font-medium text-white hover:bg-[#2563eb]">
          <Plus className="h-3.5 w-3.5" /> Invite User
        </button>
      </div>

      {showInvite && (
        <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <h3 className="mb-3 text-sm font-medium text-white">Invite New Team Member</h3>
          <div className="flex gap-3">
            <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address" type="email"
              className="flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#3b82f6] focus:outline-none" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:outline-none">
              <option value="viewer">Employee</option>
              <option value="agent">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail}
              className="rounded-lg bg-[#3b82f6] px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
              {inviting ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#666]">Loading...</div>
        ) : (
          <div className="divide-y divide-[#1a1a1a]">
            {members.map((m) => {
              const rc = getRoleConfig(m.role);
              const isPending = !m.accepted_at && m.invited_email;
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a1a1a]">
                    {isPending ? <Mail className="h-4 w-4 text-[#666]" /> : <UserCheck className="h-4 w-4 text-[#3b82f6]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">
                        {m.invited_email || m.user_id.slice(0, 8) + "..."}
                      </p>
                      {isPending && <span className="rounded-full bg-[#f59e0b]/20 px-2 py-0.5 text-[10px] text-[#f59e0b]">Pending</span>}
                    </div>
                    <p className="text-xs text-[#888]">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${rc.color}`}>{rc.label}</span>
                  <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="rounded-lg border border-[#333] bg-[#111] px-2 py-1 text-xs text-[#ccc]">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    <option value="deactivated">Deactivated</option>
                  </select>
                  {m.role !== "owner" && (
                    <button onClick={() => handleDeactivate(m.id)} className="rounded p-1 text-[#666] hover:text-[#ef4444]">
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
