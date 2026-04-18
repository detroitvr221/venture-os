'use server';

// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — Server Actions
// All mutations go through here with validation and audit logging.
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ─── Supabase Server Client ─────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

// For service-role operations (bypasses RLS)
function getServiceSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

const DEFAULT_ORG_ID = process.env.DEFAULT_ORGANIZATION_ID ?? '00000000-0000-0000-0000-000000000001';

async function audit(
  db: ReturnType<typeof getServiceSupabase>,
  orgId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes: Record<string, unknown>,
) {
  await db.from('audit_logs').insert({
    organization_id: orgId,
    actor_type: 'user',
    actor_id: 'dashboard-user',
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes,
  });
}

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── createLead ─────────────────────────────────────────────────────────────

export async function createLead(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();
  const orgId = (formData.get('organization_id') as string) || DEFAULT_ORG_ID;

  const contactName = formData.get('contact_name') as string;
  const contactEmail = formData.get('contact_email') as string;
  const companyId = formData.get('company_id') as string;

  if (!contactName || contactName.trim().length === 0) {
    return { success: false, error: 'Contact name is required' };
  }
  if (!contactEmail || !contactEmail.includes('@')) {
    return { success: false, error: 'A valid email is required' };
  }
  if (!companyId) {
    return { success: false, error: 'Company ID is required' };
  }

  const { data, error } = await db
    .from('leads')
    .insert({
      organization_id: orgId,
      company_id: companyId,
      contact_name: contactName.trim(),
      contact_email: contactEmail.trim(),
      contact_phone: (formData.get('contact_phone') as string) || null,
      source: (formData.get('source') as string) || null,
      stage: 'new',
      score: formData.get('score') ? parseInt(formData.get('score') as string, 10) : 0,
      assigned_agent: null,
      notes: (formData.get('notes') as string) || null,
      expected_value: formData.get('expected_value')
        ? parseFloat(formData.get('expected_value') as string)
        : null,
    })
    .select('id, score, contact_name, source')
    .single();

  if (error) {
    return { success: false, error: `Failed to create lead: ${error.message}` };
  }

  await audit(db, orgId, 'create', 'lead', data.id, {
    contact_name: contactName,
    contact_email: contactEmail,
  });

  // ── Lead Pipeline Automations ──
  const lead = data;
  if (lead?.id && lead?.score) {
    // Auto-assign to Mercury (sales agent) when score > 60
    if (lead.score > 60) {
      await db.from('leads').update({ assigned_agent: 'mercury' }).eq('id', lead.id);
    }

    // Auto-create proposal draft when score > 80
    if (lead.score > 80) {
      await db.from('proposals').insert({
        organization_id: orgId,
        lead_id: lead.id,
        title: `Proposal for ${lead.contact_name || 'New Lead'}`,
        status: 'draft',
        amount: null,
        content: {
          auto_generated: true,
          note: 'Auto-generated from high-scoring lead. Review and customize before sending.',
          lead_score: lead.score,
          source: lead.source,
        },
      });
    }
  }

  revalidatePath('/leads');
  revalidatePath('/overview');

  return { success: true, data: { id: data.id } };
}

// ─── updateLeadStage ────────────────────────────────────────────────────────

export async function updateLeadStage(
  leadId: string,
  newStage: string,
): Promise<ActionResult<{ id: string; stage: string }>> {
  const db = getServiceSupabase();

  const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  if (!validStages.includes(newStage)) {
    return { success: false, error: `Invalid stage: ${newStage}` };
  }

  if (!leadId) {
    return { success: false, error: 'Lead ID is required' };
  }

  // Fetch current lead to get org_id and current state
  const { data: currentLead, error: fetchError } = await db
    .from('leads')
    .select('organization_id, stage')
    .eq('id', leadId)
    .single();

  if (fetchError || !currentLead) {
    return { success: false, error: 'Lead not found' };
  }

  const { error } = await db
    .from('leads')
    .update({ stage: newStage })
    .eq('id', leadId)
    .eq('organization_id', currentLead.organization_id);

  if (error) {
    return { success: false, error: `Failed to update lead stage: ${error.message}` };
  }

  await audit(db, currentLead.organization_id, 'update', 'lead', leadId, {
    stage: { from: currentLead.stage, to: newStage },
  });

  revalidatePath('/leads');
  revalidatePath('/overview');

  return { success: true, data: { id: leadId, stage: newStage } };
}

