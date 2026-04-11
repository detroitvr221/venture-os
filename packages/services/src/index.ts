// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — @venture-os/services barrel export
// ─────────────────────────────────────────────────────────────────────────────

export { LeadService, createLeadService } from './leads';
export type { LeadServiceDeps, ListLeadsOptions, QualifyLeadInput } from './leads';

export { BillingService, createBillingService } from './billing';
export type {
  BillingServiceDeps,
  StripeAdapter,
  CreateSubscriptionInput,
  RecordUsageInput,
  GenerateInvoiceInput,
} from './billing';

export { CommsService, createCommsService } from './comms';
export type {
  CommsServiceDeps,
  EmailProviderAdapter,
  SmsProviderAdapter,
  SendEmailInput,
  SendSmsInput,
  ComplianceCheckResult,
} from './comms';

export { ApprovalService, createApprovalService } from './approvals';
export type {
  ApprovalServiceDeps,
  CreateApprovalInput,
  DecideApprovalInput,
  ListApprovalsOptions,
} from './approvals';
