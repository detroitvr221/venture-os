// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Proposal Generation Workflow
// Uses OpenAI to generate a professional proposal from lead/client data.
// ─────────────────────────────────────────────────────────────────────────────

import { task, logger } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { createClient } from '@venture-os/db';
import OpenAI from 'openai';
import type { Lead, Client } from '@venture-os/shared';

// ─── Input Schema ───────────────────────────────────────────────────────────

const ProposalGenPayload = z.object({
  organization_id: z.string().uuid(),
  company_id: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
  services: z.array(z.string()).optional(),
  custom_instructions: z.string().optional(),
});

type ProposalGenPayload = z.infer<typeof ProposalGenPayload>;

// ─── Main Task ──────────────────────────────────────────────────────────────

export const proposalGenerationTask = task({
  id: 'proposal-generation',
  maxDuration: 180,
  retry: { maxAttempts: 2 },
  run: async (payload: ProposalGenPayload) => {
    const validated = ProposalGenPayload.parse(payload);
    const db = createClient();

    if (!validated.lead_id && !validated.client_id) {
      throw new Error('Either lead_id or client_id must be provided');
    }

    logger.info('Starting proposal generation', {
      lead_id: validated.lead_id,
      client_id: validated.client_id,
    });

    // 1. Pull lead or client data
    let contactName = '';
    let contactEmail = '';
    let companyName = '';
    let notes = '';
    let expectedValue = 0;
    let resolvedClientId = validated.client_id;

    if (validated.lead_id) {
      const { data: lead, error } = await db
        .from('leads')
        .select('*')
        .eq('id', validated.lead_id)
        .eq('organization_id', validated.organization_id)
        .single();

      if (error || !lead) {
        throw new Error(`Lead not found: ${validated.lead_id}`);
      }

      const typedLead = lead as Lead;
      contactName = typedLead.contact_name;
      contactEmail = typedLead.contact_email;
      companyName = typedLead.contact_name;
      notes = typedLead.notes ?? '';
      expectedValue = typedLead.expected_value ?? 0;
      resolvedClientId = typedLead.converted_client_id ?? validated.client_id;
    }

    if (validated.client_id) {
      const { data: client, error } = await db
        .from('clients')
        .select('*')
        .eq('id', validated.client_id)
        .eq('organization_id', validated.organization_id)
        .single();

      if (error || !client) {
        throw new Error(`Client not found: ${validated.client_id}`);
      }

      const typedClient = client as Client;
      contactName = typedClient.name;
      contactEmail = typedClient.email;
      companyName = typedClient.name;
      notes = typedClient.notes ?? '';
    }

    // 2. Determine services
    const services = validated.services ?? inferServicesFromNotes(notes);

    // 3. Fetch the organization's brand for tone
    const { data: brand } = await db
      .from('brands')
      .select('name, voice_guidelines')
      .eq('organization_id', validated.organization_id)
      .eq('company_id', validated.company_id)
      .limit(1)
      .single();

    // 4. Generate proposal with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = buildProposalPrompt({
      contactName,
      companyName,
      services,
      expectedValue,
      notes,
      brandName: brand?.name ?? 'VentureOS',
      voiceGuidelines: brand?.voice_guidelines ?? 'Professional, confident, results-oriented.',
      customInstructions: validated.custom_instructions,
    });

    logger.info('Generating proposal with OpenAI');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional business proposal writer. Generate structured, compelling proposals in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content ?? '{}';
    let proposalContent: Record<string, unknown>;

    try {
      proposalContent = JSON.parse(responseText);
    } catch {
      logger.error('Failed to parse OpenAI response as JSON');
      proposalContent = {
        raw_response: responseText,
        parse_error: true,
      };
    }

    // 5. Calculate total amount
    const totalAmount =
      expectedValue > 0
        ? expectedValue
        : calculateAmountFromServices(services);

    // 6. Create proposal record
    const { data: proposal, error: proposalError } = await db
      .from('proposals')
      .insert({
        organization_id: validated.organization_id,
        company_id: validated.company_id,
        client_id: resolvedClientId ?? validated.company_id,
        title: `Proposal: ${services.join(', ')} for ${companyName}`,
        status: 'draft',
        content: {
          ...proposalContent,
          generated_by: 'proposal-generation-workflow',
          generated_at: new Date().toISOString(),
          services_included: services,
          contact_name: contactName,
          contact_email: contactEmail,
        },
        total_amount: totalAmount,
        valid_until: getValidUntilDate(),
      })
      .select('id')
      .single();

    if (proposalError) {
      throw new Error(`Failed to create proposal: ${proposalError.message}`);
    }

    const proposalId = proposal!.id;
    logger.info('Proposal created', { proposal_id: proposalId });

    // 7. Audit log
    await db.from('audit_logs').insert({
      organization_id: validated.organization_id,
      actor_type: 'system',
      actor_id: 'proposal-generation-workflow',
      action: 'create',
      resource_type: 'proposal',
      resource_id: proposalId,
      changes: {
        lead_id: validated.lead_id,
        client_id: validated.client_id,
        services,
        total_amount: totalAmount,
        ai_model: 'gpt-4o',
      },
    });

    // 8. Notify for review (Slack)
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text:
            `:page_facing_up: *New Proposal Draft Created*\n` +
            `> *For:* ${contactName} (${companyName})\n` +
            `> *Services:* ${services.join(', ')}\n` +
            `> *Amount:* $${totalAmount.toLocaleString()}\n` +
            `> *Status:* Draft — awaiting review`,
        }),
      }).catch((err) => logger.error('Slack notification failed', { error: err }));
    }

    return {
      proposal_id: proposalId,
      contact_name: contactName,
      services,
      total_amount: totalAmount,
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildProposalPrompt(params: {
  contactName: string;
  companyName: string;
  services: string[];
  expectedValue: number;
  notes: string;
  brandName: string;
  voiceGuidelines: string;
  customInstructions?: string;
}): string {
  return `Generate a professional business proposal as a JSON object with the following structure:
{
  "executive_summary": "2-3 paragraph executive summary",
  "scope_of_work": [{"service": "name", "description": "details", "deliverables": ["list"], "timeline": "duration"}],
  "pricing": {"services": [{"name": "...", "price": number}], "total": number, "payment_terms": "..."},
  "timeline": {"phases": [{"name": "...", "duration": "...", "milestones": ["..."]}]},
  "why_us": ["3-4 differentiators"],
  "next_steps": ["actionable next steps"],
  "terms": "brief terms and conditions"
}

Client Details:
- Contact: ${params.contactName}
- Company: ${params.companyName}
- Services Requested: ${params.services.join(', ')}
- Estimated Budget: $${params.expectedValue.toLocaleString()}
- Additional Notes: ${params.notes || 'None provided'}

Our Brand: ${params.brandName}
Voice/Tone: ${params.voiceGuidelines}
${params.customInstructions ? `Custom Instructions: ${params.customInstructions}` : ''}

Make the proposal compelling, specific, and results-focused. Include realistic timelines and deliverables.`;
}

function inferServicesFromNotes(notes: string): string[] {
  const text = notes.toLowerCase();
  const services: string[] = [];

  if (text.includes('seo') || text.includes('search')) services.push('SEO Optimization');
  if (text.includes('web') || text.includes('site') || text.includes('design')) services.push('Web Development');
  if (text.includes('ai') || text.includes('automation') || text.includes('ml')) services.push('AI Integration');
  if (text.includes('content') || text.includes('blog') || text.includes('marketing')) services.push('Content Strategy');
  if (text.includes('app') || text.includes('mobile') || text.includes('software')) services.push('Custom Software Development');

  return services.length > 0 ? services : ['Digital Consulting'];
}

function calculateAmountFromServices(services: string[]): number {
  const pricing: Record<string, number> = {
    'SEO Optimization': 5000,
    'Web Development': 15000,
    'AI Integration': 25000,
    'Content Strategy': 8000,
    'Custom Software Development': 30000,
    'Digital Consulting': 10000,
  };

  return services.reduce((total, service) => total + (pricing[service] ?? 10000), 0);
}

function getValidUntilDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}
