#!/usr/bin/env python3
"""Generate OpenClaw config with all MCP servers."""
import json, os

def env(k, d=""): return os.environ.get(k, d)

agents = [
    {"id":"main","name":"Atlas","workspace":"/data/.openclaw/workspace-main"},
    {"id":"sales","name":"Mercury","workspace":"/data/.openclaw/workspace-sales","tools":{"deny":["exec","browser"]}},
    {"id":"seo","name":"Beacon","workspace":"/data/.openclaw/workspace-seo","tools":{"deny":["exec"]}},
    {"id":"web-presence","name":"Canvas","workspace":"/data/.openclaw/workspace-web-presence"},
    {"id":"ai-integration","name":"Nexus","workspace":"/data/.openclaw/workspace-ai-integration"},
    {"id":"venture-builder","name":"Forge","workspace":"/data/.openclaw/workspace-venture-builder"},
    {"id":"developer","name":"Cipher","workspace":"/data/.openclaw/workspace-developer"},
    {"id":"ops","name":"Pulse","workspace":"/data/.openclaw/workspace-ops"},
    {"id":"finance","name":"Ledger","workspace":"/data/.openclaw/workspace-finance","tools":{"deny":["exec","browser"]}},
    {"id":"research","name":"Scout","workspace":"/data/.openclaw/workspace-research","tools":{"deny":["exec"]}},
    {"id":"compliance","name":"Sentinel","workspace":"/data/.openclaw/workspace-compliance","tools":{"deny":["exec"]}}
]

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

# Conditional: only add if API key is set
if env("BRAVE_API_KEY"):
    mcp["brave-search"] = {"command":"npx","args":["-y","@modelcontextprotocol/server-brave-search"],"env":{"BRAVE_API_KEY":env("BRAVE_API_KEY")}}
if env("STRIPE_SECRET_KEY"):
    mcp["stripe"] = {"command":"npx","args":["-y","@stripe/mcp","--tools=all","--api-key",env("STRIPE_SECRET_KEY")]}

config = {
    "gateway":{
        "port":18789,"mode":"local","bind":"lan",
        "controlUi":{"allowInsecureAuth":True,"dangerouslyDisableDeviceAuth":False,"allowedOrigins":["https://claw.thenorthbridgemi.com"]},
        "auth":{"mode":"token","token":"vos-gw-token-2026"},
        "trustedProxies":["127.0.0.1/32","172.17.0.0/16","172.18.0.0/16","172.19.0.0/16","172.20.0.0/16"]
    },
    "models":{"mode":"merge","providers":{
        "openai":{"baseUrl":"https://api.openai.com/v1","auth":"api-key","api":"openai-completions","models":[
            {"id":"gpt-5.4-mini","name":"GPT-5.4 Mini","reasoning":True,"input":["text","image"],"contextWindow":200000,"maxTokens":32768},
            {"id":"gpt-4.1-mini","name":"GPT-4.1 Mini","reasoning":True,"input":["text","image"],"contextWindow":1047576,"maxTokens":32768},
            {"id":"o4-mini","name":"o4-mini","reasoning":True,"input":["text","image"],"contextWindow":200000,"maxTokens":100000}
        ]},
        "minimax":{"baseUrl":"https://api.minimax.io/anthropic","auth":"api-key","api":"anthropic-messages","models":[
            {"id":"MiniMax-M2.7","name":"MiniMax M2.7","reasoning":True,"input":["text","image"],"contextWindow":204800,"maxTokens":200000,"cost":{"input":0.30,"output":1.20}},
            {"id":"MiniMax-M2.7-highspeed","name":"MiniMax M2.7 Fast","reasoning":True,"input":["text","image"],"contextWindow":204800,"maxTokens":200000,"cost":{"input":0.15,"output":0.60}}
        ]},
        "nexos":{"baseUrl":"https://api.nexos.ai/v1","auth":"api-key","api":"openai-completions","models":[
            {"id":"5b24e76b-7ac9-4f11-b6d0-f9c6a3a1fafd","name":"Nexos GPT 5.4","reasoning":True,"input":["text","image"],"cost":{"input":0,"output":0},"contextWindow":200000,"maxTokens":8192}
        ]}
    }},
    "agents":{"defaults":{
        "model":{"primary":"openai/gpt-5.4-mini"},
        "workspace":"/data/.openclaw/workspace",
        "compaction":{"mode":"safeguard"},
        "heartbeat":{"every":"30m","target":"last","activeHours":{"start":"08:00","end":"22:00","timezone":"America/New_York"}}
    },"list":agents},
    "channels":{
        "slack":{"mode":"socket","enabled":True,"requireMention":False,"groupPolicy":"open","dmPolicy":"open","allowFrom":["*"],"streaming":{"mode":"partial","nativeTransport":True}}
    },
    "tools":{"profile":"coding","elevated":{"enabled":True},"web":{"search":{"enabled":True},"fetch":{"enabled":True}}},
    "browser":{"headless":True,"noSandbox":True},
    "plugins":{"allow":["browser","slack","mochat"],"entries":{"browser":{"enabled":True},"slack":{"enabled":True},"mochat":{"enabled":True}}},
    "hooks":{"enabled":True,"token":"vos-hooks-token-2026"},
    "update":{"channel":"stable","checkOnStart":False},
    "mcp":{"servers":mcp}
}

# Write MoChat credentials BEFORE main config (plugin reads these on load)
mt = env("MOCHAT_TOKEN")
mb = env("MOCHAT_BOT_USER_ID")
if mt and mb:
    import os as _os
    cred_dir = _os.path.expanduser("~/.config/mochat")
    _os.makedirs(cred_dir, exist_ok=True)
    creds = {"token":mt,"botUserId":mb,"workspaceId":"claw_square","groupId":"69882e3eeff6dfbac6a4f2a5","agentName":"Atlas-OpenClaw"}
    json.dump(creds, open(f"{cred_dir}/credentials.json","w"), indent=2)
    print(f"[CONFIG] MoChat credentials written to {cred_dir}/credentials.json")

    # Also write the plugin's own config file that it reads at startup
    plugin_dir = "/data/.openclaw/plugins/mochat"
    _os.makedirs(plugin_dir, exist_ok=True)
    plugin_cfg = {
        "baseUrl":"https://mochat.io",
        "socketUrl":"https://mochat.io",
        "clawToken":mt,
        "agentUserId":mb,
        "sessions":["*"],
        "panels":["*"],
        "refreshIntervalMs":30000,
        "replyDelayMode":"non-mention",
        "replyDelayMs":5000
    }
    json.dump(plugin_cfg, open(f"{plugin_dir}/config.json","w"), indent=2)
    print(f"[CONFIG] MoChat plugin config written")

json.dump(config, open("/data/.openclaw/openclaw.json","w"), indent=2)
print(f"[CONFIG] Written with {len(mcp)} MCP servers: {', '.join(mcp.keys())}")
