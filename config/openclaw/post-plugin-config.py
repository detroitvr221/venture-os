#!/usr/bin/env python3
"""
Post-plugin config merger for OpenClaw.
Runs AFTER 'openclaw plugins install/enable' to merge our custom settings
WITHOUT overwriting the plugin entries that the installer added.

CRITICAL: The 'openclaw plugins enable' command overwrites openclaw.json and
may strip custom fields like gateway.mode. This script MUST restore them.
"""
import json, os, sys

CONFIG_PATH = "/data/.openclaw/openclaw.json"

def env(k, d=""): return os.environ.get(k, d)

# Read existing config (which now has the mochat plugin entry from installer)
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH) as f:
        config = json.load(f)
    print(f"[POST-PLUGIN] Read existing config: {len(json.dumps(config))} bytes")
    print(f"[POST-PLUGIN] gateway.mode before merge: {config.get('gateway', {}).get('mode', 'MISSING')}")
else:
    config = {}
    print("[POST-PLUGIN] No existing config found, creating fresh")

# ── Gateway (FORCE-SET, not setdefault — plugin enable strips these) ──
gw = config.setdefault("gateway", {})
gw["port"] = 18789
gw["mode"] = "local"
gw["bind"] = "lan"
gw["controlUi"] = {"allowInsecureAuth": True, "allowedOrigins": ["https://claw.thenorthbridgemi.com"]}
gw["auth"] = {"mode": "token", "token": "vos-gw-token-2026"}
gw["trustedProxies"] = ["127.0.0.1/32", "172.17.0.0/16", "172.18.0.0/16", "172.19.0.0/16", "172.20.0.0/16"]

# ── Model providers ──
config.setdefault("models", {})
config["models"]["mode"] = "merge"
config["models"].setdefault("providers", {})
config["models"]["providers"]["openai"] = {
    "baseUrl": "https://api.openai.com/v1", "auth": "api-key", "api": "openai-completions",
    "models": [
        {"id":"gpt-5.4-mini","name":"GPT-5.4 Mini","reasoning":True,"input":["text","image"],"contextWindow":200000,"maxTokens":32768},
        {"id":"gpt-4.1-mini","name":"GPT-4.1 Mini","reasoning":True,"input":["text","image"],"contextWindow":1047576,"maxTokens":32768},
        {"id":"o4-mini","name":"o4-mini","reasoning":True,"input":["text","image"],"contextWindow":200000,"maxTokens":100000}
    ]
}
config["models"]["providers"]["minimax"] = {
    "baseUrl": "https://api.minimax.io/anthropic", "auth": "api-key", "api": "anthropic-messages",
    "models": [
        {"id":"MiniMax-M2.7","name":"MiniMax M2.7","reasoning":True,"input":["text","image"],"contextWindow":204800,"maxTokens":200000,"cost":{"input":0.30,"output":1.20}},
        {"id":"MiniMax-M2.7-highspeed","name":"MiniMax M2.7 Fast","reasoning":True,"input":["text","image"],"contextWindow":204800,"maxTokens":200000,"cost":{"input":0.15,"output":0.60}}
    ]
}
config["models"]["providers"]["nexos"] = {
    "baseUrl": "https://api.nexos.ai/v1", "auth": "api-key", "api": "openai-completions",
    "models": [{"id":"5b24e76b-7ac9-4f11-b6d0-f9c6a3a1fafd","name":"Nexos GPT 5.4","reasoning":True,"input":["text","image"],"cost":{"input":0,"output":0},"contextWindow":200000,"maxTokens":8192}]
}

# ── Default model ──
config.setdefault("agents", {}).setdefault("defaults", {})
config["agents"]["defaults"]["model"] = {"primary": "minimax/MiniMax-M2.7-highspeed"}
config["agents"]["defaults"].setdefault("compaction", {"mode": "safeguard"})
config["agents"]["defaults"].setdefault("heartbeat", {
    "every": "30m", "target": "last",
    "activeHours": {"start": "08:00", "end": "22:00", "timezone": "America/New_York"}
})