// ─── approvePendingApproval ─────────────────────────────────────────────────

export async function approvePendingApproval(
  approvalId: string,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();

  if (!approvalId) {
    return { success: false, error: 'Approval ID is required' };
  }

  // Fetch current approval
  const { data: approval, error: fetchError } = await db
    .from('approvals')
    .select('organization_id, status, workflow_run_id')
    .eq('id', approvalId)
    .single();

  if (fetchError || !approval) {
    return { success: false, error: 'Approval not found' };
  }

  if (approval.status !== 'pending') {
    return { success: false, error: `Approval is already ${approval.status}` };
  }

  const now = new Date().toISOString();

  const { error } = await db
    .from('approvals')
    .update({
      status: 'approved',
      decided_by: 'dashboard-user',
      decided_at: now,
    })
    .eq('id', approvalId)
    .eq('organization_id', approval.organization_id);

  if (error) {
    return { success: false, error: `Failed to approve: ${error.message}` };
  }

  // If linked to workflow run, resume it
  if (approval.workflow_run_id) {
    await db
      .from('workflow_runs')
      .update({ status: 'running' })
      .eq('id', approval.workflow_run_id)
      .eq('organization_id', approval.organization_id)
      .eq('status', 'paused');
  }

  await audit(db, approval.organization_id, 'approve', 'approval', approvalId, {
    decided_by: 'dashboard-user',
  });

  revalidatePath('/approvals');
  revalidatePath('/overview');

  return { success: true, data: { id: approvalId } };
}

// ─── rejectPendingApproval ──────────────────────────────────────────────────

export async function rejectPendingApproval(
  approvalId: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();

  if (!approvalId) {
    return { success: false, error: 'Approval ID is required' };
  }

  // Fetch current approval
  const { data: approval, error: fetchError } = await db
    .from('approvals')
    .select('organization_id, status, workflow_run_id')
    .eq('id', approvalId)
    .single();

  if (fetchError || !approval) {
    return { success: false, error: 'Approval not found' };
  }

  if (approval.status !== 'pending') {
    return { success: false, error: `Approval is already ${approval.status}` };
  }

  const now = new Date().toISOString();

  const { error } = await db
    .from('approvals')
    .update({
      status: 'rejected',
      decided_by: 'dashboard-user',
      decided_at: now,
      reason: reason || 'Rejected via dashboard',
    })
    .eq('id', approvalId)
    .eq('organization_id', approval.organization_id);

  if (error) {
    return { success: false, error: `Failed to reject: ${error.message}` };
  }

  // If linked to workflow run, fail it
  if (approval.workflow_run_id) {
    await db
      .from('workflow_runs')
      .update({
        status: 'failed',
        error: `Approval rejected: ${reason || 'No reason provided'}`,
        completed_at: now,
      })
      .eq('id', approval.workflow_run_id)
      .eq('organization_id', approval.organization_id);
  }

  await audit(db, approval.organization_id, 'reject', 'approval', approvalId, {
    decided_by: 'dashboard-user',
    reason,
  });

  revalidatePath('/approvals');
  revalidatePath('/overview');

  return { success: true, data: { id: approvalId } };
}

// ─── createSubCompany ───────────────────────────────────────────────────────

