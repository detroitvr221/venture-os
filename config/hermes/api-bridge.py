"""
Hermes HTTP API Bridge
Accepts OpenClaw-compatible webhooks from the Northbridge dashboard
and pipes them to Hermes Agent for processing.

Endpoints:
  POST /hooks/agent  — trigger Hermes with a message (OpenClaw compatible)
  POST /webhook      — receive callbacks (stores and forwards)
  GET  /             — health check
  GET  /health       — detailed health

Runs on port 18789 (same as OpenClaw was) for drop-in replacement.
"""

import asyncio
import json
import os
import subprocess
import uuid
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Hermes API Bridge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth tokens (same as OpenClaw used)
VALID_TOKENS = {
    os.environ.get("WEBHOOK_SECRET", "vos-hooks-token-2026"),
    os.environ.get("GATEWAY_TOKEN", "vos-gw-token-2026"),
    "vos-hooks-token-2026",
    "vos-gw-token-2026",
}

HERMES_BIN = "/opt/venv/bin/hermes"
CALLBACK_RESULTS = {}


def check_auth(request: Request) -> bool:
    auth = request.headers.get("authorization", "")
    token = auth.replace("Bearer ", "")
    return token in VALID_TOKENS


@app.get("/")
async def root():
    return {"status": "ok", "service": "hermes-api-bridge", "version": "1.0.0"}


@app.get("/health")
async def health():
    # Check if Hermes is installed
    hermes_ok = os.path.exists(HERMES_BIN)
    return {
        "status": "ok" if hermes_ok else "degraded",
        "hermes": "installed" if hermes_ok else "missing",
        "uptime": datetime.utcnow().isoformat(),
    }


@app.post("/hooks/agent")
async def trigger_agent(request: Request):
    """OpenClaw-compatible agent trigger endpoint."""
    if not check_auth(request):
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    agent_id = body.get("agent_id", "main")
    message = body.get("message", "")
    context = body.get("context", {})
    max_tokens = body.get("max_tokens", 4096)

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    run_id = str(uuid.uuid4())

    # Build the prompt with context
    prompt = message
    if context:
        prompt = f"Context: {json.dumps(context)}\n\nTask: {message}"

    # Run Hermes in non-interactive mode via subprocess
    # Pipe the prompt to hermes chat and capture output
    asyncio.create_task(run_hermes(run_id, prompt, context))

    return JSONResponse({
        "ok": True,
        "runId": run_id,
        "run_id": run_id,
        "status": "triggered",
        "agent_id": agent_id,
    })


async def run_hermes(run_id: str, prompt: str, context: dict):
    """Run Hermes asynchronously and handle the callback."""
    try:
        # Use hermes via Python API directly
        proc = await asyncio.create_subprocess_exec(
            HERMES_BIN, "run", "--message", prompt, "--no-tool-confirm",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "HERMES_NON_INTERACTIVE": "1"},
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        response_text = stdout.decode("utf-8", errors="replace").strip()

        if not response_text:
            # Fallback: try piping to stdin
            proc2 = await asyncio.create_subprocess_exec(
                HERMES_BIN, "chat", "--no-tui",
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "HERMES_NON_INTERACTIVE": "1"},
            )
            stdout2, _ = await asyncio.wait_for(
                proc2.communicate(input=prompt.encode()), timeout=120
            )
            response_text = stdout2.decode("utf-8", errors="replace").strip()

        CALLBACK_RESULTS[run_id] = {
            "status": "completed",
            "response": response_text,
            "completed_at": datetime.utcnow().isoformat(),
        }

        # Fire callback if provided
        callback_url = context.get("callback_url")
        if callback_url:
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
                            "response": response_text,
                            "context": context,
                        },
                    },
                    headers={
                        "Authorization": "Bearer vos-hooks-token-2026",
                        "Content-Type": "application/json",
                    },
                    timeout=aiohttp.ClientTimeout(total=30),
                )

    except asyncio.TimeoutError:
        CALLBACK_RESULTS[run_id] = {
            "status": "failed",
            "error": "Hermes timed out after 120s",
        }
    except Exception as e:
        CALLBACK_RESULTS[run_id] = {
            "status": "failed",
            "error": str(e),
        }


@app.get("/hooks/result/{run_id}")
async def get_result(run_id: str):
    """Poll for a run's result."""
    result = CALLBACK_RESULTS.get(run_id)
    if not result:
        return JSONResponse({"status": "running", "run_id": run_id})
    return JSONResponse(result)


@app.post("/webhook")
async def webhook(request: Request):
    """Receive callbacks (pass-through storage)."""
    body = await request.json()
    return JSONResponse({"received": True, "action": body.get("action", "unknown")})


if __name__ == "__main__":
    port = int(os.environ.get("API_PORT", "18789"))
    print(f"[API Bridge] Starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
