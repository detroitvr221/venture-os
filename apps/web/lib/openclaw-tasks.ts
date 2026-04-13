/**
 * OpenClaw Task Service
 *
 * Universal bridge between dashboard and OpenClaw/Trigger.dev.
 * Handles: job creation, OpenClaw triggering, status polling, report storage.
 *
 * Architecture:
 *   Dashboard Screen → createJob() → audit_jobs row (pending)
 *                    → triggerOpenClaw() → OpenClaw /hooks/agent
 *                    → OpenClaw callback → /api/openclaw/webhook → updates job status
 *                    → Supabase Realtime → dashboard updates live
 */

import { createClient } from "@/lib/supabase/server";

const OPENCLAW_URL =
  process.env.OPENCLAW_GATEWAY_URL || "https://claw.thenorthbridgemi.com";
const OPENCLAW_TOKEN =
  process.env.OPENCLAW_API_KEY || "vos-hooks-token-2026";
const WEBHOOK_URL =
  process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/openclaw/webhook`
    : "https://www.thenorthbridgemi.com/api/openclaw/webhook";

// ─── Types ────────────────────────────────────────────────────────────────

export type JobType =
  | "seo_audit"
  | "site_audit"
  | "intake_analysis"
  | "branding_audit"
  | "competitor_research"
  | "proposal_generation"
  | "lead_enrichment"
  | "email_summary"
  | "document_analysis"
  | "custom";

export type JobStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface CreateJobInput {
  jobType: JobType;
  orgId: string;
  inputPayload: Record<string, unknown>;
  targetUrl?: string;
  targetEntityId?: string;
  targetEntityType?: string;
}

export interface Job {
  id: string;
  job_type: JobType;
  status: JobStatus;
  input_payload: Record<string, unknown>;
  result_summary: string | null;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  target_url: string | null;
  report_id: string | null;
  external_job_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ─── Agent Prompts by Job Type ────────────────────────────────────────────

const JOB_PROMPTS: Record<JobType, (input: Record<string, unknown>) => string> = {
  seo_audit: (input) =>
    `Run a comprehensive SEO audit on ${input.url}. Analyze: meta tags, heading structure, page speed, mobile-friendliness, content quality, internal linking, schema markup, Core Web Vitals, and backlink profile. Score each category 0-100. Return a structured JSON report with: overall_score (number), categories (array of {name, score, findings: [{severity, title, description, recommendation}]}), summary (string), and top_priorities (array of strings). Be thorough and specific — cite actual page elements.`,

  site_audit: (input) =>
    `Run a full website audit on ${input.url}. Check: security (HTTPS, headers), performance (load time, assets), accessibility (WCAG), SEO basics, broken links, mobile responsiveness, and content quality. Return structured JSON with: overall_score, sections (array of {name, score, issues: [{severity, title, detail, fix}]}), summary, and critical_actions.`,

  intake_analysis: (input) =>
    `Analyze this client intake form submission and generate a recommendation report. Client data: ${JSON.stringify(input.formData)}. Evaluate: service fit, budget alignment, project complexity, timeline feasibility, and recommended package tier. Return JSON with: recommended_services (array), recommended_tier (string), estimated_monthly_value (number), risk_factors (array), opportunities (array), next_steps (array), and executive_summary (string).`,

  branding_audit: (input) =>
    `Audit the brand presence of ${input.url}. Analyze: visual consistency, messaging clarity, competitive positioning, social proof, trust signals, and brand voice. Return structured JSON report.`,

  competitor_research: (input) =>
    `Research competitors of ${input.url} in the ${input.industry || "digital services"} space. Identify top 5 competitors, compare features, pricing, SEO strength, social presence, and market positioning. Return structured JSON.`,

  proposal_generation: (input) =>
    `Generate a professional service proposal for: ${JSON.stringify(input.clientData)}. Include: executive summary, recommended services, timeline, deliverables, pricing breakdown, and terms. Return as structured JSON with sections.`,

  lead_enrichment: (input) =>
    `Enrich this lead data: ${JSON.stringify(input.leadData)}. Find: company size, industry, tech stack, social profiles, recent news, decision makers, and estimated budget. Return structured JSON.`,

  email_summary: (input) =>
    `Summarize this email thread: ${JSON.stringify(input.emails)}. Extract: key topics, action items, sentiment, and recommended next steps. Return structured JSON.`,

  document_analysis: (input) =>
    `Analyze this document: ${input.content}. Extract: key points, sentiment, entities, and actionable insights. Return structured JSON.`,

  custom: (input) =>
    input.prompt as string || "Process this request and return a structured JSON report.",
};

// ─── Core Functions ───────────────────────────────────────────────────────

/** Create a job record and trigger OpenClaw */
export async function createAndTriggerJob(input: CreateJobInput): Promise<{
  jobId: string;
  status: string;
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Create the job record
  const { data: job, error: insertError } = await supabase
    .from("audit_jobs")
    .insert({
      organization_id: input.orgId,
      job_type: input.jobType,
      status: "pending",
      input_payload: input.inputPayload,
      target_url: input.targetUrl,
      target_entity_id: input.targetEntityId,
      target_entity_type: input.targetEntityType,
      external_system: "openclaw",
    })
    .select("id")
    .single();

  if (insertError || !job) {
    return { jobId: "", status: "error", error: insertError?.message || "Failed to create job" };
  }

  // 2. Build the prompt
  const promptBuilder = JOB_PROMPTS[input.jobType];
  const prompt = promptBuilder(input.inputPayload);

  // 3. Trigger OpenClaw
  try {
    const response = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        agent_id: "main",
        message: prompt,
        context: {
          job_id: job.id,
          job_type: input.jobType,
          org_id: input.orgId,
          target_url: input.targetUrl,
          callback_url: WEBHOOK_URL,
        },
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    const externalId = data.runId || data.run_id || data.id || null;

    // 4. Update job to queued/running
    await supabase
      .from("audit_jobs")
      .update({
        status: "queued",
        external_job_id: externalId,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { jobId: job.id, status: "queued" };
  } catch (err) {
    // Mark as failed if OpenClaw unreachable
    const errorMsg = err instanceof Error ? err.message : "OpenClaw unreachable";
    await supabase
      .from("audit_jobs")
      .update({
        status: "failed",
        error_message: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { jobId: job.id, status: "failed", error: errorMsg };
  }
}

/** Get a single job by ID */
export async function getJob(jobId: string): Promise<Job | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  return data;
}

/** List jobs for an org, optionally filtered */
export async function listJobs(
  orgId: string,
  options?: { jobType?: JobType; status?: JobStatus; limit?: number }
): Promise<Job[]> {
  const supabase = await createClient();
  let query = supabase
    .from("audit_jobs")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(options?.limit || 50);

  if (options?.jobType) query = query.eq("job_type", options.jobType);
  if (options?.status) query = query.eq("status", options.status);

  const { data } = await query;
  return data || [];
}

/** Complete a job: store result + create report */
export async function completeJob(
  jobId: string,
  result: {
    summary: string;
    payload: Record<string, unknown>;
    score?: number;
    contentHtml?: string;
    contentMarkdown?: string;
  }
): Promise<{ reportId: string | null }> {
  const supabase = await createClient();

  // Get the job
  const { data: job } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) return { reportId: null };

  // Create a report
  const { data: report } = await supabase
    .from("reports")
    .insert({
      organization_id: job.organization_id,
      user_id: job.user_id,
      job_id: jobId,
      title: `${job.job_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} — ${job.target_url || "Report"}`,
      report_type: job.job_type,
      content_html: result.contentHtml || null,
      content_markdown: result.contentMarkdown || null,
      content_json: result.payload,
      score: result.score,
      target_url: job.target_url,
    })
    .select("id")
    .single();

  // Update job to completed
  await supabase
    .from("audit_jobs")
    .update({
      status: "completed",
      result_summary: result.summary,
      result_payload: result.payload,
      report_id: report?.id || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return { reportId: report?.id || null };
}

/** Cancel a running job */
export async function cancelJob(jobId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("audit_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