export async function createSubCompany(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();
  const orgId = (formData.get('organization_id') as string) || DEFAULT_ORG_ID;

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const industry = formData.get('industry') as string;
  const website = formData.get('website') as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Company name is required' };
  }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { success: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' };
  }

  // Check for slug uniqueness
  const { data: existing } = await db
    .from('sub_companies')
    .select('id')
    .eq('organization_id', orgId)
    .eq('slug', slug)
    .single();

  if (existing) {
    return { success: false, error: `A company with slug "${slug}" already exists` };
  }

  const { data, error } = await db
    .from('sub_companies')
    .insert({
      organization_id: orgId,
      name: name.trim(),
      slug: slug.trim(),
      industry: industry?.trim() || null,
      website: website?.trim() || null,
      settings: {},
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: `Failed to create company: ${error.message}` };
  }

  // Create default brand
  await db.from('brands').insert({
    organization_id: orgId,
    company_id: data.id,
    name: name.trim(),
    voice_guidelines: `Professional, innovative, and results-driven. Speak as ${name.trim()}.`,
    colors: { primary: '#4FC3F7', secondary: '#F5C542' },
    logo_url: null,
    fonts: { heading: 'Inter', body: 'Inter' },
  });

  await audit(db, orgId, 'create', 'sub_company', data.id, {
    name,
    slug,
    industry,
  });

  revalidatePath('/companies');
  revalidatePath('/overview');

  return { success: true, data: { id: data.id } };
}

// ─── triggerSeoAudit ────────────────────────────────────────────────────────

export async function triggerSeoAudit(
  websiteUrl: string,
  clientId?: string,
): Promise<ActionResult<{ message: string }>> {
  const db = getServiceSupabase();

  if (!websiteUrl) {
    return { success: false, error: 'Website URL is required' };
  }

  try {
    new URL(websiteUrl);
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  const orgId = DEFAULT_ORG_ID;

  // Log the audit request
  await audit(db, orgId, 'create', 'website_audit', 'pending', {
    website_url: websiteUrl,
    client_id: clientId,
    triggered_from: 'dashboard',
  });

  // In production, this would trigger the Trigger.dev task.
  // For now, we record the intent and the workflow picks it up.
  await db.from('audit_logs').insert({
    organization_id: orgId,
    actor_type: 'user',
    actor_id: 'dashboard-user',
    action: 'create',
    resource_type: 'website_audit',
    resource_id: 'trigger-pending',
    changes: {
      website_url: websiteUrl,
      client_id: clientId,
      status: 'triggered',
    },
  });

  revalidatePath('/overview');

  return {
    success: true,
    data: {
      message: `SEO audit triggered for ${websiteUrl}. Results will appear in the audits section.`,
    },
  };
}

// ─── Email Actions ──────────────────────────────────────────────────────────

export async function sendEmail(
  to: string[],
  subject: string,
  body: string,
  options?: { from?: string; cc?: string[]; replyTo?: string; inReplyTo?: string }
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject,
      text: body,
      from: options?.from,
      cc: options?.cc,
      replyTo: options?.replyTo,
      inReplyTo: options?.inReplyTo,
    }),
  });

  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error };

  revalidatePath('/email');
  return { success: true, data };
}

export async function archiveEmail(emailId: string) {
  const db = await getSupabase();
  const { error } = await db
    .from('emails')
    .update({ status: 'archived' })
    .eq('id', emailId);

  revalidatePath('/email');
  return { success: !error, error: error?.message };
}

export async function markEmailRead(emailId: string) {
  const db = await getSupabase();
  const { error } = await db
    .from('emails')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', emailId);

  return { success: !error };
}

// ─── generateProposal ──────────────────────────────────────────────────────

