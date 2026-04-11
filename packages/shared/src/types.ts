// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Canonical TypeScript types for the entire data model
// ─────────────────────────────────────────────────────────────────────────────

/** Common columns present on every row in the system. */
export interface BaseEntity {
  id: string; // uuid
  created_at: string; // ISO-8601 timestamptz
  updated_at: string; // ISO-8601 timestamptz
}

/** Every org-scoped table carries this. */
export interface OrgScoped extends BaseEntity {
  organization_id: string;
}

/** Sub-company scoped tables carry both org and company. */
export interface CompanyScoped extends OrgScoped {
  company_id: string;
}

/** Client-scoped tables carry org, company, and client. */
export interface ClientScoped extends CompanyScoped {
  client_id: string;
}

// ─── Organization ────────────────────────────────────────────────────────────

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  logo_url: string | null;
  billing_email: string;
  stripe_customer_id: string | null;
  settings: Record<string, unknown>;
}

export type OrgMemberRole = 'owner' | 'admin' | 'agent' | 'viewer';

export interface OrganizationMember extends OrgScoped {
  user_id: string;
  role: OrgMemberRole;
  invited_email: string | null;
  accepted_at: string | null;
}

// ─── Sub-Company & Brand ─────────────────────────────────────────────────────

export interface SubCompany extends OrgScoped {
  name: string;
  slug: string;
  industry: string | null;
  website: string | null;
  settings: Record<string, unknown>;
}

export interface Brand extends CompanyScoped {
  name: string;
  voice_guidelines: string | null;
  colors: Record<string, string>;
  logo_url: string | null;
  fonts: Record<string, string>;
}

// ─── CRM: Clients, Contacts, Leads ──────────────────────────────────────────

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface Lead extends CompanyScoped {
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  source: string | null;
  stage: LeadStage;
  score: number;
  assigned_agent: string | null;
  notes: string | null;
  expected_value: number | null;
  lost_reason: string | null;
  converted_client_id: string | null;
}

export interface Client extends CompanyScoped {
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  tier: string | null;
  status: 'active' | 'churned' | 'paused';
  onboarded_at: string | null;
  notes: string | null;
}

export interface Contact extends ClientScoped {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
}

