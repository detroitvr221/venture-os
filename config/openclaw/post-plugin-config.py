#!/usr/bin/env python3
"""
Post-plugin config merger for OpenClaw.
Runs AFTER 'openclaw plugins install/enable' to merge our custom settings
WITHOUT overwriting the plugin entries that the installer added.
"""
import json, os

CONFIG_PATH = "/data/.openclaw/openclaw.json"

def env(k, d=""): return os.environ.get(k, d)

# Read existing config (which now has the mochat plugin entry from installer)
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH) as f:
        config = json.load(f)
else:
    config = {}

# Merge our model providers
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
        {"id":"MiniMax-M2.7","name":"MiniMax M2.7","reasoning":True,"input":["text","image"],"contextWindow":204800,"maxTokens":200000},
        {"id":"MiniMax-M2.7-highspeed","name":"MiniMax M2.7 Fast","reasoning":True,"input":["text","image"],"contextWindow":204800,"maxTokens":200000}
    ]
}
config["models"]["providers"]["nexos"] = {
    "baseUrl": "https://api.nexos.ai/v1", "auth": "api-key", "api": "openai-completions",
    "models": [{"id":"5b24e76b-7ac9-4f11-b6d0-f9c6a3a1fafd","name":"Nexos GPT 5.4","reasoning":True,"input":["text","image"],"cost":{"input":0,"output":0},"contextWindow":200000,"maxTokens":8192}]
}

# Set default model
config.setdefault("agents", {}).setdefault("defaults", {})
config["agents"]["defaults"]["model"] = {"primary": "openai/gpt-5.4-mini"}

# Ensure Slack channel is configured
config.setdefault("channels", {})
config["channels"]["slack"] = {
    "mode": "socket", "enabled": True, "requireMention": False,
    "groupPolicy": "open", "dmPolicy": "open", "allowFrom": ["*"],
    "streaming": {"mode": "partial", "nativeTransport": True}
}

# Ensure hooks are enabled
config["hooks"] = {"enabled": True, "token": "vos-hooks-token-2026"}

# Ensure MCP servers
mcp = {
    "github":{"command":"npx","args":["-y","@modelcontextprotocol/server-github"],"env":{"GITHUB_PERSONAL_ACCESS_TOKEN":env("GITHUB_PERSONAL_ACCESS_TOKEN")}},
    "filesystem":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/data/.openclaw/workspace","/data/.openclaw/shared","/data/.openclaw/memory"]},
    "supabase":{"command":"npx","args":["-y","@supabase/mcp-server-supabase","--supabase-url",env("SUPABASE_URL"),"--supabase-key",env("SUPABASE_KEY")]},
    "sequential-thinking":{"command":"npx","args":["-y","@modelcontextprotocol/server-sequential-thinking"]},
    "playwright":{"command":"npx","args":["-y","@playwright/mcp","--headless"]},
    "memory":{"command":"npx","args":["-y","@modelcontextprotocol/server-memory"]},
    "context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]},
    "vapi":{"command":"npx","args":["-y","@vapi-ai/mcp-server"],"env":{"VAPI_TOKEN":env("VAPI_TOKEN")}},
    "searchapi":{"command":"npx","args":["-y","mcp-remote","https://www.searchapi.io/mcp?token="+env("SEARCHAPI_TOKEN")]}
}
config.setdefault("mcp", {})["servers"] = mcp

# Write back — preserving the mochat plugin entry the installer added
with open(CONFIG_PATH, "w") as f:
    json.dump(config, f, indent=2)

print(f"[POST-PLUGIN] Config merged with {len(mcp)} MCP servers")
print(f"[POST-PLUGIN] Plugins preserved: {list(config.get('plugins', {}).get('entries', {}).keys())}")
