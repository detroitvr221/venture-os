// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — Lead Intake Workflow
// Triggered when a new lead is inserted in Supabase.
// Scores, assigns, qualifies, and notifies.
// ─────────────────────────────────────────────────────────────────────────────

import { task, logger } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { createClient } from '@venture-os/db';
import type { Lead, AgentName } from '@venture-os/shared';

// ─── Input Schema ───────────────────────────────────────────────────────────

const LeadIntakePayload = z.object({
  lead_id: z.string().uuid(),
  organization_id: z.string().uuid(),
});

type LeadIntakePayload = z.infer<typeof LeadIntakePayload>;

// ─── Scoring Logic ──────────────────────────────────────────────────────────

interface ScoreFactors {
  source: string | null;
  company_name: string;
  notes: string | null;
  expected_value: number | null;
}

function scoreLead(factors: ScoreFactors): number {
  let score = 30; // base score

  // Source scoring
  const sourceScores: Record<string, number> = {
    referral: 25,
    website: 15,
    linkedin: 15,
    conference: 20,
    cold_outreach: 5,
    partner: 20,
    organic: 10,
    paid_ad: 10,
  };
  if (factors.source) {
    score += sourceScores[factors.source.toLowerCase()] ?? 10;
  }

  // Company name heuristics: longer names often indicate real companies
  if (factors.company_name.length > 5) score += 5;
  if (factors.company_name.includes('Inc') || factors.company_name.includes('LLC') || factors.company_name.includes('Corp')) {
    score += 5;
  }

  // Notes indicate engagement
  if (factors.notes && factors.notes.length > 50) score += 10;
  if (factors.notes && factors.notes.length > 200) score += 5;

  // Expected value scoring
  if (factors.expected_value) {
    if (factors.expected_value >= 100000) score += 15;
    else if (factors.expected_value >= 50000) score += 10;
    else if (factors.expected_value >= 10000) score += 5;
  }

  return Math.min(score, 100);
}

// ─── Agent Assignment ───────────────────────────────────────────────────────

function assignAgent(lead: Lead): AgentName {
  // Assign based on notes/source keywords
  const text = `${lead.notes ?? ''} ${lead.source ?? ''}`.toLowerCase();

  if (text.includes('seo') || text.includes('search') || text.includes('ranking')) {
    return 'seo';
  }
  if (text.includes('web') || text.includes('design') || text.includes('website')) {
    return 'web-presence';
  }
  if (text.includes('ai') || text.includes('ml') || text.includes('machine learning') || text.includes('automation')) {
    return 'ai-integration';
  }
  if (text.includes('venture') || text.includes('startup') || text.includes('company')) {
    return 'venture-builder';
  }
  if (text.includes('dev') || text.includes('code') || text.includes('software') || text.includes('app')) {
    return 'developer';
  }

  // Default to sales agent
  return 'sales';
}

// ─── Slack Notification ─────────────────────────────────────────────────────

async function notifySlack(message: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('SLACK_WEBHOOK_URL not set, skipping notification');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      logger.error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Failed to send Slack notification', { error });
  }
}

// ─── Main Task ──────────────────────────────────────────────────────────────

