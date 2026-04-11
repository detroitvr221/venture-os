'use server';

// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Server Actions
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
        setAll(cookiesToSet) {
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
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
      score: 0,
      assigned_agent: null,
      notes: (formData.get('notes') as string) || null,
      expected_value: formData.get('expected_value')
        ? parseFloat(formData.get('expected_value') as string)
        : null,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: `Failed to create lead: ${error.message}` };
  }

  await audit(db, orgId, 'create', 'lead', data.id, {
    contact_name: contactName,
    contact_email: contactEmail,
  });

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
    colors: { primary: '#3b82f6', secondary: '#8b5cf6' },
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
