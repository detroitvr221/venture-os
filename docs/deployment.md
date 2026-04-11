# North Bridge Digital Deployment Guide

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 22+ | LTS recommended |
| pnpm | 9+ | `corepack enable && corepack prepare pnpm@latest --activate` |
| Docker | 24+ | For local services and VPS deployment |
| Docker Compose | 2.20+ | Included with Docker Desktop |
| Supabase account | -- | [supabase.com](https://supabase.com) |
| Stripe account | -- | [stripe.com](https://stripe.com) |
| Domain | -- | DNS access to thenorthbridgemi.com |

## Environment Setup

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Fill in every key. See [docs/env-reference.md](./env-reference.md) for the full list with descriptions and where to find each value.

3. Critical keys that must be set before anything works:

| Key | Source |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings > API (keep secret) |
| `OPENAI_API_KEY` | platform.openai.com > API Keys |
| `STRIPE_SECRET_KEY` | Stripe dashboard > Developers > API Keys |
| `OPENCLAW_GATEWAY_URL` | Your OpenClaw gateway address |
| `OPENCLAW_API_KEY` | Generated during OpenClaw setup |

## Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Local Services

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 54322 (Supabase-compatible with pgvector)
- **Redis** on port 6379 (for Trigger.dev)
- **MailHog** on port 8025 (web UI for captured emails)

Verify services are healthy:

```bash
docker compose ps
```

### 3. Apply Database Migrations

```bash
pnpm db:migrate
```

### 4. Seed Data (optional)

```bash
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

The dashboard is available at `http://localhost:3000`.

MailHog web UI is at `http://localhost:8025` -- all outbound email in dev mode is captured here.

## Supabase Setup

### Create Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project in your organization
3. Choose a region close to your VPS (e.g., US East for Hostinger US East)
4. Save the project URL, anon key, and service role key

### Apply Migrations

The full schema lives in `packages/db/src/schema.sql`. Apply it to your Supabase project:

1. Open the Supabase SQL Editor
2. Paste the contents of `schema.sql`
3. Run the query

Or use the Supabase CLI:

```bash
supabase db push --db-url postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

### Verify RLS

All 41 tables have Row-Level Security policies. Verify in the Supabase dashboard under Authentication > Policies. Every table should show at least one policy.

### Enable Extensions

Required extensions (already in schema.sql):
- `pgvector` -- for embedding-based memory search
- `uuid-ossp` -- for UUID generation

## VPS Deployment

North Bridge Digital runs on two Hostinger VPS instances.

### VPS 1: Dashboard + OpenClaw Gateway

- **IP**: 145.223.75.46
- **Runs**: North Bridge Digital Next.js app, OpenClaw master gateway
- **Domains**: app.thenorthbridgemi.com, claw.thenorthbridgemi.com

### VPS 2: OpenClaw Workers

- **IP**: 187.77.207.22
- **Runs**: OpenClaw worker agents
- **Domain**: workers.thenorthbridgemi.com (internal)

### Docker Compose Deployment (VPS 1)

Create `docker-compose.production.yml` on VPS 1:

```yaml
version: "3.8"

services:
  traefik:
    image: traefik:v3
    restart: always
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@thenorthbridgemi.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "letsencrypt:/letsencrypt"

  ventureos:
    image: node:22-alpine
    restart: always
    working_dir: /app
    volumes:
      - ./venture-os:/app
    command: sh -c "pnpm install --frozen-lockfile && pnpm --filter @venture-os/web build && pnpm --filter @venture-os/web start"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ventureos.rule=Host(`app.thenorthbridgemi.com`)"
      - "traefik.http.routers.ventureos.entrypoints=websecure"
      - "traefik.http.routers.ventureos.tls.certresolver=letsencrypt"
      - "traefik.http.services.ventureos.loadbalancer.server.port=3000"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  openclaw-gateway:
    image: ghcr.io/openclaw/gateway:latest
    restart: always
    env_file:
      - .env.openclaw
    ports:
      - "18789:18789"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.openclaw.rule=Host(`claw.thenorthbridgemi.com`)"
      - "traefik.http.routers.openclaw.entrypoints=websecure"
      - "traefik.http.routers.openclaw.tls.certresolver=letsencrypt"
      - "traefik.http.services.openclaw.loadbalancer.server.port=18789"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:18789/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  letsencrypt:
```

### Deploy via Hostinger API

If using Hostinger VPS with Docker Compose projects:

```bash
# Upload docker-compose.production.yml and deploy
# Use the Hostinger VPS API or hPanel to create a Docker Compose project
```

The Hostinger API `createNewProjectV1` endpoint accepts a `content` field with the compose YAML and deploys it to the target VPS.

### DNS Setup

Add these DNS records for `thenorthbridgemi.com`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | app | 145.223.75.46 | 3600 |
| A | claw | 145.223.75.46 | 3600 |
| A | workers | 187.77.207.22 | 3600 |

### Traefik HTTPS

Traefik auto-provisions Let's Encrypt certificates. On first deploy:

1. Ensure ports 80 and 443 are open on the VPS firewall
2. Ensure DNS records point to the VPS IP
3. Start the stack -- Traefik will obtain certs automatically
4. Certs auto-renew 30 days before expiration

## OpenClaw Configuration

### Gateway Config (VPS 1)

Create `.env.openclaw` on VPS 1:

```bash
OPENCLAW_PORT=18789
OPENCLAW_API_KEY=your-unique-gateway-token
OPENCLAW_WEBHOOK_URL=https://app.thenorthbridgemi.com/api/openclaw/webhook
OPENCLAW_WEBHOOK_SECRET=your-webhook-secret

# Slack integration (optional)
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token

# Model configuration
DEFAULT_MODEL=gpt-4o
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-proj-your-key
```

### Worker Config (VPS 2)

Workers connect back to the gateway on VPS 1:

```bash
OPENCLAW_GATEWAY_URL=https://claw.thenorthbridgemi.com
OPENCLAW_WORKER_TOKEN=your-worker-token
WORKER_CONCURRENCY=4
```

## Monitoring and Logs

### Container Logs

Via Hostinger VPS API:

```bash
# List running projects
# GET /api/vps/v1/virtual-machines/{vmId}/projects

# View project logs
# GET /api/vps/v1/virtual-machines/{vmId}/projects/{projectName}/logs
```

Or SSH into the VPS:

```bash
ssh root@145.223.75.46
docker compose -f docker-compose.production.yml logs -f ventureos
docker compose -f docker-compose.production.yml logs -f openclaw-gateway
```

### Supabase Dashboard

Monitor database health, active connections, and query performance at:
`https://supabase.com/dashboard/project/[PROJECT_REF]`

Key metrics to watch:
- Active connections (should stay under pool limit)
- Query execution time (slow query log)
- Storage usage
- Auth active users

### OpenClaw Gateway Health

```bash
curl https://claw.thenorthbridgemi.com/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "1.x.x",
  "uptime_seconds": 86400,
  "agents_active": 11
}
```

## Backup Strategy

### Supabase Backups

- **Automatic**: Supabase runs daily backups on Pro plan (7-day retention)
- **Point-in-time recovery**: Available on Pro plan, 7-day window
- **Manual**: Use `pg_dump` via the Supabase connection string for on-demand backups

### VPS Snapshots

Take snapshots before major changes:

```bash
# Via Hostinger API
# POST /api/vps/v1/virtual-machines/{vmId}/snapshot
```

Schedule weekly snapshots. Only one snapshot per VPS is retained -- new snapshots overwrite the previous one.

### Application Backups

- **Code**: Git repository (GitHub)
- **Environment variables**: Store encrypted copies in a password manager, never in git
- **Docker volumes**: Periodic `docker cp` or volume backup for persistent data

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.production.yml logs ventureos --tail 50

# Check resource usage
docker stats

# Restart specific service
docker compose -f docker-compose.production.yml restart ventureos
```

### SSL Certificate Issues

```bash
# Check Traefik logs for ACME errors
docker compose -f docker-compose.production.yml logs traefik --tail 50

# Verify DNS is pointing correctly
dig app.thenorthbridgemi.com +short

# Force cert renewal by removing acme.json
docker compose -f docker-compose.production.yml exec traefik rm /letsencrypt/acme.json
docker compose -f docker-compose.production.yml restart traefik
```

### Database Connection Errors

```bash
# Test connection from VPS
PGPASSWORD=yourpassword psql -h db.yourproject.supabase.co -U postgres -d postgres -c "SELECT 1"

# Check if Supabase project is active (not paused)
# Visit supabase.com/dashboard and check project status

# If using local postgres, check container health
docker compose ps postgres
```

### OpenClaw Gateway Unreachable

```bash
# Check if gateway container is running
docker compose -f docker-compose.production.yml ps openclaw-gateway

# Test health endpoint locally (from VPS)
curl http://localhost:18789/health

# Check firewall allows port 18789 internally
ufw status
```

### High Memory / Disk Usage

```bash
# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean unused images and containers
docker system prune -a --volumes

# Check VPS metrics via Hostinger API
# GET /api/vps/v1/virtual-machines/{vmId}/metrics
```
