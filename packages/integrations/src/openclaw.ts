// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — OpenClaw Integration Client
// Communicates with the OpenClaw gateway for agent orchestration.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OpenClawConfig {
  gatewayUrl: string;
  apiKey: string;
}

export interface OpenClawMessage {
  channel: string;
  target: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface OpenClawAgentRunInput {
  agentId: string;
  message: string;
  context?: Record<string, unknown>;
  tools?: string[];
  maxTokens?: number;
}

export interface OpenClawAgentRunResult {
  run_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  agent_id: string;
  message?: string;
}

export interface OpenClawHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime_seconds: number;
  agents_active: number;
  last_checked: string;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class OpenClawClient {
  private gatewayUrl: string;
  private apiKey: string;

  constructor(config: OpenClawConfig) {
    this.gatewayUrl = config.gatewayUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  /**
   * Send a message to a specific channel and target via OpenClaw.
   * Used for inter-agent communication and notifications.
   */
  async sendMessage(
    channel: string,
    target: string,
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ success: boolean; message_id: string }> {
    const response = await this.request('POST', '/messages', {
      channel,
      target,
      text,
      metadata: metadata ?? {},
      timestamp: new Date().toISOString(),
    });

    return {
      success: response.success as boolean ?? true,
      message_id: response.message_id as string ?? crypto.randomUUID(),
    };
  }

  /**
   * Trigger an OpenClaw agent run.
   * Returns the run_id for tracking.
   */
  async triggerAgentRun(
    agentId: string,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<OpenClawAgentRunResult> {
    const response = await this.request('POST', '/hooks/', {
      agent_id: agentId,
      message,
      context: context ?? {},
      tools: [],
      max_tokens: 4096,
      timestamp: new Date().toISOString(),
    });

    return {
      run_id: response.run_id as string ?? crypto.randomUUID(),
      status: (response.status as OpenClawAgentRunResult['status']) ?? 'queued',
      agent_id: agentId,
      message: response.message as string | undefined,
    };
  }

  /**
   * Check the health of the OpenClaw gateway.
   */
  async getGatewayHealth(): Promise<OpenClawHealthStatus> {
    try {
      const response = await this.request('GET', '/health');

      return {
        status: (response.status as 'healthy' | 'degraded' | 'down') ?? 'healthy',
        version: (response.version as string) ?? 'unknown',
        uptime_seconds: (response.uptime_seconds as number) ?? 0,
        agents_active: (response.agents_active as number) ?? 0,
        last_checked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'down',
        version: 'unknown',
        uptime_seconds: 0,
        agents_active: 0,
        last_checked: new Date().toISOString(),
      };
    }
  }

  /**
   * Get the status of a specific agent run.
   */
  async getRunStatus(runId: string): Promise<OpenClawAgentRunResult> {
    const response = await this.request('GET', `/runs/${runId}`);

    return {
      run_id: runId,
      status: (response.status as OpenClawAgentRunResult['status']) ?? 'running',
      agent_id: (response.agent_id as string) ?? '',
      message: response.message as string | undefined,
    };
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${this.gatewayUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = { method, headers };

    if (body && method !== 'GET') {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new OpenClawError(
        `OpenClaw API error: ${response.status} ${response.statusText} — ${errorBody}`,
        response.status,
      );
    }

    if (response.status === 204) {
      return {};
    }

    return response.json() as Promise<Record<string, unknown>>;
  }
}

// ─── Error ──────────────────────────────────────────────────────────────────

export class OpenClawError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OpenClawError';
    this.status = status;
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createOpenClawClient(config?: Partial<OpenClawConfig>): OpenClawClient {
  const gatewayUrl =
    config?.gatewayUrl ?? process.env.OPENCLAW_GATEWAY_URL ?? 'https://claw.thenorthbridgemi.com';
  const apiKey = config?.apiKey ?? process.env.OPENCLAW_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing OpenClaw API key. Set OPENCLAW_API_KEY env var or pass apiKey to createOpenClawClient().',
    );
  }

  return new OpenClawClient({ gatewayUrl, apiKey });
}
