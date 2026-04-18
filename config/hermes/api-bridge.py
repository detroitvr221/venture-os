"""
Hermes HTTP API Bridge v2
Uses Hermes' Python API (run_agent) directly instead of subprocess.
Drop-in replacement for OpenClaw /hooks/agent endpoint.
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Add Hermes to path
sys.path.insert(0, "/opt/hermes-agent")

app = FastAPI(title="Hermes API Bridge", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_TOKENS = {
    os.environ.get("WEBHOOK_SECRET", "vos-hooks-token-2026"),
    os.environ.get("GATEWAY_TOKEN", "vos-gw-token-2026"),
    "vos-hooks-token-2026",
    "vos-gw-token-2026",
}

RESULTS = {}


def check_auth(request: Request) -> bool:
    auth = request.headers.get("authorization", "")
    token = auth.replace("Bearer ", "")
    return token in VALID_TOKENS


async def call_hermes(prompt: str) -> str:
    """Call Hermes using the OpenAI SDK directly (same as run_agent.py does)."""
    try:
        from openai import OpenAI

        # Load Hermes .env
        env_path = os.path.expanduser("~/.hermes/.env")
        if os.path.exists(env_path):
            for line in open(env_path):
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k, v)

        api_key = os.environ.get("MINIMAX_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
        api_base = os.environ.get("OPENAI_API_BASE", "https://api.minimax.io/v1")
        model = os.environ.get("HERMES_MODEL", "MiniMax-M2.7-highspeed")

        client = OpenAI(api_key=api_key, base_url=api_base)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are Hermes, the AI operations assistant for Northbridge Digital. Respond with structured, actionable output. When asked for JSON, return valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=4096,
            temperature=0.7,
        )

        return response.choices[0].message.content or ""
    except Exception as e:
        return f"Error: {str(e)}"


@app.get("/")
async def root():
    return {"status": "ok", "service": "hermes-api-bridge", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "hermes": "installed",
        "model": os.environ.get("HERMES_MODEL", "MiniMax-M2.7-highspeed"),
        "uptime": datetime.utcnow().isoformat(),
    }


@app.post("/hooks/agent")
async def trigger_agent(request: Request):
    if not check_auth(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    message = body.get("message", "")
    context = body.get("context", {})
    agent_id = body.get("agent_id", "main")

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    run_id = str(uuid.uuid4())

    # Run async
    asyncio.create_task(process_request(run_id, message, context))

    return JSONResponse({
        "ok": True,
        "runId": run_id,
        "run_id": run_id,
        "status": "triggered",
        "agent_id": agent_id,
    })


async def process_request(run_id: str, message: str, context: dict):
    try:
        # Build prompt with context
        prompt = message
        if context.get("job_id"):
            prompt = f"[Job {context['job_id']}] {message}"

        # Call Hermes/MiniMax
        response = await asyncio.get_event_loop().run_in_executor(
            None, lambda: call_hermes(prompt)
        )

        RESULTS[run_id] = {
            "status": "completed",
            "response": response,
            "completed_at": datetime.utcnow().isoformat(),
        }

        # Fire callback
        callback_url = context.get("callback_url")
        if callback_url and context.get("job_id"):
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    await session.post(
                        callback_url,
                        json={
                            "action": "job_complete",
                            "organization_id": context.get("org_id", "00000000-0000-0000-0000-000000000001"),
                            "agent_id": "hermes",
                            "run_id": run_id,
                            "data": {
                                "job_id": context.get("job_id"),
                                "response": response,
                                "context": context,
                            },
                        },
                        headers={
                            "Authorization": "Bearer vos-hooks-token-2026",
                            "Content-Type": "application/json",
                        },
                        timeout=aiohttp.ClientTimeout(total=30),
                    )
            except Exception as e:
                print(f"[Bridge] Callback failed: {e}")

    except Exception as e:
        RESULTS[run_id] = {
            "status": "failed",
            "error": str(e),
            "completed_at": datetime.utcnow().isoformat(),
        }


@app.get("/hooks/result/{run_id}")
async def get_result(run_id: str):
    result = RESULTS.get(run_id)
    if not result:
        return JSONResponse({"status": "running", "run_id": run_id})
    return JSONResponse(result)


@app.post("/webhook")
async def webhook(request: Request):
    body = await request.json()
    return JSONResponse({"received": True, "action": body.get("action", "unknown")})


if __name__ == "__main__":
    port = int(os.environ.get("API_PORT", "18789"))
    print(f"[API Bridge v2] Starting on port {port} — using MiniMax direct")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
