#!/usr/bin/env python3
"""Generate OpenClaw config for VPS 2 (worker agents)."""
import json, os

def env(k, d=""): return os.environ.get(k, d)

agents = [
    {"id":"main","name":"Relay","workspace":"/data/.openclaw/workspace-vps2-main"},
    {"id":"researcher","name":"Scout","workspace":"/data/.openclaw/workspace-vps2-researcher"},
    {"id":"writer","name":"Ink","workspace":"/data/.openclaw/workspace-vps2-writer"},
    {"id":"analyst","name":"Metric","workspace":"/data/.openclaw/workspace-vps2-analyst"}
]

mcp = {
    "filesystem":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/data/.openclaw/workspace","/data/.openclaw/shared","/data/.openclaw/memory"]},
    "supabase":{"command":"npx","args":["-y","@supabase/mcp-server-supabase","--supabase-url",env("SUPABASE_URL"),"--supabase-key",env("SUPABASE_KEY")]},
    "sequential-thinking":{"command":"npx","args":["-y","@modelcontextprotocol/server-sequential-thinking"]},
    "memory":{"command":"npx","args":["-y","@modelcontextprotocol/server-memory"]},
    "searchapi":{"command":"npx","args":["-y","mcp-remote","https://www.searchapi.io/mcp?token="+env("SEARCHAPI_TOKEN")]},
    "context7":{"command":"npx","args":["-y","@upstash/context7-mcp"]}
}

# Lighter set for VPS 2 (4GB RAM) — skip playwright/vapi/github to save resources
vt = env("VAPI_TOKEN")
if vt:
    mcp["vapi"] = {"command":"npx","args":["-y","@vapi-ai/mcp-server"],"env":{"VAPI_TOKEN":vt}}

config = {
    "gateway":{
        "port":18789,"mode":"local","bind":"lan",
        "controlUi":{"allowInsecureAuth":True,"allowedOrigins":["http://187.77.207.22:18789"]},
        "auth":{"mode":"token","token":"vos-worker-token-2026"},
        "trustedProxies":["127.0.0.1/32","172.17.0.0/16"]
    },
    "models":{"mode":"merge","providers":{
        "openai":{"baseUrl":"https://api.openai.com/v1","auth":"api-key","api":"openai-completions","models":[
            {"id":"gpt-5.4-mini","name":"GPT-5.4 Mini","reasoning":True,"input":["text","image"],"contextWindow":200000,"maxTokens":32768},
            {"id":"gpt-4.1-mini","name":"GPT-4.1 Mini","reasoning":True,"input":["text","image"],"contextWindow":1047576,"maxTokens":32768}
        ]},
        "minimax":{"baseUrl":"https://api.minimax.io/v1","auth":"api-key","api":"openai-completions","models":[
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
        "compaction":{"mode":"safeguard"}
    },"list":agents},
    "channels":{"slack":{"mode":"socket","enabled":True,"requireMention":True,"groupPolicy":"open","dmPolicy":"open","allowFrom":["*"],"streaming":{"mode":"partial","nativeTransport":True}}},
    "tools":{"profile":"coding","elevated":{"enabled":True},"web":{"search":{"enabled":True},"fetch":{"enabled":True}}},
    "browser":{"headless":True,"noSandbox":True},
    "plugins":{"allow":["browser","slack"],"entries":{"browser":{"enabled":True},"slack":{"enabled":True}}},
    "hooks":{"enabled":True,"token":"vos-worker-hooks-2026"},
    "update":{"channel":"stable","checkOnStart":False},
    "mcp":{"servers":mcp}
}

json.dump(config, open("/data/.openclaw/openclaw.json","w"), indent=2)
print(f"[CONFIG-VPS2] Written with {len(mcp)} MCP servers: {', '.join(mcp.keys())}")
