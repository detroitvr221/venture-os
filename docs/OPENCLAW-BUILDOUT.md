# OpenClaw Production Buildout Plan — North Bridge Digital

> Based on deep research of docs.openclaw.ai, configuration reference, multi-agent concepts, and production showcase patterns.
> This is the actionable implementation guide.

---

## Current State

- VPS 1: 11 agents (Atlas through Sentinel), Slack connected, GitHub MCP
- VPS 2: 4 agents (Relay, Scout, Ink, Metric), Slack connected
- Models: OpenAI GPT-5.4-mini + Nexos free
- Memory: Mem0 via API (10 memories stored)
- Missing: SOUL.md files, HEARTBEAT.md, proper workspace isolation, cron jobs, skills, tool policies, bindings

---

## Phase 1: Agent Identity Files (Week 1)

Every agent needs 5 files in its workspace. This is what makes agents actually useful.

### File Structure Per Agent

```
/data/.openclaw/workspace-{agentId}/
├── SOUL.md        # Personality, tone, boundaries (short and sharp)
├── IDENTITY.md    # Name, emoji, vibe
├── AGENTS.md      # Operating rules (loaded every session)
├── USER.md        # About the human team
├── TOOLS.md       # Notes about available tools
└── MEMORY.md      # Curated long-term facts (private sessions only)
```

### Key Rules from Docs

- **SOUL.md**: Short beats long. Sharp beats vague. Concrete rules, not platitudes.
  - BAD: "Maintain professionalism at all times"
  - GOOD: "Numbers first, narratives second. When data looks sketchy, say so."

- **AGENTS.md**: Operational rules loaded EVERY session. This controls behavior.
  - Memory rules, group chat conduct, red lines, external action policies

- **IDENTITY.md**: Name, creature type, vibe, emoji. Keeps agents distinct.

- **USER.md**: About the team. Timezone, preferences, what to call them.

- **TOOLS.md**: Informational only — does NOT control tool access. Just notes.

### Critical Warning
**Never reuse agentDir across agents** — causes auth/session collisions.
Each agent MUST have its own workspace directory.

---

## Phase 2: Slack Bindings (Week 1)

Route specific Slack channels to specific agents instead of all messages going to all agents.

### Config Pattern

```json5
{
  "bindings": [
    { "agentId": "sales", "match": { "channel": "slack", "channelId": "C-LEADS" } },
    { "agentId": "seo", "match": { "channel": "slack", "channelId": "C-SEO" } },
    { "agentId": "developer", "match": { "channel": "slack", "channelId": "C-DEV" } },
    { "agentId": "main", "match": { "channel": "slack" } }  // Fallback
  ]
}
```

### Binding Priority (from docs)
exact peer > parent peer > guild+roles > guild > team > account > channel > default

---

## Phase 3: Tool Policies Per Agent (Week 1)

Restrict what each agent can do. This is security.

### Recommended Policies

| Agent | Allow | Deny |
|-------|-------|------|
| Atlas (main) | All (read), route, kpi | Direct high-risk external actions |
| Mercury (sales) | web-fetch, memory_search | exec, browser |
| Beacon (seo) | web-fetch, web-search | exec |
| Canvas (web-presence) | web-fetch, browser | exec |
| Forge (venture-builder) | read, write, memory_search | exec without approval |
| Cipher (developer) | exec (sandboxed), read, write | production deploy |
| Sentinel (compliance) | read, memory_search, audit_logs | exec, write |

### Config Pattern

```json5
{
  "agents": {
    "list": [{
      "id": "sales",
      "name": "Mercury",
      "tools": {
        "deny": ["exec", "browser"],
        "allow": ["web-fetch", "memory_search", "read", "write"]
      }
    }]
  }
}
```

---

## Phase 4: Heartbeat Automation (Week 2)

Agents that proactively check things on a schedule.

### Config

```json5
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "30m",
        "target": "last",
        "activeHours": {
          "start": "08:00",
          "end": "22:00",
          "timezone": "America/New_York"
        }
      }
    }
  }
}
```

### HEARTBEAT.md Template

```markdown
# Heartbeat Checklist

## Every 30 minutes
- Check Slack for unanswered client questions
- Review any pending lead enrichment requests
- Check for stuck workflows

## Response
If nothing needs attention, reply: HEARTBEAT_OK
```

### Cost Optimization (Critical)
- `isolatedSession: true` — reduces tokens from ~100K to ~2-5K per heartbeat
- `lightContext: true` — only loads HEARTBEAT.md, not full bootstrap
- Set `activeHours` — don't burn tokens at 3 AM
- `maxConcurrentRuns: 2` — prevent parallel token burn

---

## Phase 5: Cron Jobs (Week 2)

### Recommended Schedule

```bash
# Morning briefing (weekdays 8 AM ET)
openclaw cron add --name "Morning Brief" --cron "0 8 * * 1-5" \
  --tz "America/New_York" --session isolated --agent main \
  --message "Generate morning status: active leads, pending tasks, deliverables due today"

# Lead enrichment sweep (weekdays 10 AM ET)
openclaw cron add --name "Lead Enrichment" --cron "0 10 * * 1-5" \
  --tz "America/New_York" --session isolated --agent research \
  --message "Check Supabase for new leads needing Apollo enrichment. Process up to 50."

# Weekly analytics (Monday 9 AM ET)
openclaw cron add --name "Weekly Analytics" --cron "0 9 * * 1" \
  --tz "America/New_York" --session isolated --agent ops \
  --message "Generate weekly performance report from Supabase"

# Server health (every 6 hours)
openclaw cron add --name "Health Check" --every 6h \
  --session isolated --agent ops \
  --message "Check VPS 1 and VPS 2 container health, disk, memory"
```

