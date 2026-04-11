// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Communications Service
// COMPLIANCE-FIRST: Every outbound message must pass consent, suppression,
// and quiet-hours checks before sending. No exceptions.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@venture-os/db';
import type {
  CommunicationChannel,
  ConsentType,
  EmailLog,
  SmsLog,
  CallLog,
  ConsentRecord,
} from '@venture-os/shared';
import { DEFAULT_QUIET_HOURS } from '@venture-os/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CommsServiceDeps {
  db: SupabaseClient;
  /** Optional email provider adapter. */
  emailProvider?: EmailProviderAdapter;
  /** Optional SMS provider adapter. */
  smsProvider?: SmsProviderAdapter;
}

export interface EmailProviderAdapter {
  send(params: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    reply_to?: string;
    headers?: Record<string, string>;
  }): Promise<{ message_id: string; status: string }>;
}

export interface SmsProviderAdapter {
  send(params: {
    from: string;
    to: string;
    body: string;
  }): Promise<{ message_id: string; status: string }>;
}

export interface SendEmailInput {
  organization_id: string;
  company_id: string;
  contact_id?: string;
  campaign_id?: string;
  from_address: string;
  to_address: string;
  subject: string;
  html_body: string;
  text_body?: string;
}

export interface SendSmsInput {
  organization_id: string;
  company_id: string;
  contact_id?: string;
  campaign_id?: string;
  from_number: string;
  to_number: string;
  body: string;
}

export type ComplianceCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string };

