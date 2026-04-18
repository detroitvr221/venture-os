"use server";

import { createClient } from "@/lib/supabase/server";

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://187.77.207.22:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_KEY || "vos-hooks-token-2026";
const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/openclaw/webhook`
  : "https://www.thenorthbridgemi.com/api/openclaw/webhook";

/** Run a site audit (broader than SEO — security, performance, accessibility, content) */
export async function runSiteAudit(url: string): Promise<{
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}> {
  if (!url) return { success: false, error: "URL is required" };
  try { new URL(url); } catch { return { success: false, error: "Invalid URL" }; }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();
  const orgId = membership?.organization_id || "00000000-0000-0000-0000-000000000001";

  // Create job
  const { data: job, error: jobErr } = await supabase
    .from("audit_jobs")
    .insert({
      organization_id: orgId,
      job_type: "site_audit",
      status: "queued",
      input_payload: { url },
      target_url: url,
      external_system: "openclaw",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobErr || !job) return { success: false, error: jobErr?.message || "Failed to create job" };

  // Fire to OpenClaw
  fetch(`${OPENCLAW_URL}/hooks/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENCLAW_TOKEN}` },
    body: JSON.stringify({
      agent_id: "main",
      message: `Run a full website audit on ${url}. Check: security (HTTPS, headers, CSP), performance (page load, assets, caching), accessibility (WCAG AA, color contrast, alt text, ARIA), SEO basics (meta tags, headings, structured data), broken links, mobile responsiveness, and content quality. Score each area 0-100. Return JSON with: overall_score (number), sections (array of {name, score, issues: [{severity, title, detail, fix}]}), summary (string), critical_actions (array of strings).`,
      context: { job_id: job.id, job_type: "site_audit", org_id: orgId, target_url: url, callback_url: WEBHOOK_URL },
      max_tokens: 8192,
    }),
    signal: AbortSignal.timeout(30000),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    await supabase.from("audit_jobs").update({ external_job_id: data.runId || data.run_id || null, status: "running" }).eq("id", job.id);
  }).catch(async (err) => {
    await supabase.from("audit_jobs").update({ status: "failed", error_message: err?.message || "OpenClaw unreachable" }).eq("id", job.id);
  });

  return { success: true, jobId: job.id, message: `Site audit triggered for ${url}. Check Jobs for live status.` };
}

/** Retry a failed job */
export async function retryJob(jobId: string): Promise<{
  success: boolean;
  newJobId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get the original job
  const { data: oldJob } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!oldJob) return { success: false, error: "Job not found" };
  if (oldJob.status !== "failed" && oldJob.status !== "cancelled") {
    return { success: false, error: "Can only retry failed or cancelled jobs" };
  }

  // Create a new job with the same input
  const { data: newJob, error: jobErr } = await supabase
    .from("audit_jobs")
    .insert({
      organization_id: oldJob.organization_id,
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

  if (jobErr || !newJob) return { success: false, error: jobErr?.message || "Failed to create retry job" };

  // Build prompt based on job type
  const prompts: Record<string, string> = {
    seo_audit: `Run a comprehensive SEO audit on ${oldJob.target_url}. Analyze meta tags, headings, page speed, mobile-friendliness, content quality, internal linking, schema markup, Core Web Vitals. Score each 0-100. Return JSON with: overall_score, categories, summary, top_priorities.`,
    site_audit: `Run a full website audit on ${oldJob.target_url}. Check security, performance, accessibility, SEO, broken links, mobile, content quality. Score each 0-100. Return JSON with: overall_score, sections, summary, critical_actions.`,
    intake_analysis: `Analyze this client intake form and generate a recommendation report. Data: ${JSON.stringify(oldJob.input_payload?.formData || oldJob.input_payload)}. Return JSON with: recommended_services, recommended_tier, estimated_monthly_value, risk_factors, opportunities, next_steps, executive_summary.`,
  };

  const prompt = prompts[oldJob.job_type] || `Process this request: ${JSON.stringify(oldJob.input_payload)}`;

  // Fire to OpenClaw
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
    await supabase.from("audit_jobs").update({ external_job_id: data.runId || null, status: "running" }).eq("id", newJob.id);
  }).catch(async (err) => {
    await supabase.from("audit_jobs").update({ status: "failed", error_message: err?.message || "OpenClaw unreachable" }).eq("id", newJob.id);
  });

  return { success: true, newJobId: newJob.id };
}

/** Cancel a pending/running job */
export async function cancelJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("audit_jobs")
    .update({ status: "cancelled", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
