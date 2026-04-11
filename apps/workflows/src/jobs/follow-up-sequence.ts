// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Follow-Up Sequence Workflow
// Compliance-first: checks consent, suppression, quiet hours before every send.
// ─────────────────────────────────────────────────────────────────────────────

import { task, logger, wait } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { createClient } from '@venture-os/db';
import { Resend } from 'resend';
import type { ConsentRecord } from '@venture-os/shared';
import { DEFAULT_QUIET_HOURS } from '@venture-os/shared';

// ─── Input Schema ───────────────────────────────────────────────────────────

const FollowUpPayload = z.object({
  organization_id: z.string().uuid(),
  company_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  sequence_template: z.object({
    name: z.string(),
    steps: z.array(
      z.object({
        step_number: z.number().int().min(1),
        subject: z.string(),
        body_html: z.string(),
        delay_hours: z.number().min(0).default(24),
      }),
    ),
  }),
  from_address: z.string().email().default('outreach@ventureos.ai'),
  current_step: z.number().int().min(1).default(1),
  max_attempts: z.number().int().min(1).max(10).default(3),
});

type FollowUpPayload = z.infer<typeof FollowUpPayload>;

// ─── Compliance Checks ──────────────────────────────────────────────────────

async function checkConsent(
  db: ReturnType<typeof createClient>,
  orgId: string,
  companyId: string,
  contactId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data } = await db
    .from('consent_records')
    .select('*')
    .eq('organization_id', orgId)
    .eq('company_id', companyId)
    .eq('contact_id', contactId)
    .eq('consent_type', 'email')
    .eq('granted', true)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return { allowed: false, reason: 'No active email consent found for this contact' };
  }

  const consent = data as ConsentRecord;
  if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
    return { allowed: false, reason: `Email consent expired on ${consent.expires_at}` };
  }

  return { allowed: true };
}

async function checkSuppression(
  db: ReturnType<typeof createClient>,
  orgId: string,
  toAddress: string,
): Promise<{ allowed: boolean; reason?: string }> {
  // Check for hard bounces
  const { data: bounces } = await db
    .from('email_logs')
    .select('id')
    .eq('organization_id', orgId)
    .eq('to_address', toAddress)
    .eq('status', 'bounced')
    .limit(1);

  if (bounces && bounces.length > 0) {
    return { allowed: false, reason: `Email address ${toAddress} is on suppression list (hard bounce)` };
  }

  return { allowed: true };
}

function checkQuietHours(contactTimezone?: string): { allowed: boolean; reason?: string } {
  const tz = contactTimezone ?? DEFAULT_QUIET_HOURS.timezone;

  // Get current hour in contact's timezone
  let hour: number;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: tz,
    });
    hour = parseInt(formatter.format(new Date()), 10);
  } catch {
    // Fallback to UTC
    hour = new Date().getUTCHours();
  }

  const startHour = parseInt(DEFAULT_QUIET_HOURS.start.split(':')[0]!, 10); // 21 = 9PM
  const endHour = parseInt(DEFAULT_QUIET_HOURS.end.split(':')[0]!, 10); // 8 = 8AM

  if (hour >= startHour || hour < endHour) {
    return {
      allowed: false,
      reason: `Quiet hours in effect (${DEFAULT_QUIET_HOURS.start} - ${DEFAULT_QUIET_HOURS.end} ${tz}). Will retry later.`,
    };
  }

  return { allowed: true };
}

async function hasResponded(
  db: ReturnType<typeof createClient>,
  orgId: string,
  contactId: string,
): Promise<boolean> {
  // Check if there's been any response (email_opened or email_clicked events)
  const { data } = await db
    .from('outreach_events')
    .select('id')
    .eq('organization_id', orgId)
    .eq('contact_id', contactId)
    .in('event_type', ['email_opened', 'email_clicked'])
    .limit(1);

  return (data ?? []).length > 0;
}

// ─── Main Task ──────────────────────────────────────────────────────────────

