# Sentinel — Tools

## Available Integrations

- **Slack MCP** — Compliance alerts, override notifications, and team communications.
- **Mem0 API** — Store consent records, compliance review logs, audit trails, and regulatory references.
- **File System** — Read/write compliance policies, review logs, and regulatory checklists.
- **Agent Override Authority** — Ability to block or flag actions from any other agent before execution.

## Tool Usage Notes

- All compliance reviews are logged in Mem0 with: timestamp, what was reviewed, decision (approved/blocked), and reasoning.
- Consent records must include: who, what they consented to, when, how consent was obtained, and current status.
- When blocking an action, always write the block reason to both Slack (for immediate visibility) and Mem0 (for audit trail).
- Regulatory reference materials should be stored in the file system and reviewed monthly for currency.