// ─── Projects & Tasks ────────────────────────────────────────────────────────

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project extends ClientScoped {
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  settings: Record<string, unknown>;
}

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Task extends OrgScoped {
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_agent: string | null;
  assigned_user_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  parent_task_id: string | null;
  metadata: Record<string, unknown>;
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Proposal extends ClientScoped {
  title: string;
  status: ProposalStatus;
  content: Record<string, unknown>; // structured JSON proposal body
  total_amount: number;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

// ─── Web Presence ────────────────────────────────────────────────────────────

export interface Website extends CompanyScoped {
  url: string;
  name: string;
  platform: string | null; // e.g. wordpress, shopify, custom
  last_crawled_at: string | null;
  health_score: number | null;
  metadata: Record<string, unknown>;
}

export type SeoSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface WebsiteAudit extends OrgScoped {
  website_id: string;
  audit_type: string; // seo, performance, accessibility, security
  score: number | null;
  findings_count: number;
  raw_data: Record<string, unknown>;
  completed_at: string;
}

export interface SeoFinding extends OrgScoped {
  audit_id: string;
  url: string;
  category: string;
  severity: SeoSeverity;
  title: string;
  description: string;
  recommendation: string | null;
  resolved: boolean;
}

export interface AiAssessment extends OrgScoped {
  website_id: string;
  assessment_type: string;
  summary: string;
  recommendations: string[];
  raw_data: Record<string, unknown>;
}

// ─── Agents & AI ─────────────────────────────────────────────────────────────

export type AgentName =
  | 'ceo'
  | 'sales'
  | 'seo'
  | 'web-presence'
  | 'ai-integration'
  | 'venture-builder'
  | 'developer'
  | 'ops'
  | 'finance'
  | 'research'
  | 'compliance';

export interface Agent extends OrgScoped {
  name: AgentName;
  display_name: string;
  description: string | null;
  model: string;
  system_prompt_version: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

export type ThreadStatus = 'open' | 'waiting' | 'closed';

export interface AgentThread extends OrgScoped {
  agent_id: string;
  parent_thread_id: string | null;
  status: ThreadStatus;
  subject: string | null;
  context: Record<string, unknown>;
  started_by: string; // user_id or agent name
  completed_at: string | null;
}

export interface AgentToolCall extends OrgScoped {
  thread_id: string;
  agent_name: AgentName;
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  duration_ms: number | null;
  error: string | null;
  called_at: string;
}

export interface AgentCost extends OrgScoped {
  thread_id: string | null;
  agent_name: AgentName;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  recorded_at: string;
}

// ─── Memory & Knowledge ─────────────────────────────────────────────────────

export type MemoryScope = 'organization' | 'company' | 'client' | 'project' | 'agent';

export interface Memory extends OrgScoped {
  scope: MemoryScope;
  scope_id: string; // the id of the org/company/client/project/agent
  content: string;
  embedding: number[] | null; // pgvector
  metadata: Record<string, unknown>;
  source: string | null;
}

export interface MemoryEntity extends OrgScoped {
  name: string;
  entity_type: string; // person, company, concept, etc.
  description: string | null;
  metadata: Record<string, unknown>;
}

export interface MemoryEdge extends OrgScoped {
  source_entity_id: string;
  target_entity_id: string;
  relation: string;
  weight: number;
  metadata: Record<string, unknown>;
}

export type KnowledgeSourceType = 'document' | 'url' | 'api' | 'manual';

export interface KnowledgeSource extends OrgScoped {
  company_id: string | null;
  name: string;
  source_type: KnowledgeSourceType;
  uri: string | null;
  content_hash: string | null;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
}

// ─── Workflows & Approvals ───────────────────────────────────────────────────

export type WorkflowStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface Workflow extends OrgScoped {
  name: string;
  description: string | null;
  trigger_type: string; // manual, schedule, event, webhook
  trigger_config: Record<string, unknown>;
  status: WorkflowStatus;
  steps_definition: Record<string, unknown>[];
}

export type WorkflowRunStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowRun extends OrgScoped {
  workflow_id: string;
  status: WorkflowRunStatus;
  current_step: number;
  context: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface WorkflowStep extends OrgScoped {
  run_id: string;
  step_index: number;
  agent_name: AgentName | null;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval extends OrgScoped {
  workflow_run_id: string | null;
  resource_type: string;
  resource_id: string;
  requested_by: string; // agent name or user_id
  decided_by: string | null;
  status: ApprovalStatus;
  reason: string | null;
  decided_at: string | null;
  expires_at: string | null;
  context: Record<string, unknown>;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused';

export interface Subscription extends OrgScoped {
  stripe_subscription_id: string | null;
  plan_name: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  current_period_start: string;
  current_period_end: string;
  cancel_at: string | null;
  metadata: Record<string, unknown>;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Invoice extends OrgScoped {
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  number: string;
  status: InvoiceStatus;
  amount_due: number;
  amount_paid: number;
  currency: string;
  line_items: Record<string, unknown>[];
  due_date: string | null;
  paid_at: string | null;
}

export interface UsageMeter extends OrgScoped {
  meter_name: string; // e.g. "agent_tokens", "api_calls", "crawl_pages"
  value: number;
  period_start: string;
  period_end: string;
  metadata: Record<string, unknown>;
}

export interface Payout extends OrgScoped {
  company_id: string | null;
  stripe_payout_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled';
  arrival_date: string | null;
  metadata: Record<string, unknown>;
}

// ─── Communications & Outreach ───────────────────────────────────────────────

export type CommunicationChannel = 'email' | 'sms' | 'phone' | 'linkedin' | 'chat';

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';

export interface Campaign extends CompanyScoped {
  name: string;
  channel: CommunicationChannel;
  status: CampaignStatus;
  audience_filter: Record<string, unknown>;
  content_template: Record<string, unknown>;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats: Record<string, unknown>;
}

export type OutreachEventType = 'email_sent' | 'email_opened' | 'email_clicked' | 'email_bounced' | 'sms_sent' | 'sms_delivered' | 'call_started' | 'call_completed' | 'meeting_scheduled';

export interface OutreachEvent extends CompanyScoped {
  campaign_id: string | null;
  contact_id: string | null;
  client_id: string;
  event_type: OutreachEventType;
  channel: CommunicationChannel;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export interface EmailLog extends CompanyScoped {
  contact_id: string | null;
  campaign_id: string | null;
  from_address: string;
  to_address: string;
  subject: string;
  body_preview: string | null;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  provider_message_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
}

export interface SmsLog extends CompanyScoped {
  contact_id: string | null;
  campaign_id: string | null;
  from_number: string;
  to_number: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  provider_message_id: string | null;
  sent_at: string | null;
}

export interface CallLog extends CompanyScoped {
  contact_id: string | null;
  from_number: string;
  to_number: string;
  direction: 'inbound' | 'outbound';
  duration_seconds: number | null;
  recording_url: string | null;
  transcript: string | null;
  outcome: string | null;
  started_at: string;
  ended_at: string | null;
}

export type ConsentType = 'email' | 'sms' | 'phone' | 'marketing' | 'data_processing';

export interface ConsentRecord extends CompanyScoped {
  contact_id: string;
  consent_type: ConsentType;
  granted: boolean;
  ip_address: string | null;
  source: string | null;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

// ─── Platform ────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'login'
  | 'export'
  | 'send'
  | 'convert';

export interface AuditLog extends OrgScoped {
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
}

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface Integration extends OrgScoped {
  provider: string; // stripe, sendgrid, twilio, openai, firecrawl, mem0, etc.
  status: IntegrationStatus;
  config: Record<string, unknown>; // encrypted at rest
  credentials_encrypted: string | null;
  last_synced_at: string | null;
  error_message: string | null;
}

export interface Playbook extends OrgScoped {
  company_id: string | null;
  name: string;
  description: string | null;
  trigger: string;
  steps: Record<string, unknown>[];
  is_active: boolean;
}

export interface Kpi extends OrgScoped {
  company_id: string | null;
  name: string;
  metric_key: string;
  current_value: number;
  target_value: number | null;
  unit: string | null;
  period: string; // e.g. "2025-Q1", "2025-03"
  trend: 'up' | 'down' | 'flat' | null;
  metadata: Record<string, unknown>;
}
