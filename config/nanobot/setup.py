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
            "bot_token": os.environ.get("SLACK_BOT_TOKEN", ""),
            "app_token": os.environ.get("SLACK_APP_TOKEN", ""),
            "allow_from": []
        }
    }
}

# Add WhatsApp if configured
wa_number = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
wa_token = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
wa_verify = os.environ.get("WHATSAPP_VERIFY_TOKEN", "")
if wa_token:
    config["channels"]["whatsapp"] = {
        "enabled": True,
        "phone_number_id": wa_number,
        "access_token": wa_token,
        "verify_token": wa_verify or "northbridge-verify-2026"
    }

config_dir = os.path.expanduser("~/.nanobot")
os.makedirs(config_dir, exist_ok=True)
os.makedirs(os.path.join(config_dir, "workspace"), exist_ok=True)

path = os.path.join(config_dir, "config.json")
with open(path, "w") as f:
    json.dump(config, f, indent=2)
print(f"[SETUP] Config written to {path}")
print(f"[SETUP] Channels: {', '.join(k for k, v in config['channels'].items() if v.get('enabled'))}")
