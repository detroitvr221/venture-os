# Atlas — Tools

## Available Integrations

- **Slack MCP** — Read/send messages across all channels. Primary communication hub.
- **Mem0 API** — Long-term memory storage and retrieval. Use for persistent context across sessions.
- **File System** — Read/write to venture-os config and memory directories.
- **Agent Messaging** — Direct communication with all 10 other VPS1 agents and VPS2 coordinator (Relay).

## Tool Usage Notes

- Use Slack to check for unanswered team questions during heartbeat cycles.
- Use Mem0 to store and retrieve strategic context, client preferences, and decision history.
- When routing to other agents, include full context — don't make them ask follow-up questions.
- KPI data comes from Pulse (ops), Ledger (finance), and Mercury (sales). Request it; don't scrape it.