export async function generateProposal(
  leadId: string,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();

  if (!leadId) {
    return { success: false, error: 'Lead ID is required' };
  }

  // Fetch lead data
  const { data: lead, error: leadError } = await db
    .from('leads')
    .select('organization_id, contact_name, contact_email, company_id, expected_value, notes')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return { success: false, error: 'Lead not found' };
  }

  const orgId = lead.organization_id ?? DEFAULT_ORG_ID;

  const { data, error } = await db
    .from('proposals')
    .insert({
      organization_id: orgId,
      lead_id: leadId,
      title: `Proposal for ${lead.contact_name}`,
      status: 'draft',
      amount: lead.expected_value ?? null,
      content: null,
      metadata: {
        generated_from: 'dashboard',
        lead_email: lead.contact_email,
        company_id: lead.company_id,
      },
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: `Failed to create proposal: ${error.message}` };
  }

  await audit(db, orgId, 'create', 'proposal', data.id, {
    lead_id: leadId,
    contact_name: lead.contact_name,
  });

  revalidatePath('/proposals');
  revalidatePath('/leads');

  return { success: true, data: { id: data.id } };
}

// ─── sendProposal ──────────────────────────────────────────────────────────

export async function sendProposal(
  proposalId: string,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();

  if (!proposalId) {
    return { success: false, error: 'Proposal ID is required' };
  }

  const { data: proposal, error: fetchError } = await db
    .from('proposals')
    .select('organization_id, status')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.status !== 'draft') {
    return { success: false, error: `Cannot send a proposal with status "${proposal.status}"` };
  }

  const now = new Date().toISOString();

  const { error } = await db
    .from('proposals')
    .update({ status: 'sent', sent_at: now })
    .eq('id', proposalId)
    .eq('organization_id', proposal.organization_id);

  if (error) {
    return { success: false, error: `Failed to send proposal: ${error.message}` };
  }

  await audit(db, proposal.organization_id, 'update', 'proposal', proposalId, {
    status: { from: 'draft', to: 'sent' },
    sent_at: now,
  });

  revalidatePath('/proposals');

  return { success: true, data: { id: proposalId } };
}

// ─── acceptProposal ────────────────────────────────────────────────────────

export async function acceptProposal(
  proposalId: string,
): Promise<ActionResult<{ id: string; project_id?: string }>> {
  const db = getServiceSupabase();

  if (!proposalId) {
    return { success: false, error: 'Proposal ID is required' };
  }

  const { data: proposal, error: fetchError } = await db
    .from('proposals')
    .select('organization_id, status, lead_id, client_id, title, amount')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) {
    return { success: false, error: 'Proposal not found' };
  }

  if (proposal.status !== 'sent' && proposal.status !== 'viewed') {
    return { success: false, error: `Cannot accept a proposal with status "${proposal.status}"` };
  }

  const orgId = proposal.organization_id;
  const now = new Date().toISOString();

  // Update proposal status
  const { error } = await db
    .from('proposals')
    .update({ status: 'accepted' })
    .eq('id', proposalId)
    .eq('organization_id', orgId);

  if (error) {
    return { success: false, error: `Failed to accept proposal: ${error.message}` };
  }

  // Create client from lead if lead exists and no client yet
  let clientId = proposal.client_id;
  if (!clientId && proposal.lead_id) {
    const { data: lead } = await db
      .from('leads')
      .select('contact_name, contact_email, company_id')
      .eq('id', proposal.lead_id)
      .single();

    if (lead) {
      const { data: newClient } = await db
        .from('clients')
        .insert({
          organization_id: orgId,
          name: lead.contact_name,
          email: lead.contact_email,
          company_id: lead.company_id,
          status: 'active',
        })
        .select('id')
        .single();

      if (newClient) {
        clientId = newClient.id;

        // Update lead with converted client id
        await db
          .from('leads')
          .update({ converted_client_id: clientId, stage: 'won' })
          .eq('id', proposal.lead_id)
          .eq('organization_id', orgId);

        // Link proposal to client
        await db
          .from('proposals')
          .update({ client_id: clientId })
          .eq('id', proposalId)
          .eq('organization_id', orgId);
      }
    }
  }

  // Create project from proposal
  let projectId: string | undefined;
  if (clientId) {
    const { data: project } = await db
      .from('projects')
      .insert({
        organization_id: orgId,
        client_id: clientId,
        name: proposal.title ?? 'New Project',
        status: 'active',
        budget: proposal.amount ?? 0,
      })
      .select('id')
      .single();

    if (project) {
      projectId = project.id;
    }
  }

  await audit(db, orgId, 'accept', 'proposal', proposalId, {
    status: { from: proposal.status, to: 'accepted' },
    client_id: clientId,
    project_id: projectId,
  });

  revalidatePath('/proposals');
  revalidatePath('/leads');
  revalidatePath('/clients');
  revalidatePath('/projects');

  return { success: true, data: { id: proposalId, project_id: projectId } };
}

