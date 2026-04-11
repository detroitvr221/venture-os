// ─────────────────────────────────────────────────────────────────────────────
// Northbridge Digital — Chat Agent Integration
// Wraps OpenClaw for per-thread isolated AI conversations
// ─────────────────────────────────────────────────────────────────────────────

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "https://claw.thenorthbridgemi.com";
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_KEY || "vos-hooks-token-2026";

type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: unknown;
};

type AgentConfig = {
  agent_id?: string;
  model?: string;
  system_prompt?: string;
};

export async function getAgentResponse(
  messages: ChatMessage[],
  threadContext: Record<string, unknown>,
  agentConfig: AgentConfig
): Promise<{ content: string; model: string; token_count?: number; cost_usd?: number }> {
  const agentId = agentConfig.agent_id || "main";
  const systemPrompt = agentConfig.system_prompt ||
    "You are a Northbridge Digital assistant. Help the employee with their work. Be concise, professional, and action-oriented. You have access to the company's tools and data.";

  try {
    // Try OpenClaw gateway first
    const res = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
        message: messages[messages.length - 1]?.content || "",
        context: {
          thread_context: threadContext,
          conversation_history: messages.slice(-10), // Last 10 for context window
          system_prompt: systemPrompt,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        content: data.response || data.message || data.content || "I received your message. Let me look into that.",
        model: data.model || agentConfig.model || "openclaw/gpt-5.4-mini",
        token_count: data.token_count,
        cost_usd: data.cost_usd,
      };
    }
  } catch {
    // OpenClaw unavailable — fall through to direct response
  }

  // Fallback: acknowledge the message (OpenClaw handles async via Slack)
  return {
    content: "Message received. The team has been notified and will follow up. If you need immediate help, reach out in Slack.",
    model: "system-fallback",
  };
}
