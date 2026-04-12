#!/usr/bin/env python3
"""NanoBot setup script — generates config with MoChat channel."""
import json, os

config = {
    "providers": {
        "openai": {
            "apiKey": os.environ.get("OPENAI_API_KEY", "")
        }
    },
    "agents": {
        "defaults": {
            "model": "gpt-5.4-mini",
            "provider": "openai"
        }
    },
    "channels": {
        "mochat": {
            "enabled": True,
            "baseUrl": "https://mochat.io",
            "socketUrl": "https://mochat.io",
            "clawToken": os.environ.get("MOCHAT_TOKEN", ""),
            "agentUserId": os.environ.get("MOCHAT_BOT_USER_ID", ""),
            "sessions": ["*"],
            "panels": ["*"],
            "refreshIntervalMs": 30000,
            "replyDelayMode": "non-mention",
            "replyDelayMs": 5000,
            "allow_from": ["*"]
        }
    }
}

config_dir = os.path.expanduser("~/.nanobot")
os.makedirs(config_dir, exist_ok=True)
os.makedirs(os.path.join(config_dir, "workspace"), exist_ok=True)

path = os.path.join(config_dir, "config.json")
with open(path, "w") as f:
    json.dump(config, f, indent=2)
print(f"[SETUP] Config written to {path}")
print(f"[SETUP] Channels: {', '.join(k for k, v in config['channels'].items() if v.get('enabled'))}")
print(f"[SETUP] Model: {config['agents']['defaults']['model']}")
