import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service-role client for webhook (no user session)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET || "nbdigital-mail-2026";
const DEFAULT_ORG_ID = process.env.DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const secret = authHeader?.replace("Bearer ", "") || querySecret;

  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();

    // Support both raw SMTP payload and structured format
    const email = {
      organization_id: DEFAULT_ORG_ID,
      direction: "inbound" as const,
      from_address: payload.from || payload.envelope?.from || payload.from_address || "",
      from_name: payload.fromName || payload.from_name || extractName(payload.from),
      to_addresses: normalizeAddresses(payload.to || payload.envelope?.to || payload.to_addresses),
      cc_addresses: normalizeAddresses(payload.cc || payload.cc_addresses),
      subject: payload.subject || "(No Subject)",
      body_text: payload.text || payload.body_text || payload.plain || "",
      body_html: payload.html || payload.body_html || "",
      message_id: payload.messageId || payload.message_id || payload.headers?.["message-id"],
      in_reply_to: payload.inReplyTo || payload.in_reply_to || payload.headers?.["in-reply-to"],
      headers: payload.headers || {},
      attachments: (payload.attachments || []).map((a: Record<string, unknown>) => ({
        filename: a.filename || a.name,
        contentType: a.contentType || a.type,
        size: a.size,
      })),
      raw_payload: payload,
      smtp_from: payload.envelope?.from || payload.from,
      status: "received",
      received_at: new Date().toISOString(),
    };

    const supabase = getServiceClient();

    // Try to match to a contact/lead by from_address
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, client_id")
      .eq("email", email.from_address)
      .single();

    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email.from_address)
      .single();

    const { data: inserted, error } = await supabase
      .from("emails")
      .insert({
        ...email,
        contact_id: contact?.id || null,
        client_id: contact?.client_id || null,
        lead_id: lead?.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to store email:", error);
      return NextResponse.json({ error: "Storage failed", details: error.message }, { status: 500 });
    }

    // Thread detection: link replies to original email
    if (email.in_reply_to) {
      const { data: parent } = await supabase
        .from("emails")
        .select("id, thread_id")
        .eq("message_id", email.in_reply_to)
        .single();

      if (parent) {
        const threadId = parent.thread_id || parent.id;
        await supabase
          .from("emails")
          .update({ thread_id: threadId })
          .eq("id", inserted.id);
        // Also set thread_id on parent if not set
        if (!parent.thread_id) {
          await supabase
            .from("emails")
            .update({ thread_id: threadId })
            .eq("id", parent.id);
        }
      }
    }

    return NextResponse.json({ success: true, id: inserted.id }, { status: 200 });
  } catch (err) {
    console.error("Inbound email webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function extractName(fromStr: string | undefined): string {
  if (!fromStr) return "";
  const match = fromStr.match(/^([^<]+)</);
  return match ? match[1].trim() : "";
}

function normalizeAddresses(input: unknown): string[] {
  if (!input) return [];
  if (typeof input === "string") return [input];
  if (Array.isArray(input)) {
    return input.map((a) => (typeof a === "string" ? a : a?.address || a?.email || String(a)));
  }
  return [];
}
