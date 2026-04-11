# ADR-005: Compliance-First Communications

## Status
Accepted

## Context
Outbound communications (email, SMS, phone) are subject to regulations including CAN-SPAM, GDPR, TCPA, and various national laws. Violations can result in significant fines and reputational damage. AI agents must never send communications without proper consent verification.

## Decision
The Communications Service (`packages/services/src/comms.ts`) enforces a **compliance-first** approach where every outbound message must pass ALL of the following checks before sending:

1. **Consent Check**: Verify the contact has an active, non-expired consent record for the communication channel
2. **Suppression Check**: Verify the recipient is not on the suppression list (hard bounces, repeated failures)
3. **Quiet Hours Check**: Block SMS and phone calls during configured quiet hours (default 9 PM - 8 AM)
4. **Rate Limit Check**: Enforce per-organization hourly sending limits

If any check fails, the message is blocked and the attempt is logged with the specific reason. There are no override mechanisms — blocked messages are blocked.

## Consequences
- **Positive**: Regulatory compliance by design; impossible to accidentally send without consent.
- **Positive**: Complete audit trail of all communication attempts (successful and blocked).
- **Positive**: Built-in rate limiting prevents accidental spam.
- **Negative**: Legitimate messages may be blocked if consent records are not properly maintained.
- **Negative**: Quiet hours enforcement may delay time-sensitive communications.
