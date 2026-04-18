import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://187.77.207.22:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_KEY || "vos-hooks-token-2026";
const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/openclaw/webhook`
  : "https://www.thenorthbridgemi.com/api/openclaw/webhook";

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

const PROMPTS: Record<string, (input: Record<string, unknown>) => string> = {
  seo_audit: (i) => `Run a comprehensive SEO audit on ${i.url}. Score each category 0-100. Return JSON with: overall_score, categories, summary, top_priorities.`,
  site_audit: (i) => `Run a full website audit on ${i.url}. Check security, performance, accessibility, SEO, broken links, mobile. Return JSON with: overall_score, sections, summary, critical_actions.`,
  intake_analysis: (i) => `Analyze this client intake: ${JSON.stringify(i.formData || i)}. Return JSON with: recommended_services, recommended_tier, estimated_monthly_value, risk_factors, opportunities, next_steps, executive_summary.`,
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !VALID_TOKENS.has(authHeader.replace("Bearer ", ""))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await request.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const db = getDb();

  const { data: oldJob } = await db.from("audit_jobs").select("*").eq("id", jobId).single();
  if (!oldJob) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (oldJob.status !== "failed" && oldJob.status !== "cancelled") {
    return NextResponse.json({ error: "Can only retry failed/cancelled jobs" }, { status: 400 });
  }

  const { data: newJob, error } = await db
    .from("audit_jobs")
    .insert({
      organization_id: oldJob.organization_id,
      user_id: oldJob.user_id,
      job_type: oldJob.job_type,
      status: "queued",
      input_payload: oldJob.input_payload,
      target_url: oldJob.target_url,
      target_entity_id: oldJob.target_entity_id,
      target_entity_type: oldJob.target_entity_type,
      external_system: "openclaw",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !newJob) return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });

  const promptFn = PROMPTS[oldJob.job_type];
  const prompt = promptFn ? promptFn(oldJob.input_payload || {}) : `Process: ${JSON.stringify(oldJob.input_payload)}`;

  fetch(`${OPENCLAW_URL}/hooks/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENCLAW_TOKEN}` },
    body: JSON.stringify({
      agent_id: oldJob.job_type === "seo_audit" ? "seo" : "main",
      message: prompt,
      context: { job_id: newJob.id, job_type: oldJob.job_type, org_id: oldJob.organization_id, target_url: oldJob.target_url, callback_url: WEBHOOK_URL },
      max_tokens: 8192,
    }),
    signal: AbortSignal.timeout(30000),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    await db.from("audit_jobs").update({ external_job_id: data.runId || null, status: "running" }).eq("id", newJob.id);
  }).catch(async (err) => {
    await db.from("audit_jobs").update({ status: "failed", error_message: err?.message }).eq("id", newJob.id);
  });

  return NextResponse.json({ success: true, newJobId: newJob.id, status: "queued" });
}
