# North Bridge Digital Security Hardening Checklist

Review before every production deployment. Items marked with `[x]` are implemented. Items marked with `[ ]` require verification or manual action.

## Authentication & Authorization

- [x] Supabase RLS enabled on all tables (41 tables with policies)
- [x] Service role key never exposed to client -- only used in server actions and API routes
- [x] ANON key only used in browser via `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] All server actions validate `organization_id` before mutations
- [x] Webhook endpoints validate Bearer tokens (`OPENCLAW_WEBHOOK_SECRET`)
- [x] OpenClaw gateway tokens are unique per VPS (separate `.env.openclaw` per instance)
- [ ] Rotate all tokens and keys quarterly
- [ ] Verify no RLS policy has been accidentally disabled after schema changes

## Data Protection

- [x] No secrets in git -- `.gitignore` covers `.env`, `.env.local`, `.env.*.local`
- [x] `.env.example` contains placeholders only, no real values
- [x] API keys stored in environment variables, never hardcoded in source
- [x] Database backups enabled (Supabase auto-backup on Pro plan)
- [x] Sensitive fields not logged -- `audit_logs.changes` does not include passwords, tokens, or raw PII
- [ ] Verify `.env.example` has no leaked keys after every update
- [ ] Confirm Supabase backup schedule is active (check dashboard)
- [ ] Test backup restoration procedure at least once

## Communication Compliance

- [x] Consent check before every outbound message (`CommsService.checkConsent()`)
- [x] Suppression list check before every send (`CommsService.checkSuppression()`)
- [x] Quiet hours enforcement -- no sends between 9PM and 8AM recipient local time
- [x] First-contact campaigns require manual approval via approval workflow
- [x] All messages logged with attribution (company, campaign, operator) in `email_logs` / `sms_logs`
- [x] Unsubscribe handling in every email (via Resend)
- [x] Rate limiting on outbound -- per-contact and per-campaign limits enforced in `CommsService`
- [ ] Verify quiet hours timezone handling for multi-timezone contacts
- [ ] Test suppression list actually prevents delivery (send test to suppressed address)

## Financial Safety

- [x] Refunds require approval -- gated via `ApprovalService` with type `financial`
- [x] Payouts require approval -- same approval gate
- [x] No autonomous money movement -- all financial mutations require human approval
- [x] Test/live mode separation in Stripe -- `STRIPE_SECRET_KEY` prefix is `sk_test_` in dev, `sk_live_` in prod
- [x] All billing actions recorded in `audit_logs` with full change diffs
- [ ] Verify Stripe webhook signature validation is enabled (`STRIPE_WEBHOOK_SECRET`)
- [ ] Confirm test mode keys are not present in production `.env`
- [ ] Review Stripe dashboard for any unexpected charges or subscriptions

## Agent Safety

- [x] Agents cannot deploy to production without approval -- deployment actions gated by `ApprovalService`
- [x] Code execution in sandbox only -- Developer agent uses E2B/Daytona sandboxed environments
- [x] Tool permissions scoped per agent -- each agent definition specifies allowed tools in roster markdown
- [x] Memory write policies enforced -- agents only write to their designated memory scope
- [x] Cost tracking per agent -- `agent_costs` table records every model call with token counts and USD cost
- [x] High-risk actions gated by approval workflow -- orchestrator checks approval thresholds before executing
- [ ] Review agent cost logs weekly -- flag any agent spending > $10/day
- [ ] Verify agent memory scope boundaries are not bypassed
- [ ] Audit tool call logs for any unexpected tool usage patterns

## Infrastructure

- [x] SSH key-based auth on both VPS instances (password + key)
- [ ] UFW/firewall rules configured:
  - [ ] Port 22 (SSH) -- open
  - [ ] Port 80 (HTTP) -- open (redirects to 443)
  - [ ] Port 443 (HTTPS) -- open
  - [ ] Port 3000 (Next.js) -- internal only (behind Traefik)
  - [ ] Port 18789 (OpenClaw gateway) -- internal only (behind Traefik)
  - [ ] All other ports -- closed
- [x] Docker containers set to restart on failure (`restart: always`)
- [x] SSL certificates auto-renewed via Traefik/Let's Encrypt
- [ ] VPS snapshots taken before major changes
- [x] Separate VPS for workers (187.77.207.22) vs dashboard (145.223.75.46)
- [ ] Disable root SSH login (use a non-root user with sudo)
- [ ] Enable fail2ban for SSH brute-force protection
- [ ] Set up unattended security updates on both VPS

## Monitoring

- [x] Container health checks defined in Docker Compose (HTTP probes on all services)
- [ ] Supabase connection monitoring -- alert if active connections > 80% of pool
- [x] OpenClaw gateway health endpoint at `/health`
- [ ] Agent cost alerts configured -- threshold: $10/day per agent
- [ ] Disk space alerts configured -- threshold: >80% usage
- [ ] Failed workflow run alerts -- notify on 3+ consecutive failures
- [ ] Set up uptime monitoring for `app.thenorthbridgemi.com` and `claw.thenorthbridgemi.com`
- [ ] Configure Supabase database alerts for slow queries (>5s)

## Pre-Deployment Verification

Before every production deploy, verify:

1. `pnpm typecheck` passes with no errors
2. `pnpm build` succeeds (no build failures)
3. `.env` has no test/placeholder values
4. VPS snapshot taken
5. Database backup is recent (< 24 hours)
6. All health endpoints respond correctly
7. No pending critical approvals that would block operations
