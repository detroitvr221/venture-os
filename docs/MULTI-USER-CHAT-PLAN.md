# Multi-User Private Chat Workspaces — Implementation Plan

## Context

Northbridge Digital needs multiple employees to log in and each get their own private chat workspace with isolated conversations, context, and memory. Currently: Supabase Auth exists (email/password), `organization_members` table has user_id + role, but there are NO chat tables, NO message storage, NO per-user data isolation, and NO admin management screens. All dashboard pages use a hardcoded org ID.

This plan adds: private chat threads per user, real-time messaging, admin user/session management, role-based access, audit logging, and file attachments — all enforced by Supabase RLS.

---

## Phase 1: Database Schema (4 new tables + RLS + indexes)

**Migration via Supabase MCP** — Create tables:
- `chat_threads` — user's conversation threads (user_id, title, status, is_pinned, agent_config, context, last_message_at, message_count)
- `chat_messages` — messages in threads (thread_id, user_id, role, content, tool_calls, model, cost_usd)
- `chat_attachments` — files per message/thread (thread_id, user_id, file_name, file_size, mime_type, storage_path)
- `chat_admin_access_log` — audit trail for admin viewing employee chats (admin_user_id, thread_id, thread_owner_id, access_type, reason)

**RLS Policies:**
- Users see only their own threads/messages/attachments (WHERE user_id = auth.uid())
- Admins/owners can read any thread in their org (for audited support access)
- No UPDATE/DELETE on messages (immutable audit trail)
- Anon role gets org-scoped access (matching existing pattern)

**Indexes:** All foreign keys indexed, plus composite indexes for thread listing (user_id, last_message_at DESC) and message pagination (thread_id, created_at ASC).

---

## Phase 2: Chat Server Actions + AI Integration

**New file: `apps/web/app/(dashboard)/chat/actions.ts`**
- `createChatThread(title?)` — creates thread owned by current user
- `sendChatMessage(threadId, content)` — inserts user message, calls OpenClaw/AI, inserts assistant response, updates thread stats
- `archiveChatThread(threadId)` — sets status = 'archived'
- `pinChatThread(threadId)` — toggles is_pinned
- `renameChatThread(threadId, title)` — updates title
- `getChatMessages(threadId, cursor?, limit?)` — paginated message history

**AI Integration: `apps/web/lib/chat-agent.ts`**
- Wraps OpenClaw trigger API for chat context
- Loads thread's `context` + `agent_config` JSONB
- Sends last N messages as conversation history
- Returns assistant response
- Per-thread context isolation (no bleed between users/threads)

---

## Phase 3: Chat UI (main feature)

**New route: `/chat`** — Two-column layout inside existing dashboard shell

Left sidebar (280px):
- "New Chat" button
- Search input
- Pinned threads section
- Recent threads (sorted by last_message_at)
- Archived threads (collapsed)

Right panel (flex-1):
- ChatHeader: thread title (editable), pin/archive buttons
- ChatThread: scrollable message list with auto-scroll, load-more pagination
- ChatInput: textarea (Enter to send, Shift+Enter for newline), file upload button

**Files to create:**
- `apps/web/app/(dashboard)/chat/page.tsx` — main chat page
- `apps/web/app/(dashboard)/chat/[threadId]/page.tsx` — deep link to thread (optional, can use query params instead)

**Realtime:** Supabase Realtime subscriptions for:
- New messages in active thread (INSERT on chat_messages WHERE thread_id = X)
- Thread list updates (changes on chat_threads WHERE user_id = current)

---

## Phase 4: Admin Dashboard

**New routes (admin-only, role-guarded):**
- `/admin` — Admin overview (user count, active sessions, total threads)
- `/admin/users` — User management (list, invite, edit role, deactivate)
- `/admin/sessions` — Active sessions (who's online, last activity, force logout)
- `/admin/audit` — Audit log viewer (filterable by user, action, date)

**Admin layout:** `apps/web/app/(dashboard)/admin/layout.tsx` — checks user role is owner/admin, redirects otherwise

**Admin actions:** `apps/web/app/(dashboard)/admin/actions.ts`
- `listOrgMembers()`, `inviteUser(email, role)`, `updateUserRole(memberId, role)`, `deactivateUser(memberId)`
- `viewUserChat(threadId, reason)` — reads thread + logs access to chat_admin_access_log
- `getAuditLog(filters)` — paginated audit log query

---

## Phase 5: Navigation + Layout Updates

**Modify: `apps/web/app/(dashboard)/layout.tsx`**
- Add "Chat" nav item (MessageSquare icon) — always visible
- Add "Admin" nav item (ShieldCheck icon) — only visible if user role is owner/admin
- Fetch user's org role in useEffect to control admin visibility

---

## Phase 6: Security Hardening

- All chat queries use user's Supabase client (respects RLS via auth.uid())
- Admin audit: every admin access to employee threads logged with reason
- No client-side-only permission checks — all enforced by RLS + server actions
- File uploads scoped to user folder: `chat-attachments/{user_id}/{thread_id}/`

---

## Files Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | Migration (via Supabase MCP) | — |
| 2 | `chat/actions.ts`, `lib/chat-agent.ts` | — |
| 3 | `chat/page.tsx`, `chat/[threadId]/page.tsx` | — |
| 4 | `admin/layout.tsx`, `admin/page.tsx`, `admin/users/page.tsx`, `admin/sessions/page.tsx`, `admin/audit/page.tsx`, `admin/actions.ts` | — |
| 5 | — | `(dashboard)/layout.tsx` |
| **Total** | ~10 new files | 1 modified file |

## Verification

1. Log in as user A → see only user A's threads
2. Log in as user B → see only user B's threads, zero overlap
3. Send message → appears in real-time
4. Admin views user A's thread → logged in chat_admin_access_log
5. Non-admin tries `/admin` → redirected
6. Supabase RLS test: direct API call with user A's token cannot read user B's messages
