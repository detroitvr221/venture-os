# ADR-010: Sandbox Execution for Agent Actions

## Status
Accepted

## Context
AI agents execute actions that affect real systems — sending emails, modifying database records, deploying code, processing payments. Without proper isolation, a malfunctioning or misdirected agent could cause significant damage.

## Decision
We implement a **sandbox execution model** with the following safeguards:

### 1. Tool Boundary Enforcement
Each agent has a defined set of tools it can use. The orchestrator validates that tool calls match the agent's allowed toolset before execution. Agents cannot invoke tools outside their scope.

### 2. Action Validation
Every tool call input is validated against Zod schemas before execution. Invalid inputs are rejected with descriptive error messages.

### 3. Approval Gates
High-risk actions (defined in ADR-004) are intercepted by the orchestrator and require human approval before execution.

### 4. Rate Limiting
Per-agent and per-organization rate limits prevent runaway execution loops. The communications service has its own rate limits for outbound messages.

### 5. Cost Budgets
Per-organization monthly cost budgets are enforced. When a budget is exhausted, non-critical agent actions are throttled.

### 6. Rollback Logging
All mutations are logged with before/after state in the audit log, enabling manual rollback if an agent takes incorrect action.

### 7. Dry-Run Mode
Agents can execute in dry-run mode where actions are logged but not committed, allowing testing of new prompts and workflows without real-world impact.

## Consequences
- **Positive**: Defense in depth against agent errors and prompt injection.
- **Positive**: Clear boundaries make it safe to give agents more autonomy within their scope.
- **Positive**: Dry-run mode enables safe iteration on agent behavior.
- **Negative**: Multiple validation layers add execution overhead.
- **Negative**: Overly strict boundaries may prevent agents from handling edge cases.
