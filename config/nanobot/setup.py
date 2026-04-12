#!/usr/bin/env python3
"""NanoBot setup script — generates config from environment variables."""
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
        "slack": {
            "enabled": True,
            "botToken": os.environ.get("SLACK_BOT_TOKEN", ""),
            "appToken": os.environ.get("SLACK_APP_TOKEN", "")
        }
    }
}

os.makedirs(os.path.expanduser("~/.nanobot"), exist_ok=True)
path = os.path.expanduser("~/.nanobot/config.json")
with open(path, "w") as f:
    json.dump(config, f, indent=2)
print(f"[SETUP] Config written to {path}")