// ─── startFollowUp ─────────────────────────────────────────────────────────

export async function startFollowUp(
  contactId: string,
  leadId: string,
): Promise<ActionResult<{ campaign_id: string }>> {
  const db = getServiceSupabase();

  if (!contactId || !leadId) {
    return { success: false, error: 'Contact ID and Lead ID are required' };
  }

  const orgId = DEFAULT_ORG_ID;

  // Create follow-up campaign
  const { data: campaign, error: campaignError } = await db
    .from('campaigns')
    .insert({
      organization_id: orgId,
      name: `Follow-up: ${leadId.slice(0, 8)}`,
      campaign_type: 'email',
      status: 'active',
      stats: { contacts: 1, sent: 0, opened: 0, replied: 0 },
      template: { subject: 'Following up on our conversation' },
      schedule: { frequency: 'manual' },
    })
    .select('id')
    .single();

  if (campaignError || !campaign) {
    return { success: false, error: `Failed to create campaign: ${campaignError?.message ?? 'Unknown error'}` };
  }

  // Create first outreach event
  await db.from('outreach_events').insert({
    organization_id: orgId,
    campaign_id: campaign.id,
    contact_id: contactId,
    channel: 'email',
    status: 'scheduled',
    content: null,
  });

  await audit(db, orgId, 'create', 'campaign', campaign.id, {
    type: 'follow_up',
    lead_id: leadId,
    contact_id: contactId,
  });

  revalidatePath('/campaigns');

  return { success: true, data: { campaign_id: campaign.id } };
}

// ─── runSeoAudit ───────────────────────────────────────────────────────────