---

## Phase 6: Webhook Integrations (Week 2)

### Config

```json5
{
  "hooks": {
    "enabled": true,
    "token": "vos-hooks-token-2026",
    "path": "/hooks",
    "mappings": [
      {
        "match": { "path": "apollo" },
        "action": "agent",
        "agentId": "sales"
      },
      {
        "match": { "path": "github" },
        "action": "agent",
        "agentId": "developer"
      },
      {
        "match": { "path": "supabase" },
        "action": "agent",
        "agentId": "ops"
      },
      {
        "match": { "path": "ventureOS" },
        "action": "agent",
        "agentId": "main"
      }
    ]
  }
}
```

### Webhook Endpoints
- `POST /hooks/wake` — Nudge main session
- `POST /hooks/agent` — Run isolated agent turn
- `POST /hooks/{name}` — Routed via mappings

---

## Phase 7: Memory Architecture (Week 3)

### Three-Tier System

| Tier | File | Loaded When | Purpose |
|------|------|-------------|---------|
| Working | Session context | Always | Current conversation |
| Daily | `memory/YYYY-MM-DD.md` | Today + yesterday | Running notes |
| Long-term | `MEMORY.md` | Private sessions only | Curated facts |

### Mem0 Integration Strategy
- Use Mem0 API for **cross-agent shared knowledge** (client prefs, decisions)
- Use builtin memory for **per-agent session context** (fast, local)
- Agents call Mem0 via `web_fetch` when they need shared context

### Memory Isolation
Each agent has separate session transcripts. Cross-agent memory requires explicit config.

---

## Phase 8: Skills Installation (Week 3)

### Priority Skills to Install

```bash
# From ClawHub
openclaw skills install handoff
openclaw skills install mission-control
openclaw skills install brand-build
openclaw skills install client-intake

# Custom skills to create
# /data/.openclaw/workspace/skills/apollo-enrichment/SKILL.md
# /data/.openclaw/workspace/skills/supabase-query/SKILL.md
# /data/.openclaw/workspace/skills/proposal-generator/SKILL.md
```

### Skill Precedence (highest to lowest)
1. Workspace skills (`workspace/skills/`)
2. Project agent skills (`workspace/.agents/skills/`)
3. Personal agent skills (`~/.agents/skills/`)
4. Managed/ClawHub skills (`~/.openclaw/skills/`)
5. Bundled skills

### Token Impact
Each skill adds ~24 tokens overhead. With 15 agents, keep skill counts per agent minimal.

---

## Phase 9: Security Hardening (Week 3)

### Sandbox Config

```json5
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main",
        "scope": "agent"
      }
    }
  }
}
```

- **non-main**: Sandboxes group/channel sessions, allows main session on host
- **scope: agent**: One container per agent (recommended for 15-agent setup)

### Agent-to-Agent Communication
Off by default. Enable explicitly:

```json5
{
  "tools": {
    "agentToAgent": {
      "allow": ["main", "sales", "research", "ops"]
    }
  }
}
```

---

## Phase 10: Production Deployment (Week 4)

### Optimize for VPS

```bash
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
```

### Diagnostic Commands

```bash
openclaw doctor              # Full diagnostic
openclaw doctor --fix        # Auto-repair
openclaw status              # Runtime status
openclaw health              # Health checks
openclaw memory status       # Memory index
openclaw cron list           # Scheduled jobs
openclaw mcp list            # MCP servers
```

### Config Hot Reload
Most changes apply WITHOUT restart: channels, agents, models, hooks, cron, sessions, tools.
Only gateway port/TLS and infrastructure changes need restart.

---

## Common Mistakes to Avoid

1. **Reusing agentDir across agents** — session collisions
2. **Overloading SOUL.md with ops rules** — keep ops in AGENTS.md, personality in SOUL.md
3. **No active hours on heartbeats** — burns tokens 24/7
4. **Skill allowlists are REPLACEMENT, not additive** — empty list = all skills
5. **Running 15 agents on 4GB VPS** — keep VPS 2 to 4 lightweight agents
6. **Skipping sandbox mode** — at minimum use "non-main"
7. **Not using isolatedSession for heartbeats** — 100K → 2-5K tokens per tick
8. **Storing secrets in workspace files** — use ${VAR} references
9. **Not backing up workspaces** — init as private git repos

---

## Implementation Order

| Week | What | Impact |
|------|------|--------|
| 1 | SOUL.md + IDENTITY.md for all 15 agents | Agents become useful |
| 1 | Slack bindings (channel → agent routing) | Right agent answers right channel |
| 1 | Tool policies per agent | Security baseline |
| 2 | HEARTBEAT.md + cron jobs | Proactive automation |
| 2 | Webhook mappings | External integrations trigger agents |
| 3 | Memory architecture + skills | Knowledge persistence |
| 3 | Security (sandbox + agent-to-agent) | Hardened deployment |
| 4 | Docker image build + monitoring | Production-grade ops |
