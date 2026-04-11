// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — Zod validation schemas for API input
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ─── Reusable primitives ─────────────────────────────────────────────────────

const uuid = z.string().uuid();
const email = z.string().email().max(320);
const phone = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid E.164 phone number')
  .optional()
  .nullable();
const url = z.string().url().max(2048);
const shortText = z.string().min(1).max(255);
const longText = z.string().max(10_000);

// ─── Lead ────────────────────────────────────────────────────────────────────

export const createLeadSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  contact_name: shortText,
  contact_email: email,
  contact_phone: phone,
  source: z.string().max(100).optional().nullable(),
  stage: z
    .enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
    .default('new'),
  score: z.number().int().min(0).max(100).default(0),
  assigned_agent: z
    .enum([
      'ceo',
      'sales',
      'seo',
      'web-presence',
      'ai-integration',
      'venture-builder',
      'developer',
      'ops',
      'finance',
      'research',
      'compliance',
    ])
    .optional()
    .nullable(),
  notes: longText.optional().nullable(),
  expected_value: z.number().min(0).optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial().omit({
  organization_id: true,
  company_id: true,
});

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ─── Client ──────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  name: shortText,
  email: email,
  phone: phone,
  website: url.optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  tier: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'churned', 'paused']).default('active'),
  notes: longText.optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial().omit({
  organization_id: true,
  company_id: true,
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

// ─── Contact ─────────────────────────────────────────────────────────────────

export const createContactSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  client_id: uuid,
  first_name: shortText,
  last_name: shortText,
  email: email,
  phone: phone,
  role: z.string().max(100).optional().nullable(),
  is_primary: z.boolean().default(false),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial().omit({
  organization_id: true,
  company_id: true,
  client_id: true,
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ─── Project ─────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  client_id: uuid,
  name: shortText,
  description: longText.optional().nullable(),
  status: z
    .enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .default('planning'),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  budget: z.number().min(0).optional().nullable(),
  settings: z.record(z.unknown()).default({}),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().omit({
  organization_id: true,
  company_id: true,
  client_id: true,
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ─── Proposal ────────────────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  client_id: uuid,
  title: shortText,
  status: z.enum(['draft', 'sent', 'accepted', 'rejected']).default('draft'),
  content: z.record(z.unknown()).default({}),
  total_amount: z.number().min(0),
  valid_until: z.string().datetime().optional().nullable(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;

export const updateProposalSchema = createProposalSchema.partial().omit({
  organization_id: true,
  company_id: true,
  client_id: true,
});

export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;

// ─── Outreach Event ──────────────────────────────────────────────────────────

export const createOutreachEventSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  client_id: uuid,
  campaign_id: uuid.optional().nullable(),
  contact_id: uuid.optional().nullable(),
  event_type: z.enum([
    'email_sent',
    'email_opened',
    'email_clicked',
    'email_bounced',
    'sms_sent',
    'sms_delivered',
    'call_started',
    'call_completed',
    'meeting_scheduled',
  ]),
  channel: z.enum(['email', 'sms', 'phone', 'linkedin', 'chat']),
  metadata: z.record(z.unknown()).default({}),
  occurred_at: z.string().datetime().default(() => new Date().toISOString()),
});

export type CreateOutreachEventInput = z.infer<typeof createOutreachEventSchema>;

// ─── Task ────────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  organization_id: uuid,
  project_id: uuid,
  title: shortText,
  description: longText.optional().nullable(),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_agent: z
    .enum([
      'ceo',
      'sales',
      'seo',
      'web-presence',
      'ai-integration',
      'venture-builder',
      'developer',
      'ops',
      'finance',
      'research',
      'compliance',
    ])
    .optional()
    .nullable(),
  assigned_user_id: uuid.optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  parent_task_id: uuid.optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().omit({
  organization_id: true,
  project_id: true,
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ─── Campaign ────────────────────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  name: shortText,
  channel: z.enum(['email', 'sms', 'phone', 'linkedin', 'chat']),
  status: z
    .enum(['draft', 'scheduled', 'active', 'paused', 'completed'])
    .default('draft'),
  audience_filter: z.record(z.unknown()).default({}),
  content_template: z.record(z.unknown()).default({}),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

// ─── Consent Record ──────────────────────────────────────────────────────────

export const createConsentRecordSchema = z.object({
  organization_id: uuid,
  company_id: uuid,
  contact_id: uuid,
  consent_type: z.enum(['email', 'sms', 'phone', 'marketing', 'data_processing']),
  granted: z.boolean(),
  ip_address: z.string().ip().optional().nullable(),
  source: z.string().max(255).optional().nullable(),
});

export type CreateConsentRecordInput = z.infer<typeof createConsentRecordSchema>;