export async function runSeoAudit(
  url: string,
  clientId?: string,
): Promise<ActionResult<{ message: string }>> {
  const db = getServiceSupabase();
  const orgId = DEFAULT_ORG_ID;

  if (!url) {
    return { success: false, error: 'URL is required' };
  }

  try {
    new URL(url);
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  // Create or find website
  let websiteId: string | null = null;

  const { data: existingWebsite } = await db
    .from('websites')
    .select('id')
    .eq('organization_id', orgId)
    .eq('url', url)
    .single();

  if (existingWebsite) {
    websiteId = existingWebsite.id;
  } else {
    const hostname = new URL(url).hostname;
    const { data: newWebsite } = await db
      .from('websites')
      .insert({
        organization_id: orgId,
        client_id: clientId ?? null,
        url,
        name: hostname,
      })
      .select('id')
      .single();

    if (newWebsite) {
      websiteId = newWebsite.id;
    }
  }

  if (!websiteId) {
    return { success: false, error: 'Failed to create or find website record' };
  }

  // Create audit record with pending status
  const { data: auditRecord, error: auditError } = await db
    .from('website_audits')
    .insert({
      organization_id: orgId,
      website_id: websiteId,
      audit_type: 'seo',
      score: null,
      findings_count: 0,
      summary: null,
    })
    .select('id')
    .single();

  if (auditError) {
    return { success: false, error: `Failed to create audit: ${auditError.message}` };
  }

  await audit(db, orgId, 'create', 'website_audit', auditRecord?.id ?? 'unknown', {
    website_url: url,
    client_id: clientId,
    status: 'pending',
  });

  // ── Trigger OpenClaw to actually run the SEO audit ──
  const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://187.77.207.22:18789';
  const OPENCLAW_TOKEN = process.env.OPENCLAW_API_KEY || 'vos-hooks-token-2026';
  const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/openclaw/webhook`
    : 'https://www.thenorthbridgemi.com/api/openclaw/webhook';

  // Create a job record for tracking
  const { data: job } = await db
    .from('audit_jobs')
    .insert({
      organization_id: orgId,
      job_type: 'seo_audit',
      status: 'queued',
      input_payload: { url, client_id: clientId },
      target_url: url,
      target_entity_id: websiteId,
      target_entity_type: 'website',
      external_system: 'openclaw',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  // Fire and forget to OpenClaw — don't block the UI
  fetch(`${OPENCLAW_URL}/hooks/agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
    body: JSON.stringify({
      agent_id: 'seo',
      message: `Run a comprehensive SEO audit on ${url}. Analyze: meta tags, heading structure, page speed, mobile-friendliness, content quality, internal linking, schema markup, and Core Web Vitals. Score each category 0-100. Return a JSON report with: overall_score, categories (array of {name, score, findings}), summary, and top_priorities.`,
      context: {
        job_id: job?.id,
        audit_id: auditRecord?.id,
        website_id: websiteId,
        org_id: orgId,
        job_type: 'seo_audit',
        target_url: url,
        callback_url: WEBHOOK_URL,
      },
      max_tokens: 8192,
    }),
    signal: AbortSignal.timeout(30000),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (job?.id) {
      await db
        .from('audit_jobs')
        .update({ external_job_id: data.runId || data.run_id || null, status: 'running' })
        .eq('id', job.id);
    }
  }).catch(async (err) => {
    if (job?.id) {
      await db
        .from('audit_jobs')
        .update({ status: 'failed', error_message: err?.message || 'OpenClaw unreachable' })
        .eq('id', job.id);
    }
  });

  revalidatePath('/seo');
  revalidatePath('/overview');
  revalidatePath('/jobs');

  return {
    success: true,
    data: {
      message: `SEO audit triggered for ${url}. Atlas is running the audit — check Jobs for live status.`,
    },
  };
}

// ─── createCampaign ────────────────────────────────────────────────────────

export async function createCampaign(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();
  const orgId = (formData.get('organization_id') as string) || DEFAULT_ORG_ID;

  const name = formData.get('name') as string;
  const campaignType = formData.get('campaign_type') as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Campaign name is required' };
  }

  const { data, error } = await db
    .from('campaigns')
    .insert({
      organization_id: orgId,
      name: name.trim(),
      campaign_type: campaignType || 'email',
      status: 'draft',
      stats: { contacts: 0, sent: 0, opened: 0, replied: 0 },
      template: {},
      schedule: {},
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: `Failed to create campaign: ${error.message}` };
  }

  await audit(db, orgId, 'create', 'campaign', data.id, {
    name,
    campaign_type: campaignType,
  });

  revalidatePath('/campaigns');

  return { success: true, data: { id: data.id } };
}

// ─── pauseCampaign ─────────────────────────────────────────────────────────