# ── Channels ──
config.setdefault("channels", {})
config["channels"]["slack"] = {
    "mode": "socket", "enabled": False, "requireMention": False,
    "groupPolicy": "open", "dmPolicy": "open", "allowFrom": ["*"],
    "streaming": {"mode": "partial", "nativeTransport": True}
}
# MoChat — DISABLED (was causing infinite fetch-failed loop killing the gateway)
# Hermes on VPS2 handles Slack communication now
mt = env("MOCHAT_TOKEN")
mb = env("MOCHAT_BOT_USER_ID")
if False and mt and mb:
    config["channels"]["mochat"] = {
        "baseUrl": "https://mochat.io",
        "socketUrl": "https://mochat.io",
        "clawToken": mt,
        "agentUserId": mb,
        "sessions": ["*"],
        "panels": ["*"],
        "refreshIntervalMs": 60000,
        "replyDelayMode": "non-mention",
        "replyDelayMs": 10000,
        "dedupeWindowMs": 5000,
        "maxDispatchPerMessage": 1
    }
    print(f"[POST-PLUGIN] MoChat channel configured for agent {mb}")

# ── Hooks ──
config["hooks"] = {"enabled": True, "token": "vos-hooks-token-2026"}

# ── Plugins: ensure mochat is enabled, DON'T restrict allow list ──
# Empty plugins.allow = allow ALL (bundled + external). Don't narrow it.
plugins = config.setdefault("plugins", {})
if "allow" in plugins:
    del plugins["allow"]  # Remove any allow restriction — let all plugins load
entries = plugins.setdefault("entries", {})
entries.setdefault("browser", {})["enabled"] = True
entries.setdefault("slack", {})["enabled"] = True
entries.setdefault("mochat", {})["enabled"] = True

# ── Tools ──
config["tools"] = {"profile":"coding","elevated":{"enabled":True},"web":{"search":{"enabled":True},"fetch":{"enabled":True}}}
config["browser"] = {"headless":True,"noSandbox":True}
config["update"] = {"channel":"stable","checkOnStart":False}

# ── MCP servers ──
mcp = {
    "github":{"command":"npx","args":["-y","@modelcontextprotocol/server-github"],"env":{"GITHUB_PERSONAL_ACCESS_TOKEN":env("GITHUB_PERSONAL_ACCESS_TOKEN")}},
    "filesystem":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/data/.openclaw/workspace","/data/.openclaw/shared","/data/.openclaw/memory"]},
    "supabase":{"command":"npx","args":["-y","@supabase/mcp-server-supabase@latest","--supabase-url",env("SUPABASE_URL"),"--supabase-key",env("SUPABASE_KEY")],"env":{"SUPABASE_URL":env("SUPABASE_URL"),"SUPABASE_SERVICE_ROLE_KEY":env("SUPABASE_KEY")}},
    "sequential-thinking":{"command":"npx","args":["-y","@modelcontextprotocol/server-sequential-thinking"]},
    "playwright":{"command":"npx","args":["-y","@playwright/mcp","--headless"]},
    "memory":{"command":"npx","args":["-y","@modelcontextprotocol/server-memory"]},
    "context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]},
    "vapi":{"command":"npx","args":["-y","@vapi-ai/mcp-server"],"env":{"VAPI_TOKEN":env("VAPI_TOKEN")}},
    "searchapi":{"command":"npx","args":["-y","mcp-remote","https://www.searchapi.io/mcp?token="+env("SEARCHAPI_TOKEN")]}
}
config.setdefault("mcp", {})["servers"] = mcp

# ── Write back ──
with open(CONFIG_PATH, "w") as f:
    json.dump(config, f, indent=2)

# Verify write
with open(CONFIG_PATH) as f:
    verify = json.load(f)
    gw_mode = verify.get("gateway", {}).get("mode")
    p_allow = verify.get("plugins", {}).get("allow", [])
    p_entries = list(verify.get("plugins", {}).get("entries", {}).keys())

print(f"[POST-PLUGIN] Config merged with {len(mcp)} MCP servers")
print(f"[POST-PLUGIN] gateway.mode = {gw_mode}")
print(f"[POST-PLUGIN] plugins.allow = {p_allow}")
print(f"[POST-PLUGIN] plugins.entries = {p_entries}")
