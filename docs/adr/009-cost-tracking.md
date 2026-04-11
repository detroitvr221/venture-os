# ADR-009: AI Agent Cost Tracking

## Status
Accepted

## Context
AI model API calls (LLMs, embeddings, etc.) have per-token costs that can accumulate rapidly, especially with 11 agents running concurrently. Without visibility into costs, organizations risk unexpected bills and cannot optimize their AI spend.

## Decision
We track AI costs at the orchestrator level with the following granularity:

- **Per-call**: Every LLM call records input tokens, output tokens, model used, and calculated USD cost
- **Per-thread**: Costs are aggregated per conversation thread
- **Per-agent**: Costs are aggregated per agent for comparison
- **Per-organization**: Total organizational AI spend with period summaries

Cost tracking is implemented in the orchestrator (`packages/agents/src/orchestrator.ts`) which calculates costs based on a model pricing table and writes records to the `agent_costs` table.

The Finance agent monitors costs against budgets and alerts the CEO agent when spending exceeds 80% of the monthly budget. At 100%, the system recommends cost reduction measures to the AI Integration agent.

## Consequences
- **Positive**: Full visibility into AI spend by agent, thread, and organization.
- **Positive**: Enables cost-per-task and ROI analysis for AI operations.
- **Positive**: Budget alerts prevent unexpected overspend.
- **Negative**: Cost calculation depends on accurate model pricing data that must be maintained.
- **Negative**: Additional database writes for every LLM call.
