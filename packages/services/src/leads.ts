// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Lead Service
// CRUD operations + qualification + conversion with full audit logging
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@venture-os/db';
import type {
  Lead,
  LeadStage,
  Client,
  AuditLog,
} from '@venture-os/shared';
import {
  createLeadSchema,
  updateLeadSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
} from '@venture-os/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeadServiceDeps {
  db: SupabaseClient;
}

export interface ListLeadsOptions {
  organization_id: string;
  company_id?: string;
  stage?: LeadStage;
  assigned_agent?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface QualifyLeadInput {
  score: number;
  notes?: string;
  stage?: LeadStage;
}

interface ActorInfo {
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class LeadService {
  private db: SupabaseClient;

  constructor(deps: LeadServiceDeps) {
    this.db = deps.db;
  }

  /**
   * Create a new lead with validation and audit logging.
   */
  async create(input: CreateLeadInput, actor: ActorInfo): Promise<Lead> {
    const validated = createLeadSchema.parse(input);

    const { data, error } = await this.db
      .from('leads')
      .insert(validated)
      .select()
      .single();

    if (error) throw new Error(`Failed to create lead: ${error.message}`);
    const lead = data as Lead;

    await this.audit(lead.organization_id, actor, 'create', 'lead', lead.id, {
      contact_name: lead.contact_name,
      contact_email: lead.contact_email,
      stage: lead.stage,
      source: lead.source,
    });

    return lead;
  }

  /**
   * Update an existing lead with partial data.
   */
  async update(
    id: string,
    organization_id: string,
    input: UpdateLeadInput,
    actor: ActorInfo,
  ): Promise<Lead> {
    const validated = updateLeadSchema.parse(input);

    // Fetch current state for audit diff
    const { data: before } = await this.db
      .from('leads')
      .select()
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (!before) throw new Error(`Lead not found: ${id}`);

    const { data, error } = await this.db
      .from('leads')
      .update(validated)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update lead: ${error.message}`);
    const lead = data as Lead;

    // Compute changes for audit log
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(validated) as (keyof UpdateLeadInput)[]) {
      const oldVal = (before as Record<string, unknown>)[key];
      const newVal = (validated as Record<string, unknown>)[key];
      if (oldVal !== newVal) {
        changes[key] = { from: oldVal, to: newVal };
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.audit(organization_id, actor, 'update', 'lead', id, changes);
    }

    return lead;
  }

  /**
   * Get a single lead by ID.
   */
  async getById(id: string, organization_id: string): Promise<Lead | null> {
    const { data, error } = await this.db
      .from('leads')
      .select()
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }
    return (data as Lead) ?? null;
  }

  /**
   * List leads with filtering and pagination.
   */
  async list(options: ListLeadsOptions): Promise<{ leads: Lead[]; total: number }> {
    const pageSize = Math.min(options.page_size ?? 25, 100);
    const page = options.page ?? 1;
    const offset = (page - 1) * pageSize;

    let query = this.db
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', options.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (options.company_id) {
      query = query.eq('company_id', options.company_id);
    }
    if (options.stage) {
      query = query.eq('stage', options.stage);
    }
    if (options.assigned_agent) {
      query = query.eq('assigned_agent', options.assigned_agent);
    }
    if (options.search) {
      query = query.or(
        `contact_name.ilike.%${options.search}%,contact_email.ilike.%${options.search}%`,
      );
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list leads: ${error.message}`);

    return {
      leads: (data ?? []) as Lead[],
      total: count ?? 0,
    };
  }

  /**
   * Qualify a lead — update its score and optionally advance the stage.
   */
  async qualify(
    id: string,
    organization_id: string,
    input: QualifyLeadInput,
    actor: ActorInfo,
  ): Promise<Lead> {
    const updatePayload: UpdateLeadInput = {
      score: input.score,
    };

    if (input.notes) {
      updatePayload.notes = input.notes;
    }

    // Auto-advance stage if score threshold is met and no explicit stage given
    if (input.stage) {
      updatePayload.stage = input.stage;
    } else if (input.score >= 70) {
      // Fetch current stage to decide advancement
      const current = await this.getById(id, organization_id);
      if (current && current.stage === 'new') {
        updatePayload.stage = 'contacted';
      } else if (current && current.stage === 'contacted') {
        updatePayload.stage = 'qualified';
      }
    }

    return this.update(id, organization_id, updatePayload, actor);
  }

  /**
   * Convert a won lead into a client record.
   * Updates the lead stage to 'won' and creates the client.
   */
  async convertToClient(
    leadId: string,
    organization_id: string,
    actor: ActorInfo,
  ): Promise<{ lead: Lead; client: Client }> {
    const lead = await this.getById(leadId, organization_id);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    if (lead.stage === 'lost') {
      throw new Error('Cannot convert a lost lead to a client');
    }

    if (lead.converted_client_id) {
      throw new Error('Lead has already been converted');
    }

    // Create client from lead data
    const { data: clientData, error: clientError } = await this.db
      .from('clients')
      .insert({
        organization_id: lead.organization_id,
        company_id: lead.company_id,
        name: lead.contact_name,
        email: lead.contact_email,
        phone: lead.contact_phone,
        status: 'active',
        onboarded_at: new Date().toISOString(),
        notes: lead.notes,
      })
      .select()
      .single();

    if (clientError) {
      throw new Error(`Failed to create client: ${clientError.message}`);
    }

    const client = clientData as Client;

    // Update lead to won with reference to new client
    const updatedLead = await this.update(
      leadId,
      organization_id,
      {
        stage: 'won',
      },
      actor,
    );

    // Set the converted_client_id separately since it's not in the update schema
    await this.db
      .from('leads')
      .update({ converted_client_id: client.id })
      .eq('id', leadId);

    // Audit the conversion
    await this.audit(organization_id, actor, 'convert', 'lead', leadId, {
      converted_to_client_id: client.id,
      client_name: client.name,
    });

    return { lead: { ...updatedLead, converted_client_id: client.id }, client };
  }

  /**
   * Mark a lead as lost with a reason.
   */
  async markLost(
    id: string,
    organization_id: string,
    reason: string,
    actor: ActorInfo,
  ): Promise<Lead> {
    return this.update(
      id,
      organization_id,
      { stage: 'lost', notes: reason },
      actor,
    );
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private async audit(
    organization_id: string,
    actor: ActorInfo,
    action: string,
    resource_type: string,
    resource_id: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    await this.db.from('audit_logs').insert({
      organization_id,
      actor_type: actor.actor_type,
      actor_id: actor.actor_id,
      action,
      resource_type,
      resource_id,
      changes,
    });
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createLeadService(deps: LeadServiceDeps): LeadService {
  return new LeadService(deps);
}