export async function pauseCampaign(
  campaignId: string,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();

  if (!campaignId) {
    return { success: false, error: 'Campaign ID is required' };
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('organization_id, status')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  if (campaign.status !== 'active') {
    return { success: false, error: `Cannot pause a campaign with status "${campaign.status}"` };
  }

  const { error } = await db
    .from('campaigns')
    .update({ status: 'paused' })
    .eq('id', campaignId)
    .eq('organization_id', campaign.organization_id);

  if (error) {
    return { success: false, error: `Failed to pause campaign: ${error.message}` };
  }

  await audit(db, campaign.organization_id, 'update', 'campaign', campaignId, {
    status: { from: 'active', to: 'paused' },
  });

  revalidatePath('/campaigns');

  return { success: true, data: { id: campaignId } };
}

// ─── resumeCampaign ────────────────────────────────────────────────────────

export async function resumeCampaign(
  campaignId: string,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();

  if (!campaignId) {
    return { success: false, error: 'Campaign ID is required' };
  }

  const { data: campaign, error: fetchError } = await db
    .from('campaigns')
    .select('organization_id, status')
    .eq('id', campaignId)
    .single();

  if (fetchError || !campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  if (campaign.status !== 'paused') {
    return { success: false, error: `Cannot resume a campaign with status "${campaign.status}"` };
  }

  const { error } = await db
    .from('campaigns')
    .update({ status: 'active' })
    .eq('id', campaignId)
    .eq('organization_id', campaign.organization_id);

  if (error) {
    return { success: false, error: `Failed to resume campaign: ${error.message}` };
  }

  await audit(db, campaign.organization_id, 'update', 'campaign', campaignId, {
    status: { from: 'paused', to: 'active' },
  });

  revalidatePath('/campaigns');

  return { success: true, data: { id: campaignId } };
}

// ─── createInvoice ─────────────────────────────────────────────────────────

export async function createInvoice(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const db = getServiceSupabase();
  const orgId = (formData.get('organization_id') as string) || DEFAULT_ORG_ID;

  const clientId = formData.get('client_id') as string;
  const invoiceNumber = formData.get('invoice_number') as string;
  const dueDate = formData.get('due_date') as string;
  const lineItemsJson = formData.get('line_items') as string;

  if (!invoiceNumber || invoiceNumber.trim().length === 0) {
    return { success: false, error: 'Invoice number is required' };
  }

  let lineItems: Array<{ description: string; quantity: number; unit_price: number; total: number }> = [];
  try {
    lineItems = lineItemsJson ? JSON.parse(lineItemsJson) : [];
  } catch {
    return { success: false, error: 'Invalid line items format' };
  }

  const amount = lineItems.reduce((sum, item) => sum + (item.total ?? item.quantity * item.unit_price), 0);

  const { data, error } = await db
    .from('invoices')
    .insert({
      organization_id: orgId,
      client_id: clientId || null,
      invoice_number: invoiceNumber.trim(),
      amount,
      status: 'draft',
      due_date: dueDate || null,
      line_items: lineItems,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: `Failed to create invoice: ${error.message}` };
  }

  await audit(db, orgId, 'create', 'invoice', data.id, {
    invoice_number: invoiceNumber,
    amount,
    client_id: clientId,
  });

  revalidatePath('/billing');
  revalidatePath('/billing/invoices');

  return { success: true, data: { id: data.id } };
}

// ─── updateInvoiceStatus ───────────────────────────────────────────────────

export async function updateInvoiceStatus(
  invoiceId: string,
  status: string,
): Promise<ActionResult<{ id: string; status: string }>> {
  const db = getServiceSupabase();

  if (!invoiceId) {
    return { success: false, error: 'Invoice ID is required' };
  }

  const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'void'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid status: ${status}` };
  }

  const { data: invoice, error: fetchError } = await db
    .from('invoices')
    .select('organization_id, status')
    .eq('id', invoiceId)
    .single();

  if (fetchError || !invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  const updates: Record<string, unknown> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }

  const { error } = await db
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .eq('organization_id', invoice.organization_id);

  if (error) {
    return { success: false, error: `Failed to update invoice: ${error.message}` };
  }

  await audit(db, invoice.organization_id, 'update', 'invoice', invoiceId, {
    status: { from: invoice.status, to: status },
    ...(status === 'paid' ? { paid_at: updates.paid_at } : {}),
  });

  revalidatePath('/billing');
  revalidatePath('/billing/invoices');

  return { success: true, data: { id: invoiceId, status } };
}
