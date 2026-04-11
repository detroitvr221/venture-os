# ADR-008: Comprehensive Audit Logging

## Status
Accepted

## Context
VentureOS processes sensitive business data and executes actions on behalf of users via AI agents. Regulatory compliance, security investigations, and operational debugging all require a complete record of who did what, when, and why.

## Decision
Every significant action in the system is logged to the `audit_logs` table with the following information:

- **actor_type**: `user`, `agent`, or `system`
- **actor_id**: The specific user ID, agent name, or system process
- **action**: The type of action (create, update, delete, approve, reject, send, convert, etc.)
- **resource_type**: The table/entity being acted upon
- **resource_id**: The specific record ID
- **changes**: A JSON diff showing what changed (before/after for updates)
- **ip_address** and **user_agent**: For user-initiated actions

Audit logging is implemented at the service layer, not the database layer, to capture rich context including the actor identity and semantic change descriptions. Audit logs are append-only — they cannot be updated or deleted through normal application code.

## Consequences
- **Positive**: Complete traceability for compliance and debugging.
- **Positive**: Agent actions are fully transparent and reviewable.
- **Positive**: Change diffs make it easy to understand what happened and revert if needed.
- **Negative**: Additional write on every mutation increases latency slightly.
- **Negative**: Audit log table grows continuously and needs a retention/archival strategy.
