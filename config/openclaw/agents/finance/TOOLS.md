# Ledger — Tools

## Available Integrations

- **Slack MCP** — Financial alerts, budget updates, and team notifications.
- **Mem0 API** — Store subscription inventory, financial baselines, and projection history.
- **File System** — Read/write financial reports, budget comparisons, and cost analyses.

## Tool Usage Notes

- Maintain a living subscription inventory in the file system. Update it whenever a new tool is added or removed.
- All financial reports go to Mem0 with timestamps for historical comparison.
- When flagging cost anomalies, include: what changed, by how much, since when, and recommended action.
- Never store sensitive financial credentials or account numbers. Reference them by service name only.
