---
name: northbridge-ops
description: "Northbridge Digital operating system command center. Use this skill whenever the user wants to check system status, deploy updates, query the database, send emails, trigger agents, manage DNS, audit security, view logs, check bookings, or monitor infrastructure. Triggers on: 'status', 'deploy', 'db query', 'send email', 'trigger agent', 'dns', 'audit', 'logs', 'booking', 'monitor', 'health check', 'redeploy', 'check containers', 'what's running', 'system check', 'how's the site', 'check leads', 'check clients', 'send an email to', 'run agent', 'check dns', 'security audit', 'container logs', 'check bookings', 'vps status', or any operational command about Northbridge Digital infrastructure."
---

# Northbridge Digital — Operations Command Center

You are the operator for Northbridge Digital's infrastructure. This skill gives you direct access to every system in the stack. Use the appropriate tools for each command.

## Infrastructure Map

| System | Location | ID/URL |
|--------|----------|--------|
| Dashboard | thenorthbridgemi.com | Next.js on VPS 1, port 3000 |
| OpenClaw Gateway | claw.thenorthbridgemi.com | VPS 1 (ID: 1569107), port 18789 |
| OpenClaw Workers | 187.77.207.22:18789 | VPS 2 (ID: 1398378), port 18789 |
| Supabase | lwxhdiximymbpaazhulo.supabase.co | Project: lwxhdiximymbpaazhulo |
| SMTP Receiver | mail.thenorthbridgemi.org | VPS 1, port 25 |
| Traefik | VPS 1 | HTTPS reverse proxy |
| Domain | thenorthbridgemi.org | Hostinger DNS |
| Cal.com | cal.com/detroit-wwzue8 | Booking system |
| Trigger.dev | proj_kcgxzdrphdkewxfwwboy | 6 workflow jobs |

## Commands

When the user gives an operational command, match it to the right action below. Commands can be given naturally — "check status", "how's everything running", "send an email to john@acme.com", "what leads do we have", etc.

---

### STATUS — Full system health check

Run when: "status", "health", "how's the site", "system check", "what's running"

```
1. curl -s https://thenorthbridgemi.com/api/health | python3 -m json.tool
2. Use mcp__hostinger-mcp__VPS_getProjectListV1 for VPS 1569107
3. Use mcp__hostinger-mcp__VPS_getProjectListV1 for VPS 1398378
4. Report: dashboard, supabase, openclaw vps1, openclaw vps2, all container states
```

Report format:
```
| System | Status | Details |
|--------|--------|---------|
```

---

### DEPLOY — Redeploy services

Run when: "deploy", "redeploy", "update dashboard", "restart openclaw", "push changes"

**Dashboard:**
```
Use mcp__hostinger-mcp__VPS_updateProjectV1 with virtualMachineId: 1569107, projectName: "venture-os"
```
Note: This pulls latest from GitHub and rebuilds. Takes ~5 minutes.

**OpenClaw VPS 1:**
```
Use mcp__hostinger-mcp__VPS_updateProjectV1 with virtualMachineId: 1569107, projectName: "openclaw"
```
Note: Reinstalls MCP packages + Playwright. Takes ~6 minutes.

**OpenClaw VPS 2:**
```
Use mcp__hostinger-mcp__VPS_updateProjectV1 with virtualMachineId: 1398378, projectName: "openclaw-workers"
```

**SMTP Receiver:**
```
Use mcp__hostinger-mcp__VPS_updateProjectV1 with virtualMachineId: 1569107, projectName: "smtp-receiver"
```

After deploying, wait and verify with a health check.

---

### DB — Query the database

Run when: "check leads", "how many clients", "show emails", "query", "db", "database"

Use `mcp__aa93da0d-cc0a-406e-af44-52dfad9dffd6__execute_sql` with `project_id: "lwxhdiximymbpaazhulo"`.

Common queries:
- **Leads:** `SELECT id, name, email, company, stage, score, created_at FROM public.leads ORDER BY created_at DESC LIMIT 20;`
- **Clients:** `SELECT id, name, email, industry, status, created_at FROM public.clients ORDER BY created_at DESC;`
- **Emails:** `SELECT id, direction, from_address, subject, status, received_at FROM public.emails ORDER BY received_at DESC LIMIT 20;`
- **Agents:** `SELECT name, model, status FROM public.agents ORDER BY name;`
- **Row counts:** `SELECT relname as table_name, n_live_tup as rows FROM pg_stat_user_tables WHERE schemaname = 'public' AND n_live_tup > 0 ORDER BY n_live_tup DESC;`
- **Chat threads:** `SELECT id, user_id, title, status, message_count, last_message_at FROM public.chat_threads ORDER BY last_message_at DESC LIMIT 20;`
- **Proposals:** `SELECT id, title, status, total_value, created_at FROM public.proposals ORDER BY created_at DESC;`
- **Invoices:** `SELECT id, client_id, status, total, created_at FROM public.invoices ORDER BY created_at DESC;`

For custom queries, construct the SQL based on what the user asks. The database has 48 tables — use `list_tables` if unsure of schema.

---

### EMAIL — Send email

Run when: "send email", "email", "send a message to"

```bash
curl -s -X POST "https://thenorthbridgemi.com/api/email/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vos-webhook-secret-2026" \
  -d '{
    "from": "hello@thenorthbridgemi.org",
    "to": ["RECIPIENT"],
    "subject": "SUBJECT",
    "text": "BODY"
  }'
```

