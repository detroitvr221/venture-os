import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://187.77.207.22:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_KEY || "vos-hooks-token-2026";

const VALID_TOKENS = new Set(
  [process.env.OPENCLAW_WEBHOOK_SECRET, process.env.OPENCLAW_API_KEY, "vos-hooks-token-2026", "vos-gw-token-2026"].filter(Boolean)
);

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─── Call Templates ─────────────────────────────────────────────────────────

const CALL_TEMPLATES: Record<string, { name: string; script: (vars: Record<string, string>) => string }> = {
  lead_followup: {
    name: "Lead Follow-Up",
    script: (v) =>
      `Hi ${v.name}, this is Atlas from Northbridge Digital. I'm following up on your inquiry about ${v.service || "our digital services"}. Do you have a few minutes to discuss how we can help ${v.company || "your business"} grow online?`,
  },
  appointment_confirm: {
    name: "Appointment Confirmation",
    script: (v) =>
      `Hi ${v.name}, this is Northbridge Digital confirming your consultation scheduled for ${v.date || "this week"}. We'll be covering your ${v.service || "digital growth"} goals. Is that time still good for you?`,
  },
  intake_prescreen: {
    name: "Intake Pre-Screen",
    script: (v) =>
      `Hi ${v.name}, this is Northbridge Digital. We received your intake form for ${v.company || "your business"} and have a few quick follow-up questions before we prepare your proposal. Do you have 5 minutes?`,
  },
  invoice_reminder: {
    name: "Invoice Reminder",
    script: (v) =>
      `Hi ${v.name}, this is Northbridge Digital. I'm calling about invoice ${v.invoice || ""} for $${v.amount || ""}. Just wanted to check in and see if there's anything we can help with to get this resolved.`,
  },
  client_checkin: {
    name: "Client Check-In",
    script: (v) =>
      `Hi ${v.name}, this is Northbridge Digital. Just doing a quick check-in on your ${v.service || "project"} progress. How has everything been going? Any questions or concerns on your end?`,
  },
};

// ─── POST: Trigger a call ─────────���─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !VALID_TOKENS.has(authHeader.replace("Bearer ", ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    phone_number: string;
    contact_name?: string;
    company_name?: string;
    template?: string;
    custom_script?: string;
    organization_id: string;
    contact_id?: string;
    lead_id?: string;
    client_id?: string;
    variables?: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.phone_number || !body.organization_id) {
    return NextResponse.json({ error: "phone_number and organization_id required" }, { status: 400 });
  }

  // Build the call script
  let script = body.custom_script || "";
  if (!script && body.template && CALL_TEMPLATES[body.template]) {
    const vars = {
      name: body.contact_name || "there",
      company: body.company_name || "",
      ...body.variables,
    };
    script = CALL_TEMPLATES[body.template].script(vars);
  }
  if (!script) {
    script = `Hi ${body.contact_name || "there"}, this is Northbridge Digital. How can we help you today?`;
  }

  const db = getDb();

  // Create call_logs record
  const { data: callLog, error: logErr } = await db
    .from("call_logs")
    .insert({
      organization_id: body.organization_id,
      contact_id: body.contact_id || null,
      lead_id: body.lead_id || null,
      direction: "outbound",
      phone_number: body.phone_number,
      status: "initiating",
      metadata: {
        template: body.template || "custom",
        script,
        contact_name: body.contact_name,
        company_name: body.company_name,
      },
    })
    .select("id")
    .single();

  if (logErr) {
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }

  // Trigger OpenClaw → Mercury agent → Vapi MCP create_call
  try {
    const res = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        agent_id: "sales",
        message: `Place an outbound call using Vapi. Phone number: ${body.phone_number}. Contact: ${body.contact_name || "Unknown"}. Company: ${body.company_name || "Unknown"}. Use this script as a guide: "${script}". After the call, save the transcript and summary. Call log ID: ${callLog?.id}`,
        context: {
          call_log_id: callLog?.id,
          org_id: body.organization_id,
          phone_number: body.phone_number,
          template: body.template,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thenorthbridgemi.com"}/api/openclaw/webhook`,
        },
        tools: ["vapi"],
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();

    // Update call log with run ID
    await db
      .from("call_logs")
      .update({ status: "ringing", metadata: { ...callLog, run_id: data.runId || data.run_id } })
      .eq("id", callLog?.id);

    return NextResponse.json({
      success: true,
      call_log_id: callLog?.id,
      run_id: data.runId || data.run_id,
      status: "ringing",
    });
  } catch (err) {
    await db
      .from("call_logs")
      .update({ status: "failed", metadata: { error: (err as Error).message } })
      .eq("id", callLog?.id);

    return NextResponse.json({
      success: false,
      call_log_id: callLog?.id,
      error: (err as Error).message,
    }, { status: 500 });
  }
}

// ─── GET: List call templates ───────────────────────────────────────────────

export async function GET() {
  const templates = Object.entries(CALL_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    preview: t.script({ name: "{name}", company: "{company}", service: "{service}", date: "{date}", invoice: "{invoice}", amount: "{amount}" }),
  }));
  return NextResponse.json({ templates });
}