interface ActorInfo {
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class CommsService {
  private db: SupabaseClient;
  private emailProvider: EmailProviderAdapter | null;
  private smsProvider: SmsProviderAdapter | null;

  constructor(deps: CommsServiceDeps) {
    this.db = deps.db;
    this.emailProvider = deps.emailProvider ?? null;
    this.smsProvider = deps.smsProvider ?? null;
  }

  // ─── Email ─────────────────────────────────────────────────────────────

  /**
   * Send an email with full compliance checks.
   * NEVER sends without passing consent, suppression, and quiet-hours checks.
   */
  async sendEmail(input: SendEmailInput, actor: ActorInfo): Promise<EmailLog> {
    // 1. Run ALL compliance checks
    const complianceResult = await this.runComplianceChecks(
      input.organization_id,
      input.company_id,
      input.contact_id ?? null,
      input.to_address,
      'email',
    );

    if (!complianceResult.allowed) {
      // Log the blocked attempt
      const log = await this.logEmail(input, 'failed', null);
      await this.audit(input.organization_id, actor, 'send', 'email_log', log.id, {
        blocked: true,
        reason: complianceResult.reason,
        to_address: input.to_address,
      });
      throw new Error(`Communication blocked: ${complianceResult.reason}`);
    }

    // 2. Send via provider
    let providerMessageId: string | null = null;
    let status: EmailLog['status'] = 'queued';

    if (this.emailProvider) {
      try {
        const result = await this.emailProvider.send({
          from: input.from_address,
          to: input.to_address,
          subject: input.subject,
          html: input.html_body,
          text: input.text_body,
        });
        providerMessageId = result.message_id;
        status = 'sent';
      } catch (err) {
        status = 'failed';
        const log = await this.logEmail(input, status, null);
        await this.audit(input.organization_id, actor, 'send', 'email_log', log.id, {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }

    // 3. Log the email
    const log = await this.logEmail(input, status, providerMessageId);

    // 4. Audit trail
    await this.audit(input.organization_id, actor, 'send', 'email_log', log.id, {
      to_address: input.to_address,
      subject: input.subject,
      status,
    });

    return log;
  }

  // ─── SMS ───────────────────────────────────────────────────────────────

  /**
   * Send an SMS with full compliance checks.
   * NEVER sends without passing consent, suppression, and quiet-hours checks.
   */
  async sendSms(input: SendSmsInput, actor: ActorInfo): Promise<SmsLog> {
    // 1. Run ALL compliance checks
    const complianceResult = await this.runComplianceChecks(
      input.organization_id,
      input.company_id,
      input.contact_id ?? null,
      input.to_number,
      'sms',
    );

    if (!complianceResult.allowed) {
      const log = await this.logSms(input, 'failed', null);
      await this.audit(input.organization_id, actor, 'send', 'sms_log', log.id, {
        blocked: true,
        reason: complianceResult.reason,
        to_number: input.to_number,
      });
      throw new Error(`Communication blocked: ${complianceResult.reason}`);
    }

    // 2. Send via provider
    let providerMessageId: string | null = null;
    let status: SmsLog['status'] = 'queued';

    if (this.smsProvider) {
      try {
        const result = await this.smsProvider.send({
          from: input.from_number,
          to: input.to_number,
          body: input.body,
        });
        providerMessageId = result.message_id;
        status = 'sent';
      } catch (err) {
        status = 'failed';
        const log = await this.logSms(input, status, null);
        await this.audit(input.organization_id, actor, 'send', 'sms_log', log.id, {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    }

    // 3. Log the SMS
    const log = await this.logSms(input, status, providerMessageId);

    // 4. Audit trail
    await this.audit(input.organization_id, actor, 'send', 'sms_log', log.id, {
      to_number: input.to_number,
      status,
    });

    return log;
  }

  // ─── Compliance Checks ─────────────────────────────────────────────────

  /**
   * Run ALL compliance checks for outbound communication.
   * Returns { allowed: true } or { allowed: false, reason: string }.
   */
  async runComplianceChecks(
    organization_id: string,
    company_id: string,
    contact_id: string | null,
    recipient: string,
    channel: CommunicationChannel,
  ): Promise<ComplianceCheckResult> {
    // Check 1: Consent
    const consentCheck = await this.checkConsent(
      organization_id,
      company_id,
      contact_id,
      channel,
    );
    if (!consentCheck.allowed) return consentCheck;

    // Check 2: Suppression list
    const suppressionCheck = await this.checkSuppression(
      organization_id,
      recipient,
      channel,
    );
    if (!suppressionCheck.allowed) return suppressionCheck;

    // Check 3: Quiet hours
    const quietHoursCheck = this.checkQuietHours(channel);
    if (!quietHoursCheck.allowed) return quietHoursCheck;

    // Check 4: Rate limits
    const rateLimitCheck = await this.checkRateLimit(
      organization_id,
      channel,
    );
    if (!rateLimitCheck.allowed) return rateLimitCheck;

    return { allowed: true };
  }

  /**
   * Verify that the contact has given consent for this communication channel.
   */
  async checkConsent(
    organization_id: string,
    company_id: string,
    contact_id: string | null,
    channel: CommunicationChannel,
  ): Promise<ComplianceCheckResult> {
    if (!contact_id) {
      // If no contact_id, we cannot verify consent — block by default
      return { allowed: false, reason: 'No contact_id provided; cannot verify consent' };
    }

    const consentType = this.channelToConsentType(channel);

    const { data } = await this.db
      .from('consent_records')
      .select()
      .eq('organization_id', organization_id)
      .eq('company_id', company_id)
      .eq('contact_id', contact_id)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return {
        allowed: false,
        reason: `No active ${consentType} consent found for contact ${contact_id}`,
      };
    }

    // Check if consent has expired
    const consent = data as ConsentRecord;
    if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      return {
        allowed: false,
        reason: `Consent for ${consentType} expired on ${consent.expires_at}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if the recipient is on the suppression list.
   * Suppression = contact has explicitly unsubscribed or bounced hard.
   */
  async checkSuppression(
    organization_id: string,
    recipient: string,
    channel: CommunicationChannel,
  ): Promise<ComplianceCheckResult> {
    if (channel === 'email') {
      // Check for hard bounces
      const { data: bounces } = await this.db
        .from('email_logs')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('to_address', recipient)
        .eq('status', 'bounced')
        .limit(1);

      if (bounces && bounces.length > 0) {
        return {
          allowed: false,
          reason: `Email address ${recipient} is on suppression list (hard bounce)`,
        };
      }
    }

    if (channel === 'sms') {
      // Check for failed SMS (carrier block)
      const { data: failures } = await this.db
        .from('sms_logs')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('to_number', recipient)
        .eq('status', 'failed')
        .limit(3);

      if (failures && failures.length >= 3) {
        return {
          allowed: false,
          reason: `Phone number ${recipient} is on suppression list (multiple delivery failures)`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if the current time falls within quiet hours.
   * Quiet hours: 9 PM to 8 AM in the configured timezone.
   */
  checkQuietHours(channel: CommunicationChannel): ComplianceCheckResult {
    // Only enforce quiet hours for direct communication channels
    if (channel !== 'sms' && channel !== 'phone') {
      return { allowed: true };
    }

    const now = new Date();
    // Simple hour-based check (in production, use proper timezone library)
    const hour = now.getHours();
    const startHour = parseInt(DEFAULT_QUIET_HOURS.start.split(':')[0]!, 10);
    const endHour = parseInt(DEFAULT_QUIET_HOURS.end.split(':')[0]!, 10);

    const isQuietTime = hour >= startHour || hour < endHour;

    if (isQuietTime) {
      return {
        allowed: false,
        reason: `Quiet hours in effect (${DEFAULT_QUIET_HOURS.start} - ${DEFAULT_QUIET_HOURS.end} ${DEFAULT_QUIET_HOURS.timezone}). SMS and phone calls are not permitted during this time.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check rate limits for outbound communications.
   */
  async checkRateLimit(
    organization_id: string,
    channel: CommunicationChannel,
  ): Promise<ComplianceCheckResult> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    if (channel === 'email') {
      const { count } = await this.db
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .gte('created_at', oneHourAgo);

      if ((count ?? 0) >= 100) {
        return {
          allowed: false,
          reason: 'Email rate limit exceeded (100 per hour)',
        };
      }
    }

    if (channel === 'sms') {
      const { count } = await this.db
        .from('sms_logs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .gte('created_at', oneHourAgo);

      if ((count ?? 0) >= 50) {
        return {
          allowed: false,
          reason: 'SMS rate limit exceeded (50 per hour)',
        };
      }
    }

    return { allowed: true };
  }

  // ─── Consent Management ────────────────────────────────────────────────

  /**
   * Record consent for a contact.
   */
  async grantConsent(
    organization_id: string,
    company_id: string,
    contact_id: string,
    consentType: ConsentType,
    source: string,
    ipAddress?: string,
  ): Promise<ConsentRecord> {
    const { data, error } = await this.db
      .from('consent_records')
      .insert({
        organization_id,
        company_id,
        contact_id,
        consent_type: consentType,
        granted: true,
        source,
        ip_address: ipAddress ?? null,
        granted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record consent: ${error.message}`);
    return data as ConsentRecord;
  }

  /**
   * Revoke consent for a contact.
   */
  async revokeConsent(
    organization_id: string,
    company_id: string,
    contact_id: string,
    consentType: ConsentType,
  ): Promise<void> {
    const { error } = await this.db
      .from('consent_records')
      .update({ revoked_at: new Date().toISOString(), granted: false })
      .eq('organization_id', organization_id)
      .eq('company_id', company_id)
      .eq('contact_id', contact_id)
      .eq('consent_type', consentType)
      .eq('granted', true)
      .is('revoked_at', null);

    if (error) throw new Error(`Failed to revoke consent: ${error.message}`);
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private channelToConsentType(channel: CommunicationChannel): ConsentType {
    switch (channel) {
      case 'email':
        return 'email';
      case 'sms':
        return 'sms';
      case 'phone':
        return 'phone';
      case 'linkedin':
      case 'chat':
        return 'marketing';
    }
  }

  private async logEmail(
    input: SendEmailInput,
    status: EmailLog['status'],
    providerMessageId: string | null,
  ): Promise<EmailLog> {
    const { data, error } = await this.db
      .from('email_logs')
      .insert({
        organization_id: input.organization_id,
        company_id: input.company_id,
        contact_id: input.contact_id ?? null,
        campaign_id: input.campaign_id ?? null,
        from_address: input.from_address,
        to_address: input.to_address,
        subject: input.subject,
        body_preview: input.html_body.slice(0, 500),
        status,
        provider_message_id: providerMessageId,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to log email: ${error.message}`);
    return data as EmailLog;
  }

  private async logSms(
    input: SendSmsInput,
    status: SmsLog['status'],
    providerMessageId: string | null,
  ): Promise<SmsLog> {
    const { data, error } = await this.db
      .from('sms_logs')
      .insert({
        organization_id: input.organization_id,
        company_id: input.company_id,
        contact_id: input.contact_id ?? null,
        campaign_id: input.campaign_id ?? null,
        from_number: input.from_number,
        to_number: input.to_number,
        body: input.body,
        status,
        provider_message_id: providerMessageId,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to log SMS: ${error.message}`);
    return data as SmsLog;
  }

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

export function createCommsService(deps: CommsServiceDeps): CommsService {
  return new CommsService(deps);
}
