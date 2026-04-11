# Northbridge Digital — Monitoring Setup

## UptimeRobot (Free — 50 monitors)

1. Sign up at https://uptimerobot.com (free plan)
2. Add these monitors:

| Monitor Name | URL | Type | Interval |
|---|---|---|---|
| Dashboard | https://thenorthbridgemi.com/api/health | HTTP(s) | 5 min |
| Landing Page | https://thenorthbridgemi.com/ | HTTP(s) | 5 min |
| OpenClaw VPS1 | https://claw.thenorthbridgemi.com/ | HTTP(s) | 5 min |
| OpenClaw VPS2 | http://187.77.207.22:18789/health | HTTP(s) | 5 min |
| Email Inbound | Port 25 on 145.223.75.46 | Port | 5 min |
| Supabase | https://lwxhdiximymbpaazhulo.supabase.co/rest/v1/ | HTTP(s) | 5 min |

3. Set up alerts:
   - Email: hello@thenorthbridgemi.org
   - Slack webhook (optional): Add to #ops channel

4. Get API key from UptimeRobot dashboard → Settings → API Settings
5. Add to env: `UPTIMEROBOT_API_KEY=ur_api_key_here`

## Built-in Health Endpoint

`GET /api/health` checks:
- Dashboard (self)
- Supabase connectivity
- OpenClaw VPS 1 (https://claw.thenorthbridgemi.com/)
- OpenClaw VPS 2 (http://187.77.207.22:18789/health)

Returns `200 healthy` or `503 degraded` with per-check status.
