"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const DEFAULT_ORG_ID = process.env.DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => { cookieStore.set(name, value, options); });
        },
      },
    }
  );
}

async function requireAdmin() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", DEFAULT_ORG_ID)
    .single();

  if (!member || !["owner", "admin"].includes(member.role)) {
    throw new Error("Not authorized — admin access required");
  }
  return user;
}

// ─── User Management ────────────────────────────────────────────────────────

export async function listOrgMembers() {
  await requireAdmin();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

export async function inviteUser(email: string, role: string) {
  const admin = await requireAdmin();
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      user_id: "00000000-0000-0000-0000-000000000000", // Placeholder until user signs up
      role: role || "viewer",
      invited_email: email,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Audit log
  await supabase.from("audit_logs").insert({
    organization_id: DEFAULT_ORG_ID,
    actor_type: "user",
    actor_id: admin.id,
    action: "invite",
    resource_type: "organization_member",
    resource_id: data.id,
    changes: { email, role },
  });

  revalidatePath("/admin/users");
  return { success: true, data };
}

export async function updateUserRole(memberId: string, newRole: string) {
  const admin = await requireAdmin();
  const supabase = await getSupabase();

  const { data: member } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .single();

  const { error } = await supabase
    .from("organization_members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };

  await supabase.from("audit_logs").insert({
    organization_id: DEFAULT_ORG_ID,
    actor_type: "user",
    actor_id: admin.id,
    action: "update_role",
    resource_type: "organization_member",
    resource_id: memberId,
    changes: { old_role: member?.role, new_role: newRole },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deactivateUser(memberId: string) {
  return updateUserRole(memberId, "deactivated");
}

// ─── Chat Admin Access ───────────────────────────────────────��──────────────

export async function adminViewUserChat(threadId: string, reason: string) {
  const admin = await requireAdmin();
  const supabase = await getSupabase();

  // Get thread owner
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("user_id, organization_id")
    .eq("id", threadId)
    .single();

  if (!thread) return { success: false, error: "Thread not found" };

  // Log the access
  await supabase.from("chat_admin_access_log").insert({
    organization_id: DEFAULT_ORG_ID,
    admin_user_id: admin.id,
    thread_id: threadId,
    thread_owner_id: thread.user_id,
    access_type: "view",
    reason,
  });

  // Also log to general audit
  await supabase.from("audit_logs").insert({
    organization_id: DEFAULT_ORG_ID,
    actor_type: "user",
    actor_id: admin.id,
    action: "admin_view_chat",
    resource_type: "chat_thread",
    resource_id: threadId,
    changes: { thread_owner: thread.user_id, reason },
  });

  // Get messages
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return { success: true, data: messages || [] };
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export async function getAuditLog(limit = 50, offset = 0) {
  await requireAdmin();
  const supabase = await getSupabase();

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { logs: data || [], total: count || 0 } };
}

export async function getChatAdminLog(limit = 50) {
  await requireAdmin();
  const supabase = await getSupabase();

  const { data } = await supabase
    .from("chat_admin_access_log")
    .select("*")
    .eq("organization_id", DEFAULT_ORG_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { success: true, data: data || [] };
}
