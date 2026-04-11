"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAgentResponse } from "@/lib/chat-agent";

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

async function getCurrentUserId() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ─── Thread Actions ─────────────────────────────────────────────────────────

export async function createChatThread(title?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      user_id: userId,
      title: title || "New Chat",
      status: "active",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/chat");
  return { success: true, data };
}

export async function updateChatThread(threadId: string, updates: { title?: string; is_pinned?: boolean; status?: string }) {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("chat_threads")
    .update(updates)
    .eq("id", threadId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/chat");
  return { success: true };
}

export async function archiveChatThread(threadId: string) {
  return updateChatThread(threadId, { status: "archived" });
}

export async function pinChatThread(threadId: string, pinned: boolean) {
  return updateChatThread(threadId, { is_pinned: pinned });
}

export async function deleteChatThread(threadId: string) {
  return updateChatThread(threadId, { status: "deleted" });
}

// ─── Message Actions ────────────────────────────────────────────────────────

export async function sendChatMessage(threadId: string, content: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const supabase = await getSupabase();

  // 1. Insert user message
  const { data: userMsg, error: userErr } = await supabase
    .from("chat_messages")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      thread_id: threadId,
      user_id: userId,
      role: "user",
      content,
    })
    .select()
    .single();

  if (userErr) return { success: false, error: userErr.message };

  // 2. Load thread context + recent messages for AI
  const [threadRes, historyRes] = await Promise.all([
    supabase.from("chat_threads").select("context, agent_config").eq("id", threadId).single(),
    supabase.from("chat_messages").select("role, content").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(20),
  ]);

  const threadContext = threadRes.data?.context || {};
  const agentConfig = threadRes.data?.agent_config || {};
  const history = (historyRes.data || []).map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant" | "system" | "tool",
    content: m.content,
  }));

  // 3. Get AI response
  const aiResponse = await getAgentResponse(history, threadContext, agentConfig);

  // 4. Insert assistant message
  const { data: assistantMsg, error: assistantErr } = await supabase
    .from("chat_messages")
    .insert({
      organization_id: DEFAULT_ORG_ID,
      thread_id: threadId,
      user_id: userId,
      role: "assistant",
      content: aiResponse.content,
      model: aiResponse.model,
      token_count: aiResponse.token_count || null,
      cost_usd: aiResponse.cost_usd || null,
    })
    .select()
    .single();

  if (assistantErr) return { success: false, error: assistantErr.message };

  // 5. Update thread stats
  await supabase
    .from("chat_threads")
    .update({
      last_message_at: new Date().toISOString(),
      message_count: (historyRes.data?.length || 0) + 2,
      title: history.length <= 2 ? content.slice(0, 60) : undefined, // Auto-title from first message
    })
    .eq("id", threadId);

  return {
    success: true,
    data: {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    },
  };
}

export async function getChatMessages(threadId: string, limit = 50, offset = 0) {
  const supabase = await getSupabase();
  const { data, error, count } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact" })
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { messages: data || [], total: count || 0, hasMore: (count || 0) > offset + limit } };
}
