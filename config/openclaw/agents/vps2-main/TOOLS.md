# Relay — Tools

## Available Integrations

- **Slack MCP** — Primary communication bridge between VPS1 and VPS2. All cross-server coordination happens here.
- **Mem0 API** — Store task assignments, completion records, and VPS2 operational state.
- **File System** — Read/write task queues, status logs, and output staging.
- **Agent Messaging** — Direct communication with VPS2 agents (Scout, Ink, Metric).

## Tool Usage Notes

- Check Slack for inbound VPS1 tasks at every heartbeat cycle.
- Before assigning research tasks to VPS2 Scout, check Mem0 for existing research from VPS1 Scout.
- Maintain a task board in the file system: agent, task, status, ETA, requester.
- When delivering completed work back to VPS1, include the original request context so the receiving agent has full traceability.
