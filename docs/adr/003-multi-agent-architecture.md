# ADR-003: Multi-Agent Architecture with Orchestrator

## Status
Accepted

## Context
VentureOS requires specialized AI capabilities across sales, SEO, web presence, development, finance, compliance, and more. A single monolithic AI agent would become unmanageable and produce lower-quality outputs due to context overload.

## Decision
We adopt a **multi-agent architecture** with 11 specialized agents, each with its own system prompt, tools, memory scope, and boundaries. A central **Orchestrator** routes requests to the appropriate agent, manages handoffs between agents, and enforces approval gates.

The 11 agents are: CEO, Sales, SEO, Web Presence, AI Integration, Venture Builder, Developer, Ops, Finance, Research, and Compliance.

Each agent definition lives in `packages/agents/src/roster/{name}.md` and specifies:
- Identity and role
- Available tools and capabilities
- Memory scope (what it can remember)
- Boundaries (what it cannot do)
- Handoff rules (when to pass to another agent)

## Consequences
- **Positive**: Each agent has focused context, leading to higher-quality outputs.
- **Positive**: Clear separation of concerns; agents can be updated independently.
- **Positive**: Handoff protocol enables complex multi-step workflows across domains.
- **Negative**: Orchestration adds latency (routing decision + potential handoffs).
- **Negative**: More system prompts to maintain and keep consistent.
