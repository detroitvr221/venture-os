// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — Launch Company Workflow
// Creates a new sub-company with brand, default KPIs, and approval gate.
// ─────────────────────────────────────────────────────────────────────────────

import { task, logger } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { createClient } from '@venture-os/db';

// ─── Input Schema ───────────────────────────────────────────────────────────

const LaunchCompanyPayload = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
  settings: z.record(z.unknown()).default({}),
  brand: z
    .object({
      voice_guidelines: z.string().optional(),
      colors: z.record(z.string()).default({ primary: '#3b82f6', secondary: '#8b5cf6' }),
      fonts: z.record(z.string()).default({ heading: 'Inter', body: 'Inter' }),
    })
    .default({}),
  requested_by: z.string(), // user_id or agent name
});

type LaunchCompanyPayload = z.infer<typeof LaunchCompanyPayload>;

// ─── Default KPIs ───────────────────────────────────────────────────────────

function getDefaultKpis(orgId: string, companyId: string, period: string) {
  return [
    {
      organization_id: orgId,
      company_id: companyId,
      name: 'Monthly Revenue',
      metric_key: 'monthly_revenue',
      current_value: 0,
      target_value: 10000,
      unit: 'USD',
      period,
      trend: null,
      metadata: {},
    },
    {
      organization_id: orgId,
      company_id: companyId,
      name: 'Active Clients',
      metric_key: 'active_clients',
      current_value: 0,
      target_value: 5,
      unit: 'count',
      period,
      trend: null,
      metadata: {},
    },
    {
      organization_id: orgId,
      company_id: companyId,
      name: 'Lead Conversion Rate',
      metric_key: 'lead_conversion_rate',
      current_value: 0,
      target_value: 20,
      unit: '%',
      period,
      trend: null,
      metadata: {},
    },
    {
      organization_id: orgId,
      company_id: companyId,
      name: 'Customer Satisfaction',
      metric_key: 'csat_score',
      current_value: 0,
      target_value: 90,
      unit: '%',
      period,
      trend: null,
      metadata: {},
    },
    {
      organization_id: orgId,
      company_id: companyId,
      name: 'Agent Efficiency',
      metric_key: 'agent_efficiency',
      current_value: 0,
      target_value: 85,
      unit: '%',
      period,
      trend: null,
      metadata: {},
    },
  ];
}

// ─── Default Workflows ──────────────────────────────────────────────────────

function getDefaultWorkflows(orgId: string) {
  return [
    {
      organization_id: orgId,
      name: 'Lead Intake',
      description: 'Automatically process and score incoming leads',
      trigger_type: 'event',
      trigger_config: { event: 'lead.created' },
      status: 'active',
      steps_definition: [
        { action: 'score_lead', agent: 'sales' },
        { action: 'assign_agent', agent: 'sales' },
        { action: 'qualify_or_follow_up', agent: 'sales' },
      ],
    },
    {
      organization_id: orgId,
      name: 'Client Onboarding',
      description: 'Onboard new clients with welcome sequence and setup tasks',
      trigger_type: 'event',
      trigger_config: { event: 'client.created' },
      status: 'active',
      steps_definition: [
        { action: 'send_welcome_email', agent: 'sales' },
        { action: 'create_project', agent: 'ops' },
        { action: 'initial_audit', agent: 'seo' },
      ],
    },
    {
      organization_id: orgId,
      name: 'Monthly Reporting',
      description: 'Generate and distribute monthly performance reports',
      trigger_type: 'schedule',
      trigger_config: { cron: '0 9 1 * *' },
      status: 'active',
      steps_definition: [
        { action: 'aggregate_kpis', agent: 'finance' },
        { action: 'generate_report', agent: 'finance' },
        { action: 'distribute_report', agent: 'ops' },
      ],
    },
  ];
}

// ─── Main Task ──────────────────────────────────────────────────────────────

