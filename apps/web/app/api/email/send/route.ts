import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = process.env.EMAIL_FROM || "atlas@thenorthbridgemi.org";
const DEFAULT_ORG_ID = process.env.DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check: must be logged in OR have webhook secret
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.OPENCLAW_WEBHOOK_SECRET || "vos-webhook-secret-2026";
    const isWebhookAuth = authHeader === `Bearer ${webhookSecret}`;

    if (!isWebhookAuth) {
      const user = await getAuthUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { to, cc, bcc, subject, text, html, from, replyTo, inReplyTo } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: "Missing required fields: to, subject" }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
    }

    const fromAddress = from || DEFAULT_FROM;
    const toAddresses = Array.isArray(to) ? to : [to];

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: toAddresses,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject,
        text: text || undefined,
        html: html || undefined,
        reply_to: replyTo || undefined,
        headers: inReplyTo ? { "In-Reply-To": inReplyTo } : undefined,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return NextResponse.json(
        { error: "Failed to send email", details: resendData },
        { status: resendRes.status }
      );
    }

    // Store in database
    const supabase = getServiceClient();
    const { data: stored } = await supabase
      .from("emails")
      .insert({
        organization_id: DEFAULT_ORG_ID,
        direction: "outbound",
        from_address: fromAddress,
        from_name: extractName(fromAddress),
        to_addresses: toAddresses,
        cc_addresses: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
        bcc_addresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
        subject,
        body_text: text || "",
        body_html: html || "",
        status: "sent",
        resend_id: resendData.id,
        message_id: resendData.id,
        in_reply_to: inReplyTo || null,
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Thread detection for replies
    if (inReplyTo && stored) {
      const { data: parent } = await supabase
        .from("emails")
        .select("id, thread_id")
        .eq("message_id", inReplyTo)
        .single();

      if (parent) {
        const threadId = parent.thread_id || parent.id;
        await supabase.from("emails").update({ thread_id: threadId }).eq("id", stored.id);
      }
    }

    return NextResponse.json({ success: true, id: resendData.id, emailId: stored?.id });
  } catch (err) {
    console.error("Send email error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function extractName(fromStr: string): string {
  const match = fromStr.match(/^([^<]+)</);
  return match ? match[1].trim() : fromStr.split("@")[0];
}
