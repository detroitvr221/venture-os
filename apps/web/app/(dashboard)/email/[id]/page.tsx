"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Reply,
  Forward,
  Archive,
  Trash2,
  Clock,
  User,
  Send,
  Paperclip,
  Mail,
  ExternalLink,
} from "lucide-react";

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');
}

type EmailDetail = {
  id: string;
  direction: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  status: string;
  received_at: string;
  read_at: string | null;
  message_id: string | null;
  attachments: { filename: string; contentType: string; size: number }[];
  lead_id: string | null;
  client_id: string | null;
  agent_id: string | null;
  resend_id: string | null;
  thread_id: string | null;
};

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [threadEmails, setThreadEmails] = useState<EmailDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadEmail();
  }, [params.id]);

  async function loadEmail() {
    const supabase = createClient();
    const { data } = await supabase
      .from("emails")
      .select("*")
      .eq("id", params.id)
      .single();

    if (data) {
      setEmail(data);
      // Mark as read
      if (data.status === "received" && !data.read_at) {
        await supabase
          .from("emails")
          .update({ status: "read", read_at: new Date().toISOString() })
          .eq("id", data.id);
      }
      // Load thread if exists
      if (data.thread_id) {
        const { data: thread } = await supabase
          .from("emails")
          .select("*")
          .eq("thread_id", data.thread_id)
          .neq("id", data.id)
          .order("received_at", { ascending: true });
        setThreadEmails(thread || []);
      }
    }
    setLoading(false);
  }

  async function handleReply() {
    if (!email || !replyText.trim()) return;
    setSending(true);

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email.direction === "inbound" ? email.from_address : email.to_addresses,
          subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
          text: replyText,
          inReplyTo: email.message_id,
        }),
      });

      if (res.ok) {
        setReplying(false);
        setReplyText("");
        loadEmail(); // Reload to see thread
      }
    } catch (err) {
      console.error("Reply failed:", err);
    }
    setSending(false);
  }

  async function handleArchive() {
    if (!email) return;
    const supabase = createClient();
    await supabase.from("emails").update({ status: "archived" }).eq("id", email.id);
    router.push("/email");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4FC3F7] border-t-transparent" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="py-16 text-center">
        <Mail className="mx-auto mb-3 h-10 w-10 text-[#333]" />
        <p className="text-[#666]">Email not found</p>
        <Link href="/email" className="mt-2 text-sm text-[#4FC3F7] hover:underline">
          Back to inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/email"
          className="flex items-center gap-2 text-sm text-[#888] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReplying(!replying)}
            className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#ccc] transition hover:bg-[#222]"
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
          <button
            onClick={handleArchive}
            className="flex items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#ccc] transition hover:bg-[#222]"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      </div>

      {/* Email */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {/* Subject */}
        <div className="border-b border-[#1a1a1a] px-6 py-4">
          <h1 className="text-xl font-semibold text-white">
            {email.subject || "(No Subject)"}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-[#666]">
            <span className={`rounded-full px-2 py-0.5 ${
              email.direction === "inbound"
                ? "bg-[#4FC3F7]/20 text-[#4FC3F7]"
                : "bg-[#F5C542]/20 text-[#F5C542]"
            }`}>
              {email.direction === "inbound" ? "Received" : "Sent"}
            </span>
            {email.status === "received" && (
              <span className="rounded-full bg-[#f59e0b]/20 px-2 py-0.5 text-[#f59e0b]">Unread</span>
            )}
            {email.lead_id && (
              <Link href={`/leads/${email.lead_id}`} className="flex items-center gap-1 text-[#f59e0b] hover:underline">
                Lead <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            {email.agent_id && (
              <span className="text-[#10b981]">via {email.agent_id}</span>
            )}
          </div>
        </div>

        {/* From/To */}
        <div className="border-b border-[#1a1a1a] px-6 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-12 text-[#666]">From:</span>
            <span className="text-white">
              {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-12 text-[#666]">To:</span>
            <span className="text-[#ccc]">{email.to_addresses?.join(", ")}</span>
          </div>
          {email.cc_addresses?.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="w-12 text-[#666]">CC:</span>
              <span className="text-[#ccc]">{email.cc_addresses.join(", ")}</span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="w-12 text-[#666]">Date:</span>
            <span className="text-[#999]">
              {new Date(email.received_at).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {email.body_html ? (
            <div
              className="prose prose-invert max-w-none text-sm text-[#ddd]"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body_html) }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-[#ddd] font-sans">
              {email.body_text || "(No content)"}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="border-t border-[#1a1a1a] px-6 py-3">
            <p className="mb-2 text-xs font-medium text-[#666]">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#111] px-3 py-1.5 text-xs text-[#ccc]"
                >
                  <Paperclip className="h-3 w-3" />
                  {att.filename}
                  {att.size && (
                    <span className="text-[#666]">
                      ({Math.round(att.size / 1024)}KB)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thread */}
      {threadEmails.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-[#666]">Thread ({threadEmails.length + 1} messages)</p>
          {threadEmails.map((te) => (
            <Link
              key={te.id}
              href={`/email/${te.id}`}
              className="block rounded-lg border border-[#222] bg-[#0a0a0a] p-4 transition hover:border-[#333]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#ccc]">
                  {te.direction === "outbound" ? "You" : te.from_name || te.from_address}
                </span>
                <span className="text-xs text-[#666]">
                  {new Date(te.received_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-[#888]">{te.body_text?.slice(0, 100)}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Reply */}
      {replying && (
        <div className="mt-4 rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <p className="mb-2 text-xs text-[#666]">
            Replying to {email.direction === "inbound" ? email.from_address : email.to_addresses?.[0]}
          </p>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={6}
            className="w-full rounded-lg border border-[#333] bg-[#111] p-3 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setReplying(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-[#888] hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleReply}
              disabled={sending || !replyText.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-[#4FC3F7] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#38B2D8] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
