// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Shared constants used across all packages
// ─────────────────────────────────────────────────────────────────────────────

import type {
  LeadStage,
  ProjectStatus,
  TaskStatus,
  ProposalStatus,
  ApprovalStatus,
  AgentName,
  CommunicationChannel,
  BillingInterval,
  CampaignStatus,
  OrgMemberRole,
  SeoSeverity,
  SubscriptionStatus,
  InvoiceStatus,
  ConsentType,
  AuditAction,
  MemoryScope,
  WorkflowStatus,
  WorkflowRunStatus,
} from './types';

// ─── Lead Pipeline ───────────────────────────────────────────────────────────

export const LEAD_STAGES: readonly LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const;

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

// ─── Project ─────────────────────────────────────────────────────────────────

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'cancelled',
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ─── Task ────────────────────────────────────────────────────────────────────

export const TASK_STATUSES: readonly TaskStatus[] = [
  'backlog',
  'in_progress',
  'review',
  'done',
] as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

// ─── Proposal ────────────────────────────────────────────────────────────────

export const PROPOSAL_STATUSES: readonly ProposalStatus[] = [
  'draft',
  'sent',
  'accepted',
  'rejected',
] as const;

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

// ─── Approval ────────────────────────────────────────────────────────────────

export const APPROVAL_STATUSES: readonly ApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
] as const;

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ─── Agent Roster ────────────────────────────────────────────────────────────

export const AGENT_NAMES: readonly AgentName[] = [
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
] as const;

export const AGENT_DISPLAY_NAMES: Record<AgentName, string> = {
  ceo: 'Chief Executive Officer',
  sales: 'Sales Agent',
  seo: 'SEO Specialist',
  'web-presence': 'Web Presence Manager',
  'ai-integration': 'AI Integration Specialist',
  'venture-builder': 'Venture Builder',
  developer: 'Developer Agent',
  ops: 'Operations Manager',
  finance: 'Finance Agent',
  research: 'Research Analyst',
  compliance: 'Compliance Officer',
};

// ─── Communication ───────────────────────────────────────────────────────────

export const COMMUNICATION_CHANNELS: readonly CommunicationChannel[] = [
  'email',
  'sms',
  'phone',
  'linkedin',
  'chat',
] as const;

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  phone: 'Phone',
  linkedin: 'LinkedIn',
  chat: 'Chat',
};

// ─── Billing ─────────────────────────────────────────────────────────────────

export const BILLING_INTERVALS: readonly BillingInterval[] = [
  'monthly',
  'quarterly',
  'yearly',
] as const;

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'paused',
] as const;

export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
] as const;

// ─── Campaign ────────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = [
  'draft',
  'scheduled',
  'active',
  'paused',
  'completed',
] as const;

// ─── Roles ───────────────────────────────────────────────────────────────────

export const ORG_MEMBER_ROLES: readonly OrgMemberRole[] = [
  'owner',
  'admin',
  'agent',
  'viewer',
] as const;

// ─── SEO ─────────────────────────────────────────────────────────────────────

export const SEO_SEVERITIES: readonly SeoSeverity[] = [
  'info',
  'warning',
  'error',
  'critical',
] as const;

// ─── Consent ─────────────────────────────────────────────────────────────────

export const CONSENT_TYPES: readonly ConsentType[] = [
  'email',
  'sms',
  'phone',
  'marketing',
  'data_processing',
] as const;

// ─── Audit ───────────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'login',
  'export',
  'send',
  'convert',
] as const;

// ─── Memory ──────────────────────────────────────────────────────────────────

export const MEMORY_SCOPES: readonly MemoryScope[] = [
  'organization',
  'company',
  'client',
  'project',
  'agent',
] as const;

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const WORKFLOW_STATUSES: readonly WorkflowStatus[] = [
  'active',
  'paused',
  'completed',
  'failed',
] as const;

export const WORKFLOW_RUN_STATUSES: readonly WorkflowRunStatus[] = [
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const;

// ─── Quiet Hours (for compliance-safe outreach) ──────────────────────────────

export const DEFAULT_QUIET_HOURS = {
  start: '21:00', // 9 PM local time
  end: '08:00',   // 8 AM local time
  timezone: 'America/New_York',
} as const;

// ─── Rate Limits ─────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  emails_per_hour: 100,
  sms_per_hour: 50,
  api_calls_per_minute: 60,
  crawl_pages_per_run: 500,
} as const;

// ─── Default Pagination ──────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