export const followUpSequenceTask = task({
  id: 'follow-up-sequence',
  maxDuration: 60,
  retry: { maxAttempts: 3 },
  run: async (payload: FollowUpPayload) => {
    const validated = FollowUpPayload.parse(payload);
    const db = createClient();

    const step = validated.sequence_template.steps.find(
      (s) => s.step_number === validated.current_step,
    );

    if (!step) {
      logger.info('Sequence complete: no more steps', {
        contact_id: validated.contact_id,
        current_step: validated.current_step,
      });
      return { status: 'sequence_complete', steps_executed: validated.current_step - 1 };
    }

    logger.info('Processing follow-up step', {
      contact_id: validated.contact_id,
      step: validated.current_step,
      sequence: validated.sequence_template.name,
    });

    // 1. Fetch the contact's email
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('email, first_name, last_name')
      .eq('id', validated.contact_id)
      .eq('organization_id', validated.organization_id)
      .single();

    if (contactError || !contact) {
      throw new Error(`Contact not found: ${validated.contact_id}`);
    }

    const toAddress = contact.email;

    // 2. Check consent
    const consentCheck = await checkConsent(
      db,
      validated.organization_id,
      validated.company_id,
      validated.contact_id,
    );
    if (!consentCheck.allowed) {
      logger.warn('Consent check failed, aborting sequence', { reason: consentCheck.reason });
      await logBlockedAttempt(db, validated, toAddress, consentCheck.reason!);
      return { status: 'blocked', reason: consentCheck.reason };
    }

    // 3. Check suppression list
    const suppressionCheck = await checkSuppression(db, validated.organization_id, toAddress);
    if (!suppressionCheck.allowed) {
      logger.warn('Suppression check failed, aborting sequence', { reason: suppressionCheck.reason });
      await logBlockedAttempt(db, validated, toAddress, suppressionCheck.reason!);
      return { status: 'blocked', reason: suppressionCheck.reason };
    }

    // 4. Check quiet hours
    const quietCheck = checkQuietHours();
    if (!quietCheck.allowed) {
      logger.info('Quiet hours in effect, will wait', { reason: quietCheck.reason });
      // Wait until 8 AM (up to 12 hours)
      await wait.for({ hours: 1 });
      // Re-trigger self with same params (the retry will re-check quiet hours)
      return { status: 'deferred_quiet_hours', will_retry: true };
    }

    // 5. Check if contact has responded (stop if they have)
    const responded = await hasResponded(db, validated.organization_id, validated.contact_id);
    if (responded) {
      logger.info('Contact has responded, ending sequence', { contact_id: validated.contact_id });
      return { status: 'contact_responded', steps_executed: validated.current_step - 1 };
    }

    // 6. Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    let providerMessageId: string | null = null;
    let sendStatus: 'sent' | 'failed' = 'sent';

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      try {
        const result = await resend.emails.send({
          from: validated.from_address,
          to: toAddress,
          subject: personalizeContent(step.subject, contact.first_name),
          html: personalizeContent(step.body_html, contact.first_name),
        });

        providerMessageId = result.data?.id ?? null;
        logger.info('Email sent', { provider_message_id: providerMessageId });
      } catch (error) {
        sendStatus = 'failed';
        logger.error('Failed to send email', { error });
      }
    } else {
      logger.warn('RESEND_API_KEY not set, email queued but not sent');
    }

    // 7. Log to email_logs
    await db.from('email_logs').insert({
      organization_id: validated.organization_id,
      company_id: validated.company_id,
      contact_id: validated.contact_id,
      from_address: validated.from_address,
      to_address: toAddress,
      subject: personalizeContent(step.subject, contact.first_name),
      body_preview: step.body_html.slice(0, 500),
      status: sendStatus,
      provider_message_id: providerMessageId,
      sent_at: sendStatus === 'sent' ? new Date().toISOString() : null,
    });

    // Log to outreach_events
    await db.from('outreach_events').insert({
      organization_id: validated.organization_id,
      company_id: validated.company_id,
      client_id: validated.company_id,
      contact_id: validated.contact_id,
      event_type: 'email_sent',
      channel: 'email',
      metadata: {
        sequence_name: validated.sequence_template.name,
        step_number: validated.current_step,
        subject: step.subject,
      },
      occurred_at: new Date().toISOString(),
    });

    // 8. Check if this was the last attempt or last step
    const isLastStep = validated.current_step >= validated.sequence_template.steps.length;
    const reachedMaxAttempts = validated.current_step >= validated.max_attempts;

    if (isLastStep || reachedMaxAttempts) {
      logger.info('Sequence complete', {
        contact_id: validated.contact_id,
        reason: isLastStep ? 'all_steps_complete' : 'max_attempts_reached',
      });

      // Audit log
      await db.from('audit_logs').insert({
        organization_id: validated.organization_id,
        actor_type: 'system',
        actor_id: 'follow-up-sequence-workflow',
        action: 'send',
        resource_type: 'outreach_event',
        resource_id: validated.contact_id,
        changes: {
          sequence_name: validated.sequence_template.name,
          status: 'sequence_complete',
          steps_executed: validated.current_step,
        },
      });

      return {
        status: 'sequence_complete',
        steps_executed: validated.current_step,
        final_step_sent: sendStatus === 'sent',
      };
    }

    // 9. Schedule next follow-up step
    const nextStep = validated.sequence_template.steps.find(
      (s) => s.step_number === validated.current_step + 1,
    );
    const delayHours = nextStep?.delay_hours ?? 24;

    logger.info('Scheduling next step', {
      next_step: validated.current_step + 1,
      delay_hours: delayHours,
    });

    // Use Trigger.dev wait to schedule the next step
    await wait.for({ hours: delayHours });

    // Recursively trigger the next step
    await followUpSequenceTask.trigger({
      ...validated,
      current_step: validated.current_step + 1,
    });

    return {
      status: 'step_sent',
      current_step: validated.current_step,
      next_step: validated.current_step + 1,
      delay_hours: delayHours,
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function personalizeContent(template: string, firstName: string): string {
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{name\}\}/g, firstName);
}

async function logBlockedAttempt(
  db: ReturnType<typeof createClient>,
  payload: FollowUpPayload,
  toAddress: string,
  reason: string,
): Promise<void> {
  await db.from('email_logs').insert({
    organization_id: payload.organization_id,
    company_id: payload.company_id,
    contact_id: payload.contact_id,
    from_address: payload.from_address,
    to_address: toAddress,
    subject: `[BLOCKED] Follow-up step ${payload.current_step}`,
    body_preview: `Blocked: ${reason}`,
    status: 'failed',
    provider_message_id: null,
    sent_at: null,
  });

  await db.from('audit_logs').insert({
    organization_id: payload.organization_id,
    actor_type: 'system',
    actor_id: 'follow-up-sequence-workflow',
    action: 'send',
    resource_type: 'email_log',
    resource_id: payload.contact_id,
    changes: {
      blocked: true,
      reason,
      sequence_name: payload.sequence_template.name,
      step: payload.current_step,
    },
  });
}
