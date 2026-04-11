# ADR-004: Approval Gates for High-Risk Actions

## Status
Accepted

## Context
AI agents must not autonomously execute high-value or irreversible actions without human oversight. Actions such as sending large proposals, deploying to production, processing payouts, or launching mass email campaigns carry significant business risk.

## Decision
We implement an **approval gate system** that pauses agent workflows when they attempt actions above defined thresholds. The approval service:

1. Detects actions that require approval based on configurable rules (amount thresholds, action types)
2. Creates a pending approval record linked to the workflow run
3. Pauses the workflow run
4. Notifies the appropriate approver (CEO, admin, or owner depending on the action)
5. Resumes the workflow on approval or fails it on rejection
6. Automatically rejects expired approval requests

Key approval thresholds:
- Proposals over $5,000 require CEO approval
- Mass emails (>100 recipients) require admin approval
- New venture creation requires CEO approval
- Production deployments require admin approval
- Payouts over $1,000 require owner approval

## Consequences
- **Positive**: Humans maintain control over consequential decisions.
- **Positive**: Clear audit trail for every approval decision.
- **Positive**: Configurable thresholds allow organizations to tune risk tolerance.
- **Negative**: Introduces latency for actions that need approval.
- **Negative**: Expired approvals can cause workflow failures that need handling.
