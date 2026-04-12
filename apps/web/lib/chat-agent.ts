// ─────────────────────────────────────────────────────────────────────────────
// Northbridge Digital — Chat Agent Integration
// Wraps OpenClaw for per-thread isolated AI conversations
// ─────────────────────────────────────────────────────────────────────────────

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL || "https://claw.thenorthbridgemi.com";
const OPENCLAW_TOKEN = process.env.OPENCLAW_API_KEY || "vos-hooks-token-2026";

type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
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
  const lastMessage = messages[messages.length - 1]?.content || "";

  try {
    // Send to OpenClaw — it processes async and returns a runId
    const res = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
        message: lastMessage,
        context: {
          thread_context: threadContext,
          conversation_history: messages.slice(-10),
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data = await res.json();

      // OpenClaw returns {ok: true, runId: "..."} for async processing
      // or {response: "..."} for sync responses
      if (data.response || data.message || data.content) {
        return {
          content: data.response || data.message || data.content,
          model: data.model || agentConfig.model || "minimax/MiniMax-M2.7",
          token_count: data.token_count,
          cost_usd: data.cost_usd,
        };
      }

      // Async mode — agent is processing via Slack/hooks
      if (data.ok && data.runId) {
        return {
          content: `Task received and assigned to ${agentId === "main" ? "Atlas" : agentId}. Processing now — check Slack for the full response.\n\nRun ID: ${data.runId}`,
          model: "system",
        };
      }
    }
  } catch {
    // OpenClaw unavailable
  }

  return {
    content: "I received your message but couldn't reach the agent system right now. Your message has been saved — try again in a moment or check Slack for a response.",
    model: "system-fallback",
  };
}
