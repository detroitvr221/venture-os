# Runbook: Incident Response

What to do when something breaks. Follow these steps in order.

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|---------|
| SEV1 | Service down, all users affected | Immediate | Dashboard unreachable, database down |
| SEV2 | Major feature broken, some users affected | < 30 min | Agent runs failing, billing broken |
| SEV3 | Minor feature degraded | < 4 hours | Slow queries, one agent unresponsive |
| SEV4 | Cosmetic or non-blocking | Next business day | UI glitch, log noise |

## Step 1: Check Container Status

### Via SSH

```bash
# VPS 1 (Dashboard + Gateway)
ssh root@145.223.75.46
docker compose -f docker-compose.production.yml ps
docker stats --no-stream

# VPS 2 (Workers)
ssh root@187.77.207.22
docker compose ps
docker stats --no-stream
```

### Via Hostinger API

```
GET /api/vps/v1/virtual-machines/{vmId}/projects/{projectName}/containers
GET /api/vps/v1/virtual-machines/{vmId}/projects/{projectName}/logs
```

What to look for:
- Containers in `restarting` or `exited` state
- High CPU (>90%) or memory (>85%) usage
- OOM (out of memory) kills in logs

## Step 2: Check Supabase Health

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Check the project status indicator (green = healthy)
3. Check Database > Connection Pooling for connection count
4. Check Logs > Postgres for errors

Common Supabase issues:
- **Project paused**: Free-tier projects pause after inactivity. Restore via dashboard or API.
- **Connection limit reached**: Too many open connections. Check for connection leaks in the app.
- **Slow queries**: Check the slow query log in Supabase Logs > Postgres.

Quick test from CLI:

```bash
curl -s https://[PROJECT_REF].supabase.co/rest/v1/ \
  -H "apikey: [ANON_KEY]" \
  -H "Authorization: Bearer [ANON_KEY]" | head -c 200
```

## Step 3: Check OpenClaw Gateway Health

```bash
# From VPS 1
curl http://localhost:18789/health

# From outside
curl https://claw.thenorthbridgemi.com/health
```

Expected response:

```json
{
  "status": "healthy",
  "agents_active": 11
}
```

If status is `degraded` or `down`:
1. Check gateway container logs: `docker logs openclaw-gateway --tail 100`
2. Verify API keys in `.env.openclaw` are still valid
3. Check if the model provider (OpenAI/Anthropic) is having an outage
4. Restart the gateway: `docker compose restart openclaw-gateway`

## Step 4: Common Issues and Fixes

### Container Restart Loop

**Symptoms**: Container status shows `restarting`, log shows repeated crash.

```bash
# Get the last crash log
docker logs ventureos --tail 50

# Common causes:
# 1. Missing environment variable -> check .env file
# 2. Port already in use -> check for conflicting containers
# 3. Out of memory -> increase VPS RAM or reduce container limits
```

**Fix**: Address the root cause in logs, then:

```bash
docker compose -f docker-compose.production.yml up -d ventureos
```

### SSH Down

**Symptoms**: Cannot SSH into VPS.

1. Check VPS status via Hostinger hPanel or API
2. If VPS is running but SSH fails:
   - Try from a different network (IP might be blocked by fail2ban)
   - Use Hostinger console access via hPanel
   - Check if UFW is blocking port 22
3. If VPS is stopped:
   - Start via API: `POST /api/vps/v1/virtual-machines/{vmId}/start`
   - Or start from hPanel

### SSL Certificate Expired

**Symptoms**: Browser shows certificate error, HTTPS fails.

```bash
# Check cert expiry
echo | openssl s_client -connect app.thenorthbridgemi.com:443 2>/dev/null | openssl x509 -noout -dates

# Check Traefik logs for ACME errors
docker logs traefik --tail 50 | grep -i acme

# Force renewal
docker exec traefik rm /letsencrypt/acme.json
docker restart traefik
```

Traefik renews certs 30 days before expiry. If renewal fails:
- Verify DNS still points to the correct IP
- Verify ports 80 and 443 are open
- Check if Let's Encrypt rate limits are hit (5 certs per domain per week)

### Database Connection Errors

**Symptoms**: App returns 500 errors, logs show `ECONNREFUSED` or `too many connections`.

```bash
# Test connection
PGPASSWORD=[password] psql -h db.[PROJECT_REF].supabase.co -U postgres -d postgres -c "SELECT count(*) FROM pg_stat_activity"
```

Fixes:
- **Too many connections**: Restart the app to release stale connections. Check for missing `.finally()` cleanup in database calls.
- **Connection refused**: Supabase project may be paused. Check dashboard and restore if needed.
- **Timeout**: Check if Supabase is experiencing an outage at [status.supabase.com](https://status.supabase.com).

### Agent Runs Failing

**Symptoms**: Agent threads stuck in `open` status, no tool calls being recorded.

1. Check OpenClaw gateway health (Step 3)
2. Check the specific agent's last successful run in `agent_threads` table
3. Check `agent_costs` to verify the model provider is responding
4. Check `audit_logs` for error entries from `openclaw-trigger`

```sql
-- Find recent failed agent activity
SELECT * FROM audit_logs
WHERE actor_id = 'openclaw-trigger'
AND changes->>'error' IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### High Disk Usage

```bash
# Check overall disk
df -h /

# Check Docker disk
docker system df

# Clean up
docker image prune -a       # Remove unused images
docker container prune       # Remove stopped containers
docker volume prune          # Remove unused volumes (CAUTION: check what's unused first)
```

## Step 5: Escalation Paths

| Situation | Escalate To | Method |
|-----------|-------------|--------|
| VPS unresponsive | Hostinger support | hPanel ticket |
| Supabase outage | Supabase support | Dashboard ticket + status.supabase.com |
| OpenAI/Anthropic outage | Wait + monitor | Check status pages |
| Stripe webhook failures | Stripe support | Dashboard + webhook logs |
| Domain/DNS issues | Domain registrar | DNS management panel |
| Data loss suspected | Supabase backup restore | Dashboard > Backups |

## Post-Incident

After resolving any SEV1 or SEV2 incident:

1. Write a brief incident summary in `audit_logs` or a shared doc
2. Note: what happened, when, impact, root cause, fix applied
3. Create follow-up tasks if systemic fixes are needed
4. Take a VPS snapshot after confirming stability
