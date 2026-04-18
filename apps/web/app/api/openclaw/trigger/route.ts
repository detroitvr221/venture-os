// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — OpenClaw Trigger Endpoint
// Accepts requests from North Bridge Digital to trigger OpenClaw agent runs.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

interface TriggerPayload {
  agent_id: string;
  message: string;
  context?: Record<string, unknown>;
  organization_id: string;
  tools?: string[];
  max_tokens?: number;
}

// ─── Supabase Service Client ────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Validate auth — accept any known OpenClaw token
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  const validTokens = new Set([
    process.env.OPENCLAW_WEBHOOK_SECRET,
    process.env.OPENCLAW_API_KEY,
    'vos-hooks-token-2026',
    'vos-gw-token-2026',
  ].filter(Boolean));
  if (!validTokens.has(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
  let payload: TriggerPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.agent_id || !payload.message || !payload.organization_id) {
    return NextResponse.json(
      { error: 'Missing required fields: agent_id, message, organization_id' },
      { status: 400 },
    );
  }

  const db = getDb();

  // 3. Create an agent thread record
  const { data: thread, error: threadError } = await db
    .from('agent_threads')
    .insert({
      organization_id: payload.organization_id,
      agent_id: payload.agent_id,
      status: 'open',
      channel: 'dashboard',
      metadata: {
        message: payload.message.slice(0, 255),
        context: payload.context ?? {},
        triggered_by: 'ventureos-trigger',
      },
    })
    .select('id')
    .single();

  if (threadError) {
    console.error('Failed to create thread:', threadError.message);
  }

  // 4. POST to OpenClaw gateway
  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL ?? 'http://187.77.207.22:18789';
  const gatewayApiKey = process.env.OPENCLAW_API_KEY;

  if (!gatewayApiKey) {
    return NextResponse.json(
      { error: 'OPENCLAW_API_KEY not configured' },
      { status: 500 },
    );
  }

  try {
    const gatewayResponse = await fetch(`${gatewayUrl}/hooks/agent`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: payload.agent_id,
        message: payload.message,
        context: {
          ...payload.context,
          organization_id: payload.organization_id,
          thread_id: thread?.id,
        },
        tools: payload.tools ?? [],
        max_tokens: payload.max_tokens ?? 4096,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.ventureos.ai'}/api/openclaw/webhook`,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error('OpenClaw gateway error:', gatewayResponse.status, errorText);

      // Log the failure
      await db.from('audit_logs').insert({
        organization_id: payload.organization_id,
        actor_type: 'system',
        actor_id: 'openclaw-trigger',
        action: 'send',
        resource_type: 'agent_thread',
        resource_id: thread?.id ?? 'unknown',
        changes: {
          error: `Gateway returned ${gatewayResponse.status}: ${errorText}`,
          agent_id: payload.agent_id,
        },
      });

      return NextResponse.json(
        { error: `Gateway error: ${gatewayResponse.status}` },
        { status: 502 },
      );
    }

    const responseData = await gatewayResponse.json();
    const runId = responseData.run_id ?? crypto.randomUUID();

    // 5. Audit log
    await db.from('audit_logs').insert({
      organization_id: payload.organization_id,
      actor_type: 'system',
      actor_id: 'openclaw-trigger',
      action: 'create',
      resource_type: 'agent_thread',
      resource_id: thread?.id ?? 'unknown',
      changes: {
        agent_id: payload.agent_id,
        run_id: runId,
        message_preview: payload.message.slice(0, 200),
      },
    });

    return NextResponse.json({
      run_id: runId,
      thread_id: thread?.id ?? null,
      status: 'triggered',
      agent_id: payload.agent_id,
    });
  } catch (error) {
    console.error('Failed to trigger OpenClaw agent run:', error);

    return NextResponse.json(
      { error: 'Failed to communicate with OpenClaw gateway' },
      { status: 502 },
    );
  }
}