Available from addresses: hello@, team@, support@, noreply@ (all @thenorthbridgemi.org)

---

### AGENT — Trigger OpenClaw agent

Run when: "trigger agent", "run agent", "ask atlas", "have mercury do"

```bash
curl -s -X POST "https://thenorthbridgemi.com/api/openclaw/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer vos-webhook-secret-2026" \
  -d '{
    "agent_id": "AGENT_ID",
    "organization_id": "00000000-0000-0000-0000-000000000001",
    "message": "THE TASK"
  }'
```

Agent IDs: main (Atlas), sales (Mercury), seo (Beacon), web-presence (Canvas), ai-integration (Nexus), venture-builder (Forge), developer (Cipher), ops (Pulse), finance (Ledger), research (Scout), compliance (Sentinel)

---

### DNS — Manage DNS records

Run when: "check dns", "dns records", "update dns", "add record"

**View records:**
```
Use mcp__hostinger-mcp__DNS_getDNSRecordsV1 with domain: "thenorthbridgemi.org"
```

**Update records:**
```
Use mcp__hostinger-mcp__DNS_updateDNSRecordsV1 with domain: "thenorthbridgemi.org"
```

Current records: A (145.223.75.46), MX (mail.thenorthbridgemi.org), SPF, DKIM, DMARC, mail A record.

---

### AUDIT — Security and performance audit

Run when: "audit", "security check", "performance check", "advisors"

```
Use mcp__aa93da0d-cc0a-406e-af44-52dfad9dffd6__get_advisors with project_id: "lwxhdiximymbpaazhulo", type: "security"
Use mcp__aa93da0d-cc0a-406e-af44-52dfad9dffd6__get_advisors with project_id: "lwxhdiximymbpaazhulo", type: "performance"
```

Summarize findings by severity (CRITICAL > WARN > INFO) with actionable recommendations.

---

### LOGS — Container logs

Run when: "logs", "container logs", "what happened", "check errors"

```
Use mcp__hostinger-mcp__VPS_getProjectLogsV1 with:
  - VPS 1 (1569107): projectName = "openclaw" | "venture-os" | "smtp-receiver" | "traefik"
  - VPS 2 (1398378): projectName = "openclaw-workers"
```

Look for errors, restarts, MCP connection failures, build failures, and Slack disconnections.

---

### BOOKING — Cal.com bookings

Run when: "bookings", "check calendar", "appointments", "scheduled calls"

```bash
# List event types
curl -s "https://api.cal.com/v2/event-types" \
  -H "Authorization: Bearer $CAL_API_KEY" \
  -H "cal-api-version: 2024-06-14"

# List bookings
curl -s "https://api.cal.com/v2/bookings" \
  -H "Authorization: Bearer $CAL_API_KEY" \
  -H "cal-api-version: 2024-06-14"
```

Note: CAL_API_KEY is in the dashboard env. For direct API calls, use the /api/cal proxy route on the dashboard.

---

### MONITOR — Full infrastructure monitoring

Run when: "monitor", "full check", "everything running?", "container status"

Run ALL of these in parallel:
1. Health endpoint: `curl -s https://thenorthbridgemi.com/api/health`
2. VPS 1 containers: `mcp__hostinger-mcp__VPS_getProjectContainersV1` for 1569107 (all 4 projects)
3. VPS 2 containers: `mcp__hostinger-mcp__VPS_getProjectContainersV1` for 1398378
4. OpenClaw VPS 1: `curl -s https://claw.thenorthbridgemi.com/ -o /dev/null -w "%{http_code}"`
5. OpenClaw VPS 2: `curl -s http://187.77.207.22:18789/health`
6. Database: `mcp__aa93da0d-cc0a-406e-af44-52dfad9dffd6__execute_sql` — `SELECT count(*) FROM public.emails;`
7. Landing page: `curl -s -o /dev/null -w "%{http_code}" https://thenorthbridgemi.com/`

Report format:
```
## System Monitor — [timestamp]

| Component | Status | Uptime | Details |
|-----------|--------|--------|---------|
| Dashboard | ✅/❌ | Xm | ... |
| Supabase | ✅/❌ | — | ... |
| OpenClaw VPS1 | ✅/❌ | Xm | X agents, Y MCP servers |
| OpenClaw VPS2 | ✅/❌ | Xm | X agents |
| SMTP Receiver | ✅/❌ | Xm | port 25 |
| Traefik | ✅/❌ | Xm | HTTPS proxy |
| Landing Page | ✅/❌ | — | HTTP XXX |

### Containers
| VPS | Project | Container | State | Uptime |
```

---

## Quick Reference

**VPS IDs:** VPS 1 = 1569107, VPS 2 = 1398378
**Supabase:** project_id = lwxhdiximymbpaazhulo
**Org ID:** 00000000-0000-0000-0000-000000000001
**Domain:** thenorthbridgemi.org
**Dashboard:** thenorthbridgemi.com
**OpenClaw:** claw.thenorthbridgemi.com
**Email webhook secret:** nbdigital-mail-2026
**OpenClaw webhook secret:** vos-webhook-secret-2026

Always report results in clean tables. Be concise. Flag anything broken or unusual.
