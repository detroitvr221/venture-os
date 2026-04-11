// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Agent Orchestrator
// Routes requests to agents, manages handoffs, enforces approvals, tracks costs
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AgentName,
  AgentThread,
  AgentToolCall,
  AgentCost,
  Approval,
  AuditLog,
} from '@venture-os/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrchestratorContext {
  organization_id: string;
  company_id?: string;
  client_id?: string;
  user_id: string;
  role: string;
}

export interface AgentRequest {
  /** Which agent should handle this (or null for auto-routing). */
  target_agent?: AgentName;
  /** The user or system message that starts the request. */
  message: string;
  /** Optional structured context for the agent. */
  context?: Record<string, unknown>;
  /** If this is a continuation of an existing thread. */
  thread_id?: string;
  /** Priority override. */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AgentResponse {
  thread_id: string;
  agent: AgentName;
  message: string;
  actions_taken: ActionRecord[];
  handoffs: HandoffRecord[];
  approvals_requested: string[];
  cost: CostRecord;
  status: 'completed' | 'waiting_approval' | 'handed_off' | 'error';
}

export interface ActionRecord {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  duration_ms: number;
  success: boolean;
  error?: string;
}

export interface HandoffRecord {
  from_agent: AgentName;
  to_agent: AgentName;
  reason: string;
  context: Record<string, unknown>;
  timestamp: string;
}

export interface CostRecord {
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  model: string;
}

// ─── Routing table ───────────────────────────────────────────────────────────

/**
 * Keyword-based routing rules.
 * The orchestrator checks the message for these keywords to auto-route
 * when no explicit target_agent is provided.
 */
const ROUTING_RULES: Array<{ keywords: string[]; agent: AgentName; priority: number }> = [
  { keywords: ['lead', 'prospect', 'pipeline', 'deal', 'sales', 'proposal', 'close'], agent: 'sales', priority: 10 },
  { keywords: ['seo', 'ranking', 'organic', 'keyword', 'backlink', 'crawl', 'serp'], agent: 'seo', priority: 10 },
  { keywords: ['website', 'brand', 'content', 'social', 'digital presence'], agent: 'web-presence', priority: 10 },
  { keywords: ['ai', 'model', 'prompt', 'integration', 'automation', 'llm'], agent: 'ai-integration', priority: 10 },
  { keywords: ['venture', 'startup', 'launch', 'new business', 'opportunity'], agent: 'venture-builder', priority: 10 },
  { keywords: ['code', 'deploy', 'bug', 'feature', 'api', 'development', 'build'], agent: 'developer', priority: 10 },
  { keywords: ['project', 'task', 'onboard', 'resource', 'capacity', 'delivery'], agent: 'ops', priority: 5 },
  { keywords: ['invoice', 'billing', 'subscription', 'payment', 'cost', 'revenue', 'budget'], agent: 'finance', priority: 10 },
  { keywords: ['research', 'market', 'competitor', 'analysis', 'trend', 'industry'], agent: 'research', priority: 10 },
  { keywords: ['compliance', 'gdpr', 'consent', 'privacy', 'legal', 'regulation'], agent: 'compliance', priority: 10 },
  { keywords: ['strategy', 'priority', 'approve', 'decision', 'executive'], agent: 'ceo', priority: 1 },
];

// ─── Approval gates ──────────────────────────────────────────────────────────

/**
 * Actions that require human or CEO approval before execution.
 * The orchestrator pauses the workflow and creates an approval request.
 */
const APPROVAL_GATES: Array<{
  condition: (action: ActionRecord, ctx: OrchestratorContext) => boolean;
  description: string;
  approver: 'ceo' | 'admin' | 'owner';
}> = [
  {
    condition: (action) =>
      action.tool === 'send_proposal' &&
      (action.input['total_amount'] as number) > 5000,
    description: 'Proposals over $5,000 require CEO approval',
    approver: 'ceo',
  },
  {
    condition: (action) =>
      action.tool === 'send_email' &&
      (action.input['recipient_count'] as number) > 100,
    description: 'Mass email campaigns (>100 recipients) require admin approval',
    approver: 'admin',
  },
  {
    condition: (action) =>
      action.tool === 'create_sub_company',
    description: 'New venture creation requires CEO approval',
    approver: 'ceo',
  },
  {
    condition: (action) =>
      action.tool === 'deploy_to_production',
    description: 'Production deployments require admin approval',
    approver: 'admin',
  },
  {
    condition: (action) =>
      action.tool === 'process_payout' &&
      (action.input['amount'] as number) > 1000,
    description: 'Payouts over $1,000 require owner approval',
    approver: 'owner',
  },
];

// ─── Cost tracking ───────────────────────────────────────────────────────────

/** Per-model cost rates (USD per 1K tokens). */
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
  'claude-haiku-3-20250307': { input: 0.00025, output: 0.00125 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_COSTS[model] ?? { input: 0.003, output: 0.015 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

// ─── Orchestrator class ──────────────────────────────────────────────────────

export class AgentOrchestrator {
  private context: OrchestratorContext;
  private onLog: (log: Partial<AuditLog>) => Promise<void>;
  private onCost: (cost: Partial<AgentCost>) => Promise<void>;
  private onApproval: (approval: Partial<Approval>) => Promise<void>;
  private onThreadUpdate: (thread: Partial<AgentThread>) => Promise<void>;
  private onToolCall: (call: Partial<AgentToolCall>) => Promise<void>;

  constructor(params: {
    context: OrchestratorContext;
    onLog: (log: Partial<AuditLog>) => Promise<void>;
    onCost: (cost: Partial<AgentCost>) => Promise<void>;
    onApproval: (approval: Partial<Approval>) => Promise<void>;
    onThreadUpdate: (thread: Partial<AgentThread>) => Promise<void>;
    onToolCall: (call: Partial<AgentToolCall>) => Promise<void>;
  }) {
    this.context = params.context;
    this.onLog = params.onLog;
    this.onCost = params.onCost;
    this.onApproval = params.onApproval;
    this.onThreadUpdate = params.onThreadUpdate;
    this.onToolCall = params.onToolCall;
  }

  /**
   * Route a request to the appropriate agent.
   * If `target_agent` is not specified, uses keyword-based routing.
   */
  async routeRequest(request: AgentRequest): Promise<AgentResponse> {
    const agent = request.target_agent ?? this.autoRoute(request.message);
    const startTime = Date.now();

    // Log the routing decision
    await this.onLog({
      organization_id: this.context.organization_id,
      actor_type: 'system',
      actor_id: 'orchestrator',
      action: 'create',
      resource_type: 'agent_thread',
      resource_id: request.thread_id ?? 'new',
      changes: {
        routed_to: agent,
        message_preview: request.message.slice(0, 200),
        auto_routed: !request.target_agent,
      },
    });

    // Create or resume thread
    const threadId = request.thread_id ?? crypto.randomUUID();
    await this.onThreadUpdate({
      id: threadId,
      organization_id: this.context.organization_id,
      status: 'open',
      subject: request.message.slice(0, 100),
      started_by: this.context.user_id,
      context: {
        ...request.context,
        company_id: this.context.company_id,
        client_id: this.context.client_id,
      },
    });

    // Execute agent (placeholder — actual LLM call goes here)
    const response = await this.executeAgent(agent, threadId, request);

    // Track cost
    const costUsd = calculateCost(
      response.cost.model,
      response.cost.input_tokens,
      response.cost.output_tokens,
    );
    await this.onCost({
      organization_id: this.context.organization_id,
      thread_id: threadId,
      agent_name: agent,
      model: response.cost.model,
      input_tokens: response.cost.input_tokens,
      output_tokens: response.cost.output_tokens,
      cost_usd: costUsd,
    });

    return response;
  }

  /**
   * Auto-route a message to the best-fit agent based on keywords.
   * Falls back to CEO for ambiguous or strategic requests.
   */
  private autoRoute(message: string): AgentName {
    const lowerMessage = message.toLowerCase();
    let bestMatch: { agent: AgentName; score: number; priority: number } | null = null;

    for (const rule of ROUTING_RULES) {
      const matchCount = rule.keywords.filter((kw) => lowerMessage.includes(kw)).length;
      if (matchCount > 0) {
        const score = matchCount * rule.priority;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { agent: rule.agent, score, priority: rule.priority };
        }
      }
    }

    return bestMatch?.agent ?? 'ceo'; // Default to CEO for unmatched requests
  }

  /**
   * Execute the agent's logic. This is where the LLM call happens.
   * Currently a skeleton — implement with your LLM provider of choice.
   */
  private async executeAgent(
    agent: AgentName,
    threadId: string,
    request: AgentRequest,
  ): Promise<AgentResponse> {
    const actions: ActionRecord[] = [];
    const handoffs: HandoffRecord[] = [];
    const approvalsRequested: string[] = [];

    // TODO: Load agent prompt from roster/{agent}.md
    // TODO: Build system prompt with context (org, company, client, memory)
    // TODO: Call LLM with tools
    // TODO: Process tool calls and accumulate actions
    // TODO: Check approval gates for each action
    // TODO: Handle handoffs when agent requests them
    // TODO: Return final response

    // Placeholder response structure
    return {
      thread_id: threadId,
      agent,
      message: `[${agent}] Acknowledged: "${request.message.slice(0, 100)}"`,
      actions_taken: actions,
      handoffs,
      approvals_requested: approvalsRequested,
      cost: {
        input_tokens: 0,
        output_tokens: 0,
        cost_usd: 0,
        model: 'claude-sonnet-4-20250514',
      },
      status: 'completed',
    };
  }

  /**
   * Handle a handoff from one agent to another.
   * Creates a new thread linked to the parent and routes to the target agent.
   */
  async handleHandoff(handoff: HandoffRecord, parentThreadId: string): Promise<AgentResponse> {
    await this.onLog({
      organization_id: this.context.organization_id,
      actor_type: 'agent',
      actor_id: handoff.from_agent,
      action: 'update',
      resource_type: 'agent_thread',
      resource_id: parentThreadId,
      changes: {
        handoff_to: handoff.to_agent,
        reason: handoff.reason,
      },
    });

    return this.routeRequest({
      target_agent: handoff.to_agent,
      message: `Handoff from ${handoff.from_agent}: ${handoff.reason}`,
      context: handoff.context,
    });
  }

  /**
   * Check whether a proposed action requires approval.
   * Returns the gate description if approval is needed, null otherwise.
   */
  checkApprovalGate(action: ActionRecord): string | null {
    for (const gate of APPROVAL_GATES) {
      if (gate.condition(action, this.context)) {
        return gate.description;
      }
    }
    return null;
  }

  /**
   * Request approval for an action. Pauses the workflow until resolved.
   */
  async requestApproval(
    threadId: string,
    agent: AgentName,
    action: ActionRecord,
    gateDescription: string,
  ): Promise<string> {
    const approvalId = crypto.randomUUID();

    await this.onApproval({
      id: approvalId,
      organization_id: this.context.organization_id,
      workflow_run_id: null,
      resource_type: action.tool,
      resource_id: threadId,
      requested_by: agent,
      status: 'pending',
      reason: gateDescription,
      context: {
        action: action.tool,
        input: action.input,
        thread_id: threadId,
      },
    });

    // Update thread to waiting status
    await this.onThreadUpdate({
      id: threadId,
      status: 'waiting',
    });

    return approvalId;
  }

  /**
   * Resume a paused workflow after approval.
   */
  async resumeAfterApproval(
    approvalId: string,
    approved: boolean,
    decidedBy: string,
    reason?: string,
  ): Promise<void> {
    await this.onApproval({
      id: approvalId,
      status: approved ? 'approved' : 'rejected',
      decided_by: decidedBy,
      reason,
      decided_at: new Date().toISOString(),
    });

    await this.onLog({
      organization_id: this.context.organization_id,
      actor_type: 'user',
      actor_id: decidedBy,
      action: approved ? 'approve' : 'reject',
      resource_type: 'approval',
      resource_id: approvalId,
      changes: { reason },
    });
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createOrchestrator(params: {
  context: OrchestratorContext;
  onLog: (log: Partial<AuditLog>) => Promise<void>;
  onCost: (cost: Partial<AgentCost>) => Promise<void>;
  onApproval: (approval: Partial<Approval>) => Promise<void>;
  onThreadUpdate: (thread: Partial<AgentThread>) => Promise<void>;
  onToolCall: (call: Partial<AgentToolCall>) => Promise<void>;
}): AgentOrchestrator {
  return new AgentOrchestrator(params);
}
