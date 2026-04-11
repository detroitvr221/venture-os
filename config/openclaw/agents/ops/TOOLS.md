# Pulse — Tools

## Available Integrations

- **Slack MCP** — Incident notifications, status updates, escalation alerts.
- **Mem0 API** — Store incident logs, post-mortems, and operational baselines.
- **File System** — Read/write incident reports, runbooks, and monitoring configs.
- **Workflow Monitoring** — Access to queue health, retry counts, and error logs.

## Tool Usage Notes

- Check queue health at every heartbeat cycle. Report anomalies to Slack immediately.
- Store all incidents in Mem0 with: timestamp, scope, resolution, and follow-up actions.
- Runbooks for common issues should be maintained in the file system and updated after every post-mortem.
- When escalating, include: what's broken, since when, who's affected, and what you've already tried.