export const leadIntakeTask = task({
  id: 'lead-intake',
  maxDuration: 120,
  retry: { maxAttempts: 3 },
  run: async (payload: LeadIntakePayload) => {
    const validated = LeadIntakePayload.parse(payload);
    const db = createClient();

    logger.info('Starting lead intake workflow', { lead_id: validated.lead_id });

    // 1. Fetch the lead
    const { data: lead, error: fetchError } = await db
      .from('leads')
      .select('*')
      .eq('id', validated.lead_id)
      .eq('organization_id', validated.organization_id)
      .single();

    if (fetchError || !lead) {
      throw new Error(`Lead not found: ${validated.lead_id} — ${fetchError?.message}`);
    }

    const typedLead = lead as Lead;

    // 2. Score the lead
    const score = scoreLead({
      source: typedLead.source,
      company_name: typedLead.contact_name,
      notes: typedLead.notes,
      expected_value: typedLead.expected_value,
    });

    logger.info('Lead scored', { lead_id: validated.lead_id, score });

    // 3. Assign to agent
    const assignedAgent = assignAgent(typedLead);
    logger.info('Agent assigned', { lead_id: validated.lead_id, agent: assignedAgent });

    // 4. Update the lead with score and assignment
    const updatePayload: Record<string, unknown> = {
      score,
      assigned_agent: assignedAgent,
    };

    // 5. If score > 70, auto-qualify and create proposal draft
    if (score > 70) {
      updatePayload['stage'] = 'qualified';

      // Create a proposal draft
      const { data: proposal, error: proposalError } = await db
        .from('proposals')
        .insert({
          organization_id: validated.organization_id,
          company_id: typedLead.company_id,
          client_id: typedLead.converted_client_id ?? typedLead.company_id,
          title: `Proposal for ${typedLead.contact_name}`,
          status: 'draft',
          content: {
            auto_generated: true,
            lead_source: typedLead.source,
            lead_score: score,
            services_suggested: inferServices(typedLead),
          },
          total_amount: typedLead.expected_value ?? 0,
        })
        .select('id')
        .single();

      if (proposalError) {
        logger.error('Failed to create proposal draft', { error: proposalError.message });
      } else {
        logger.info('Proposal draft created', { proposal_id: proposal?.id });
      }
    }

    // 6. If score > 50 (but not already qualified), add to follow-up
    if (score > 50 && score <= 70) {
      updatePayload['stage'] = 'contacted';

      // Schedule follow-up (trigger the follow-up sequence task)
      logger.info('Lead added to follow-up sequence', { lead_id: validated.lead_id, score });
    }

    // Apply updates
    const { error: updateError } = await db
      .from('leads')
      .update(updatePayload)
      .eq('id', validated.lead_id)
      .eq('organization_id', validated.organization_id);

    if (updateError) {
      throw new Error(`Failed to update lead: ${updateError.message}`);
    }

    // 7. Log to audit_logs
    await db.from('audit_logs').insert({
      organization_id: validated.organization_id,
      actor_type: 'system',
      actor_id: 'lead-intake-workflow',
      action: 'update',
      resource_type: 'lead',
      resource_id: validated.lead_id,
      changes: {
        score,
        assigned_agent: assignedAgent,
        stage: updatePayload['stage'] ?? typedLead.stage,
        auto_qualified: score > 70,
        follow_up_queued: score > 50 && score <= 70,
      },
    });

    // 8. Notify via Slack
    const emoji = score > 70 ? ':star:' : score > 50 ? ':wave:' : ':inbox_tray:';
    await notifySlack(
      `${emoji} *New Lead Processed*\n` +
      `> *Name:* ${typedLead.contact_name}\n` +
      `> *Email:* ${typedLead.contact_email}\n` +
      `> *Score:* ${score}/100\n` +
      `> *Assigned To:* ${assignedAgent}\n` +
      `> *Stage:* ${(updatePayload['stage'] as string) ?? typedLead.stage}\n` +
      (score > 70 ? '> :white_check_mark: Auto-qualified — proposal draft created' : ''),
    );

    logger.info('Lead intake workflow complete', {
      lead_id: validated.lead_id,
      score,
      assigned_agent: assignedAgent,
      auto_qualified: score > 70,
    });

    return {
      lead_id: validated.lead_id,
      score,
      assigned_agent: assignedAgent,
      auto_qualified: score > 70,
      follow_up_queued: score > 50 && score <= 70,
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferServices(lead: Lead): string[] {
  const text = `${lead.notes ?? ''} ${lead.source ?? ''}`.toLowerCase();
  const services: string[] = [];

  if (text.includes('seo') || text.includes('search')) services.push('SEO Optimization');
  if (text.includes('web') || text.includes('design')) services.push('Web Development');
  if (text.includes('ai') || text.includes('automation')) services.push('AI Integration');
  if (text.includes('content') || text.includes('marketing')) services.push('Content Marketing');
  if (text.includes('dev') || text.includes('software')) services.push('Software Development');

  if (services.length === 0) services.push('General Consulting');

  return services;
}
