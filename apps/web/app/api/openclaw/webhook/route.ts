// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — OpenClaw Webhook Bridge
// Receives actions from OpenClaw and routes to appropriate services.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─── Auth ───────────────────────────────────────────────────────────────────

const VALID_TOKENS = new Set([
  process.env.OPENCLAW_WEBHOOK_SECRET,
  process.env.OPENCLAW_API_KEY,
  process.env.OPENCLAW_GATEWAY_TOKEN,
  'vos-hooks-token-2026',
  'vos-gw-token-2026',
].filter(Boolean));

function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return VALID_TOKENS.has(token);
}

// ─── Supabase Service Client ────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── Payload Types ──────────────────────────────────────────────────────────

interface WebhookPayload {
  action: string;
  organization_id: string;
  data: Record<string, unknown>;
  agent_id?: string;
  run_id?: string;
  timestamp?: string;
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

async function handleAgentResult(
  db: ReturnType<typeof getDb>,
  payload: WebhookPayload,
): Promise<Record<string, unknown>> {
  const { organization_id, data, agent_id, run_id } = payload;

  // Store agent tool call result
  if (data.thread_id) {
    await db.from('agent_tool_calls').insert({
      organization_id,
      thread_id: data.thread_id,
      agent_slug: agent_id ?? 'unknown',
      tool_name: (data.tool_name as string) ?? 'external',
      input: (data.input as Record<string, unknown>) ?? {},
      output: (data.output as Record<string, unknown>) ?? {},
      status: (data.error as string) ? 'error' : 'success',
      duration_ms: (data.duration_ms as number) ?? null,
    });
  }

  // Record agent cost if provided
  if (data.cost_usd && typeof data.cost_usd === 'number') {
    await db.from('agent_costs').insert({
      organization_id,
      thread_id: (data.thread_id as string) ?? null,
      agent_slug: agent_id ?? 'unknown',
      model: (data.model as string) ?? 'unknown',
      input_tokens: (data.input_tokens as number) ?? 0,
      output_tokens: (data.output_tokens as number) ?? 0,
      cost_usd: data.cost_usd,
    });
  }

  // Audit log
  await db.from('audit_logs').insert({
    organization_id,
    actor_type: 'agent',
    actor_id: agent_id ?? 'openclaw',
    action: 'update',
    resource_type: 'agent_tool_call',
    resource_id: run_id ?? 'unknown',
    changes: {
      action: 'agent_result',
      agent_id,
      tool_name: data.tool_name,
    },
  });

  return { processed: true, action: 'agent_result' };
}

async function handleToolCallCompletion(
  db: ReturnType<typeof getDb>,
  payload: WebhookPayload,
): Promise<Record<string, unknown>> {
  const { organization_id, data, agent_id } = payload;

  // Update existing tool call with output
  if (data.tool_call_id) {
    await db
      .from('agent_tool_calls')
      .update({
        output: (data.output as Record<string, unknown>) ?? {},
        duration_ms: (data.duration_ms as number) ?? null,
        error: (data.error as string) ?? null,
      })
      .eq('id', data.tool_call_id)
      .eq('organization_id', organization_id);
  }

  return { processed: true, action: 'tool_call_completion' };
}

async function handleMemoryUpdate(
  db: ReturnType<typeof getDb>,
  payload: WebhookPayload,
): Promise<Record<string, unknown>> {
  const { organization_id, data } = payload;

  if (data.content && data.scope && data.scope_id) {
    await db.from('memories').insert({
      organization_id,
      scope: data.scope as string,
      scope_id: data.scope_id as string,
      content: data.content as string,
      embedding: null,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
      source: 'openclaw',
    });
  }

  return { processed: true, action: 'memory_update' };
}

async function handleLeadUpdate(
  db: ReturnType<typeof getDb>,
  payload: WebhookPayload,
): Promise<Record<string, unknown>> {
  const { organization_id, data } = payload;

  if (data.lead_id) {
    const updateFields: Record<string, unknown> = {};
    if (data.stage) updateFields.stage = data.stage;
    if (data.score !== undefined) updateFields.score = data.score;
    if (data.assigned_agent) updateFields.assigned_agent = data.assigned_agent;
    if (data.notes) updateFields.notes = data.notes;

    if (Object.keys(updateFields).length > 0) {
      await db
        .from('leads')
        .update(updateFields)
        .eq('id', data.lead_id)
        .eq('organization_id', organization_id);
    }
  }

  return { processed: true, action: 'lead_update' };
}

// ─── Job Completion Handler ─────────────────────────────────────────────────

async function handleJobComplete(
  db: ReturnType<typeof getDb>,
  payload: WebhookPayload,
): Promise<Record<string, unknown>> {
  const { organization_id, data } = payload;
  const jobId = (data.job_id as string) || (data.context as Record<string, unknown>)?.job_id as string;

  if (!jobId) {
    // No job_id — try matching by context fields
    return { processed: false, reason: 'no_job_id' };
  }

  // Parse the response content
  const responseText = (data.response || data.message || data.content || '') as string;
  let parsedResult: Record<string, unknown> = {};
  let score: number | null = null;
  let summary = responseText.slice(0, 500);

  // Try to extract JSON from the response
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedResult = JSON.parse(jsonMatch[0]);
      score = typeof parsedResult.overall_score === 'number'
        ? parsedResult.overall_score
        : typeof parsedResult.score === 'number'
        ? parsedResult.score
        : null;
      summary = (parsedResult.summary as string) || (parsedResult.executive_summary as string) || summary;
    }
  } catch {
    // Not JSON, treat as plain text
    parsedResult = { raw_response: responseText };
  }

  // Get the job to find org_id and target info
  const { data: job } = await db
    .from('audit_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  const orgId = job?.organization_id || organization_id;

  // Create a report
  const { data: report } = await db
    .from('reports')
    .insert({
      organization_id: orgId,
      user_id: job?.user_id || '00000000-0000-0000-0000-000000000000',
      job_id: jobId,
      title: `${(job?.job_type || 'audit').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} — ${job?.target_url || 'Report'}`,
      report_type: job?.job_type || 'custom',
      content_html: `<div class="report-content"><h2>Report</h2><pre>${responseText.replace(/</g, '&lt;')}</pre></div>`,
      content_markdown: responseText,
      content_json: parsedResult,
      score,
      target_url: job?.target_url,
    })
    .select('id')
    .single();

  // Update job to completed
  await db
    .from('audit_jobs')
    .update({
      status: 'completed',
      result_summary: summary,
      result_payload: parsedResult,
      report_id: report?.id || null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  // Audit log
  await db.from('audit_logs').insert({
    organization_id: orgId,
    actor_type: 'system',
    actor_id: 'openclaw-webhook',
    action: 'create',
    resource_type: 'report',
    resource_id: report?.id || jobId,
    changes: {
      action: 'job_complete',
      job_id: jobId,
      report_id: report?.id,
      score,
    },
  });

  return { processed: true, action: 'job_complete', job_id: jobId, report_id: report?.id };
}

async function handleJobFailed(
  db: ReturnType<typeof getDb>,
  payload: WebhookPayload,
): Promise<Record<string, unknown>> {
  const { data } = payload;
  const jobId = (data.job_id as string) || (data.context as Record<string, unknown>)?.job_id as string;

  if (!jobId) return { processed: false, reason: 'no_job_id' };

  const errorMsg = (data.error as string) || (data.message as string) || 'Unknown error from OpenClaw';

  const { data: job } = await db
    .from('audit_jobs')
    .select('retry_count, max_retries')
    .eq('id', jobId)
    .single();

  await db
    .from('audit_jobs')
    .update({
      status: 'failed',
      error_message: errorMsg,
      retry_count: (job?.retry_count || 0) + 1,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  return { processed: true, action: 'job_failed', job_id: jobId };
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Validate Authorization
  if (!validateAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // 2. Parse body
  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!payload.action || !payload.organization_id) {
    return NextResponse.json(
      { error: 'Missing required fields: action, organization_id' },
      { status: 400 },
    );
  }

  const db = getDb();

  // 3. Route to handler
  try {
    let result: Record<string, unknown>;

    switch (payload.action) {
      case 'agent_result':
        result = await handleAgentResult(db, payload);
        break;
      case 'tool_call_completion':
        result = await handleToolCallCompletion(db, payload);
        break;
      case 'memory_update':
        result = await handleMemoryUpdate(db, payload);
        break;
      case 'lead_update':
        result = await handleLeadUpdate(db, payload);
        break;
      case 'job_complete':
      case 'task_complete':
      case 'audit_complete':
        result = await handleJobComplete(db, payload);
        break;
      case 'job_failed':
      case 'task_failed':
      case 'audit_failed':
        result = await handleJobFailed(db, payload);
        break;
      default:
        // Generic: store in audit_logs for unknown actions
        await db.from('audit_logs').insert({
          organization_id: payload.organization_id,
          actor_type: 'system',
          actor_id: 'openclaw-webhook',
          action: 'create',
          resource_type: 'webhook_event',
          resource_id: payload.run_id ?? 'unknown',
          changes: {
            action: payload.action,
            data: payload.data,
          },
        });
        result = { processed: true, action: payload.action, note: 'logged_to_audit' };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('OpenClaw webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}