export const launchCompanyTask = task({
  id: 'launch-company',
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: LaunchCompanyPayload) => {
    const validated = LaunchCompanyPayload.parse(payload);
    const db = createClient();

    logger.info('Launching new sub-company', { name: validated.name, slug: validated.slug });

    // 1. Check for slug uniqueness
    const { data: existing } = await db
      .from('sub_companies')
      .select('id')
      .eq('organization_id', validated.organization_id)
      .eq('slug', validated.slug)
      .single();

    if (existing) {
      throw new Error(`A company with slug "${validated.slug}" already exists in this organization`);
    }

    // 2. Create sub_company record
    const { data: company, error: companyError } = await db
      .from('sub_companies')
      .insert({
        organization_id: validated.organization_id,
        name: validated.name,
        slug: validated.slug,
        industry: validated.industry ?? null,
        website: validated.website ?? null,
        settings: {
          ...validated.settings,
          status: 'pending_activation',
          created_by_workflow: true,
        },
      })
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create sub-company: ${companyError.message}`);
    }

    const companyId = company.id;
    logger.info('Sub-company created', { company_id: companyId });

    // Log to audit
    await db.from('audit_logs').insert({
      organization_id: validated.organization_id,
      actor_type: 'system',
      actor_id: 'launch-company-workflow',
      action: 'create',
      resource_type: 'sub_company',
      resource_id: companyId,
      changes: { name: validated.name, slug: validated.slug, industry: validated.industry },
    });

    // 3. Create brand record with defaults
    const { data: brand, error: brandError } = await db
      .from('brands')
      .insert({
        organization_id: validated.organization_id,
        company_id: companyId,
        name: validated.name,
        voice_guidelines: validated.brand.voice_guidelines ?? `Professional, innovative, and results-driven. Speak as ${validated.name}.`,
        colors: validated.brand.colors,
        logo_url: null,
        fonts: validated.brand.fonts,
      })
      .select('id')
      .single();

    if (brandError) {
      logger.error('Failed to create brand', { error: brandError.message });
    } else {
      logger.info('Brand created', { brand_id: brand?.id });

      await db.from('audit_logs').insert({
        organization_id: validated.organization_id,
        actor_type: 'system',
        actor_id: 'launch-company-workflow',
        action: 'create',
        resource_type: 'brand',
        resource_id: brand!.id,
        changes: { company_id: companyId, name: validated.name },
      });
    }

    // 4. Create default KPIs
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const defaultKpis = getDefaultKpis(validated.organization_id, companyId, currentPeriod);

    const { error: kpiError } = await db.from('kpis').insert(defaultKpis);
    if (kpiError) {
      logger.error('Failed to create default KPIs', { error: kpiError.message });
    } else {
      logger.info('Default KPIs created', { count: defaultKpis.length });

      await db.from('audit_logs').insert({
        organization_id: validated.organization_id,
        actor_type: 'system',
        actor_id: 'launch-company-workflow',
        action: 'create',
        resource_type: 'kpi',
        resource_id: companyId,
        changes: { kpi_count: defaultKpis.length, period: currentPeriod },
      });
    }

    // 5. Create default workflows
    const defaultWorkflows = getDefaultWorkflows(validated.organization_id);

    const { error: wfError } = await db.from('workflows').insert(defaultWorkflows);
    if (wfError) {
      logger.error('Failed to create default workflows', { error: wfError.message });
    } else {
      logger.info('Default workflows created', { count: defaultWorkflows.length });

      await db.from('audit_logs').insert({
        organization_id: validated.organization_id,
        actor_type: 'system',
        actor_id: 'launch-company-workflow',
        action: 'create',
        resource_type: 'workflow',
        resource_id: companyId,
        changes: { workflow_count: defaultWorkflows.length },
      });
    }

    // 6. Create approval gate for activation
    const { data: approval, error: approvalError } = await db
      .from('approvals')
      .insert({
        organization_id: validated.organization_id,
        workflow_run_id: null,
        resource_type: 'sub_company',
        resource_id: companyId,
        requested_by: validated.requested_by,
        status: 'pending',
        reason: `Activate new sub-company: ${validated.name} (${validated.industry ?? 'General'})`,
        context: {
          company_name: validated.name,
          slug: validated.slug,
          industry: validated.industry,
          website: validated.website,
          brand_created: !brandError,
          kpis_created: !kpiError,
          workflows_created: !wfError,
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7-day expiry
      })
      .select('id')
      .single();

    if (approvalError) {
      logger.error('Failed to create activation approval', { error: approvalError.message });
    } else {
      logger.info('Activation approval created', { approval_id: approval?.id });

      await db.from('audit_logs').insert({
        organization_id: validated.organization_id,
        actor_type: 'system',
        actor_id: 'launch-company-workflow',
        action: 'create',
        resource_type: 'approval',
        resource_id: approval!.id,
        changes: {
          company_id: companyId,
          company_name: validated.name,
          requested_by: validated.requested_by,
        },
      });
    }

    // 7. Notify
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text:
            `:rocket: *New Sub-Company Created*\n` +
            `> *Name:* ${validated.name}\n` +
            `> *Industry:* ${validated.industry ?? 'Not specified'}\n` +
            `> *Slug:* ${validated.slug}\n` +
            `> *Status:* Pending activation approval\n` +
            `> Requested by: ${validated.requested_by}`,
        }),
      }).catch((err) => logger.error('Slack notification failed', { error: err }));
    }

    logger.info('Launch company workflow complete', {
      company_id: companyId,
      approval_id: approval?.id,
    });

    return {
      company_id: companyId,
      brand_id: brand?.id ?? null,
      approval_id: approval?.id ?? null,
      kpis_created: defaultKpis.length,
      workflows_created: defaultWorkflows.length,
      status: 'pending_activation',
    };
  },
});
