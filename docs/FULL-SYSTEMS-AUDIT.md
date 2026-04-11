# Northbridge Digital — Principal Systems Audit
**Date:** April 11, 2026
**Auditor:** Principal Systems Architect
**Scope:** Complete operating system, tooling, integrations, agents, sales, billing, compliance, and scale readiness

---

## SECTION 1 — Executive Summary

Northbridge Digital has a functional MVP with real infrastructure: 2 VPS instances, 15 agents across 2 OpenClaw gateways, 42 Supabase tables, 9 MCP servers, 6 Trigger.dev workflows, a Next.js dashboard with 32 routes, inbound/outbound email, and a complete CRM pipeline from lead to client.

**However, this is a prototype operating as if it were production.** The critical gaps:

1. **Security is wide open** — Every table has `USING (true)` RLS policies. The anon key has unrestricted write access to all 42 tables. Anyone with the Supabase URL could delete all data.
2. **No real clients yet** — 32 of 42 tables are empty. The system hasn't been tested under real load.
3. **No Stripe integration** — Billing pages exist but no payment processing. Can't charge the $99-$299/mo packages.
4. **No onboarding flow** — Lead intake exists but no client onboarding, no contract signing, no service activation.
5. **No delivery workflow** — Tasks and projects tables exist but no actual work delivery system.
6. **No client portal** — Clients can't see their own reports, invoices, or project status.
7. **Memory is empty** — All 3 memory tables have 0 rows. Agents can't learn or remember.
8. **Agents are configured but untested** — 11 agents with SOUL.md files but no evidence of actual task completion.

**The good news:** The architecture is sound. The monorepo structure, Supabase schema, agent config, MCP server setup, and dashboard are well-designed. The work needed is hardening, filling gaps, and moving from "built" to "operating."

**Readiness Score: 45/100** — Platform built, not yet operational.

---

## SECTION 2 — What Exists Today

### Infrastructure (Strong)
- 2 VPS instances (8GB + 4GB), both running
- Traefik reverse proxy with auto-TLS
- Docker Compose deployment via Hostinger API
- Domain with HTTPS, mail server, DKIM/DMARC/SPF

### Database (Built, Empty)
- 42 tables covering full business model
- RLS enabled on all tables (but policies are permissive)
- Only 10 tables have any data (mostly seed data)
- pgvector + pg_trgm extensions installed

### Dashboard (Functional)
- 32 routes covering leads, clients, projects, proposals, email, billing, SEO, agents, workflows, memory, intake, companies, settings
- Auth via Supabase (email/password)
- Server actions for all CRUD operations
- Real-time data from Supabase

### Agent Layer (Configured)
- 11 agents on VPS 1, 4 on VPS 2
- 9 MCP servers (GitHub, Filesystem, Supabase, Sequential Thinking, Playwright, Memory, Context7, Vapi, SearchAPI)
- Slack connected
- Heartbeat system configured
- Tool policies per agent

### Email (Working)
- Inbound: SMTP receiver on port 25 → webhook → Supabase
- Outbound: Resend API
- 7 emails in system (test + 1 real Gmail delivery confirmed)

### Workflows (Deployed)
- 6 Trigger.dev jobs deployed to cloud
- Lead intake, proposal generation, follow-up sequence, SEO audit, monthly report, launch company

### Integrations (Partially Connected)
| Service | Status |
|---------|--------|
| Supabase | Connected |
| OpenClaw | Connected |
| Resend | Connected |
| Apollo.io | Connected (key set) |
| Firecrawl | Key set, not tested |
| Mem0 | Key set, API only |
| Vapi | Connected (voice AI) |
| SearchAPI | Connected (50+ search tools) |
| Stripe | NOT connected (no key) |
| Twilio | NOT connected |
| Trigger.dev | Connected (6 jobs) |

---

## SECTION 3 — Missing Core Systems

### 3.1 Client Onboarding System — MISSING
**Impact: Cannot activate new clients**
No onboarding flow exists. When a lead becomes a client, there's no:
- Welcome email sequence
- Service agreement / contract signing
- Client portal access setup
- Project kickoff workflow
- Initial audit/discovery process
- Billing activation

**Needed:**
- `/onboarding/[clientId]` dashboard flow
- Onboarding checklist template in Supabase
- Welcome email template via Resend
- Contract/agreement template (DocuSign or manual)
- Trigger.dev onboarding workflow

### 3.2 Client Portal — MISSING
**Impact: Clients can't see their own status**
No client-facing view exists. Clients should see:
- Project progress
- Monthly reports
- Invoices and payment status
- Deliverables
- Communication history

**Needed:**
- Separate auth role for clients (currently only admin)
- `/portal/[clientId]` routes with scoped data
- RLS policies scoping client data by client_id

### 3.3 Service Delivery System — MISSING
**Impact: No structured way to do the actual work**
Tasks table exists but there's no:
- Task templates per service tier
- Delivery checklists (what does "$99 Launch" include month-to-month?)
- Quality checkpoints
- Handoff between agents/humans
- Time tracking
- Deliverable approval flow

**Needed:**
- `service_templates` table mapping package → monthly deliverables
- Task creation automation when subscription activates
- Monthly task generation workflow
- Delivery checklist dashboard

### 3.4 Contract/Agreement System — MISSING
**Impact: No legal protection, no formal commitments**
No document signing, no terms of service, no service level agreements.

**Needed:**
- Terms of Service page
- Service Agreement template
- Digital signature (DocuSign, HelloSign, or simple e-sign)
- `contracts` table in Supabase

### 3.5 Client Reporting System — MISSING
**Impact: Can't demonstrate value to clients**
No automated client reporting. Monthly reports are promised ($99 tier includes "1 monthly check-in") but no system generates them.

**Needed:**
- Report template per service tier
- Automated monthly report generation (Trigger.dev `monthly-report` job exists but needs data)
- PDF/email delivery to clients
- Report history in Supabase

### 3.6 Support/Ticket System — MISSING
**Impact: No way for clients to request help**
No support tickets, no help desk, no knowledge base.

**Needed:**
- `support_tickets` table
- `/support` dashboard page
- Client-facing support form
- SLA tracking per tier

### 3.7 Standard Operating Procedures — MISSING
**Impact: Operations depend on tribal knowledge**
The `playbooks` table exists but has 0 rows. No SOPs documented.

**Needed:**
- SOP for each service tier (what to do each month)
- SOP for client onboarding
- SOP for SEO audit delivery
- SOP for content creation
- SOP for incident response
- Store in `playbooks` table + filesystem

### 3.8 Stripe Billing — NOT CONNECTED
**Impact: Cannot charge clients**

**Needed:**
- Stripe account with products matching 6 tiers
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in env
- Webhook endpoint for subscription events
- Checkout flow for new clients
- Subscription management (upgrade/downgrade/cancel)

### 3.9 Calendar/Scheduling — MISSING
**Impact: Can't book meetings with prospects or clients**
No Calendly, Cal.com, or scheduling integration.

**Needed:**
- Cal.com or Calendly integration
- Booking link on website
- Calendar sync for monthly check-ins

### 3.10 Analytics/Tracking — MISSING
**Impact: Can't measure website performance or marketing ROI**
No Google Analytics, no Plausible, no Mixpanel, no tracking on the landing page.

**Needed:**
- Analytics on thenorthbridgemi.com
- Conversion tracking (signup, intake form, consultation booking)
- UTM parameter handling

---

## SECTION 4 — Tool/API/Integration Audit

| Category | Tool | Role | Status | Risk | Action |
|----------|------|------|--------|------|--------|
| **Website** | Next.js 15 | Dashboard + landing | Active | LOW | Keep. Update to latest. |
| **Styling** | Tailwind CSS v3 | UI | Active | LOW | Keep |
| **Auth** | Supabase Auth | Email/password | Active | MEDIUM | Add OAuth (Google), add MFA |
| **Database** | Supabase PostgreSQL 17 | All data | Active | HIGH | Fix RLS, add indexes, add service role key |
| **Hosting** | Hostinger VPS x2 | All infra | Active | MEDIUM | No SSH (API only), DNS issues historically |
| **Reverse Proxy** | Traefik | HTTPS/routing | Active | LOW | Keep |
| **Workflow Engine** | Trigger.dev | 6 jobs | Active | LOW | Add env vars for jobs to access services |
| **Memory (MCP)** | server-memory | Knowledge graph | Active | LOW | Start using it — currently empty |
| **Memory (API)** | Mem0 | Text memory | Configured | MEDIUM | No evidence of use. Clarify role vs MCP memory |
| **Email Out** | Resend | Transactional | Active | LOW | Keep |
| **Email In** | Custom SMTP | Port 25 receiver | Active | MEDIUM | No spam filtering, no rate limiting |
| **Voice** | Vapi | Call management | Configured | LOW | Needs phone number setup |
| **Search** | SearchAPI | 50+ engines | Active | LOW | Keep |
| **CRM Enrichment** | Apollo.io | Lead data | Configured | LOW | Needs paid plan for full contact search |
| **Web Scraping** | Firecrawl | Crawl/extract | Key set | LOW | Not tested in production |
| **Browser** | Playwright | Headless Chrome | Active | LOW | Keep |
| **Code Hosting** | GitHub | Source control | Active | LOW | Keep |
| **Billing** | Stripe | Payments | NOT CONNECTED | CRITICAL | Must connect before taking clients |
| **SMS** | Twilio | Text messages | NOT CONNECTED | MEDIUM | Not needed immediately |
| **Calendar** | None | Scheduling | MISSING | HIGH | Add Cal.com or Calendly |
| **Analytics** | None | Tracking | MISSING | HIGH | Add Plausible or GA4 |
| **Docs/Contracts** | None | Agreements | MISSING | HIGH | Add DocuSign or manual flow |
| **Monitoring** | Health endpoint | Basic | Active | MEDIUM | Add uptime monitoring (UptimeRobot) |
| **Logging** | Supabase audit_logs | Action log | Built, empty | MEDIUM | Ensure all actions log |
| **Secrets** | Docker env vars | Credentials | Active | MEDIUM | Should use proper secrets manager |
| **Sandbox** | None | Code execution | MISSING | LOW | E2B configured in code but not connected |

---

## SECTION 5 — OpenClaw / Agent Architecture Audit

### What OpenClaw Should Control
- Research and analysis tasks
- Content drafting (subject to human review)
- SEO audits and reporting
- Lead enrichment and scoring
- Internal communication and coordination
- Memory management
- Heartbeat monitoring
- Data queries and aggregation

### What OpenClaw Should NOT Control
- Client communication (requires human approval)
- Financial transactions (never autonomous)
- Production deployments (human review required)
- Contract signing or legal actions
- Account creation on third-party services
- Anything involving PII transfer to external systems

### Agent Map — Current vs Recommended

| Agent | Current Role | Recommendation |
|-------|-------------|----------------|
| Atlas (main) | Coordinator | KEEP — Route work, morning briefs, triage |
| Mercury (sales) | Pipeline | KEEP — Lead qualification, proposal drafts |
| Beacon (seo) | Audits | KEEP — SEO analysis, ranking tracking |
| Canvas (web-presence) | Site audits | MERGE with Beacon or REDUCE scope |
| Nexus (ai-integration) | AI assessment | RENAME to "Systems" — assess automation needs |
| Forge (venture-builder) | New companies | KEEP — Sub-company creation |
| Cipher (developer) | Code | KEEP — GitHub, builds, technical tasks |
| Pulse (ops) | Monitoring | KEEP — Health checks, incident response |
| Ledger (finance) | Billing | KEEP — Revenue tracking, invoice management |
| Scout (research) | Intel | KEEP — Market research, enrichment |
| Sentinel (compliance) | Safety | KEEP — Audit, consent, gating |

**VPS 2 agents** (Relay, Scout, Ink, Metric): These overlap with VPS 1 agents. Consider whether 4 worker agents are needed or if VPS 2 should only handle overflow.

### Tool Permissions — Current vs Recommended

Current setup is reasonable. Suggested tightening:
- Mercury (sales): Add deny for `playwright` (no need to browse)
- Ledger (finance): Add deny for `searchapi` (no need to web search)
- All agents: Deny `vapi` except Mercury and Atlas (only they should make calls)

### Memory Rules — Recommended
- **Per-client isolation**: Memory entries MUST be tagged with client_id
- **Per-company isolation**: Sub-company memories isolated by company_id
- **Agent scope**: Each agent's working memory is session-local
- **Shared memory**: Only through MCP memory server or Supabase
- **Expiry**: Stale memories (>90 days untouched) flagged for review
- **Pollution prevention**: Never write client A's data to client B's memory scope

### Approval Rules — Current (Good)
The 8 red lines and external action policies are well-designed. No changes needed.

### Logging Rules — Recommended
- Every agent action that modifies data → audit_logs
- Every client-facing output → separate `outbound_log`
- Every MCP server call → agent_tool_calls (currently empty)
- Daily agent activity summary → Slack + memory

---

## SECTION 6 — Sales + Client Journey Audit

### Current Pipeline
```
Lead (intake form) → Qualified → Proposal → Accepted → Client + Project
```

### What Exists
| Stage | System | Status |
|-------|--------|--------|
| Lead capture | Intake form + createLead action | WORKS |
| Qualification | Lead scoring (score field) | BASIC — no scoring logic in UI |
| Pipeline view | Kanban board with 7 stages | WORKS |
| Proposal generation | generateProposal server action | WORKS — creates draft |
| Proposal delivery | sendProposal action | WORKS — marks as sent |
| Acceptance | acceptProposal → creates client + project | WORKS |
| Follow-up | startFollowUp action + Trigger.dev job | CODED, NOT TESTED |

### What's Missing

| Gap | Impact | Priority |
|-----|--------|----------|
| **No consultation booking** | Can't schedule calls with leads | HIGH |
| **No contract/agreement** | No legal commitment before work starts | HIGH |
| **No onboarding flow** | Client created but not set up | HIGH |
| **No package selection in proposal** | Proposals don't reference $99/$199/$299 tiers | MEDIUM |
| **No payment activation** | Stripe not connected — can't charge | CRITICAL |
| **No welcome sequence** | No automated emails after signup | MEDIUM |
| **No monthly reporting** | Can't show clients their ROI | HIGH |
| **No upsell mechanism** | No way to suggest package upgrades | LOW |
| **No renewal reminders** | 12-month commitment but no renewal flow | MEDIUM |
| **No offboarding flow** | No process for ending client relationships | LOW |
| **No NPS/feedback system** | No client satisfaction measurement | LOW |

### Recommended Full Pipeline
```
Lead → Qualify → Consult (calendar) → Propose (with tier) → Contract → Payment (Stripe) → Onboard → Deliver → Report → Review → Renew/Upsell
```

---

## SECTION 7 — Finance + Billing Audit

### Current State
- Billing pages exist (MRR, invoices, usage meters)
- `subscriptions`, `invoices`, `usage_meters` tables exist (all empty)
- `createInvoice` and `updateInvoiceStatus` actions exist
- **Stripe is NOT connected** — no payment processing

### What's Needed

**Stripe Products to Create:**
| Product | Price ID | Type | Amount |
|---------|----------|------|--------|
| Build - Launch | Monthly recurring | Subscription | $99/mo |
| Build - Build | Monthly recurring | Subscription | $199/mo |
| Build - Platform | Monthly recurring | Subscription | $299/mo |
| Growth - Visibility | Monthly recurring | Subscription | $99/mo |
| Growth - Growth | Monthly recurring | Subscription | $199/mo |
| Growth - Momentum | Monthly recurring | Subscription | $299/mo |
| Setup Fee | One-time | Charge | TBD |

**Billing Workflow:**
1. Client accepts proposal → redirected to Stripe Checkout
2. Stripe creates subscription → webhook fires
3. Webhook stores subscription in Supabase `subscriptions` table
4. Monthly invoice auto-generated by Stripe
5. Invoice webhook updates `invoices` table
6. Failed payment → dunning sequence (email reminders)
7. Cancellation → human review required

**Missing:**
- Stripe webhook endpoint (`/api/stripe/webhook`)
- Subscription management UI (upgrade/downgrade)
- Dunning automation
- Revenue dashboard with real Stripe data
- Client profitability calculations
- Sub-company accounting separation

---

## SECTION 8 — Admin + Dashboard Audit

### Current Dashboard Pages (32 routes)
All functional, all query real Supabase data. The architecture is solid.

### Missing Dashboards

| Dashboard | Who Needs It | What It Shows |
|-----------|-------------|--------------|
| **Client Portal** | Clients | Their project, reports, invoices |
| **Delivery Dashboard** | Operators | Monthly tasks, deliverables, deadlines |
| **Revenue Dashboard** | Finance | MRR, churn, LTV, revenue by tier |
| **Health Dashboard** | Ops | VPS status, container health, error rates |
| **Pipeline Dashboard** | Sales | Conversion rates, stage velocity, forecast |
| **Content Calendar** | Content | Scheduled posts, content pipeline |

### Dashboard Improvements Needed

| Page | Issue | Fix |
|------|-------|-----|
| `/overview` | "Agent Costs" label | Rename to "Operations Budget" |
| `/overview` | "Active Agents" widget | Rename to "Active Systems" |
| `/billing` | No real Stripe data | Connect Stripe, show real MRR |
| `/billing/invoices` | Create button disabled | Enable with createInvoice action |
| `/settings` | Integration statuses hardcoded | Wire to real health checks |
| `/agents` | Shows raw agent data | Rename page to "Operations", reframe |

---

## SECTION 9 — Memory + Knowledge Audit

### Current State: EMPTY
- `memories`: 0 rows
- `memory_entities`: 0 rows
- `memory_edges`: 0 rows
- MCP memory server: Installed but never used
- Mem0 API: Key configured but no evidence of use

### Three-Tier Memory System (Documented, Not Active)

| Tier | System | Status |
|------|--------|--------|
| MCP Memory | Knowledge graph (entities/relationships) | Installed, empty |
| Mem0 | Free-form text memories | Key set, unused |
| Filesystem | Reports, documents, templates | Directories exist, empty |

### Risks
- **Memory pollution**: No scoping enforced. Agent A could write to Agent B's context.
- **Client data leakage**: No client_id scoping on memories.
- **Stale data**: No expiry or refresh mechanism active.
- **No source provenance**: Memories don't track where information came from.

### Recommendations
1. **Start using memory immediately** — Every agent session should read/write
2. **Scope by client_id and company_id** — Enforce in memory write patterns
3. **Weekly memory review** — Sentinel audits memory for stale/incorrect entries
4. **Source tagging** — Every memory entry tracks: source, date, confidence, agent
5. **Structured DB for facts** — Use Supabase tables for structured data (client preferences, decisions). Use memory MCP for fuzzy/contextual knowledge.

---

## SECTION 10 — Risk + Compliance Audit

### CRITICAL RISKS

| # | Risk | Severity | Current Mitigation | Action |
|---|------|----------|-------------------|--------|
| 1 | **RLS policies allow unrestricted anonymous access** | CRITICAL | None — `USING (true)` on all tables | Replace anon_write policies with scoped policies |
| 2 | **No Stripe = no revenue** | CRITICAL | None | Connect Stripe immediately |
| 3 | **getServiceSupabase() uses anon key** | HIGH | None — function name is misleading | Add SUPABASE_SERVICE_ROLE_KEY to production env |
| 4 | **No client contracts** | HIGH | None | Add agreement signing before service starts |
| 5 | **SMTP receiver has no spam filtering** | MEDIUM | None | Add basic DNSBL checking or use hosted email |
| 6 | **No rate limiting on API endpoints** | MEDIUM | None | Add rate limiting middleware |
| 7 | **Hardcoded webhook secrets** | MEDIUM | Fallback strings in code | Always require env var, fail if not set |
| 8 | **No backup strategy** | MEDIUM | Supabase built-in | Document and test restore procedure |
| 9 | **56 unindexed foreign keys** | MEDIUM | None | Add missing indexes |
| 10 | **No uptime monitoring** | MEDIUM | Health endpoint exists | Add UptimeRobot or similar |

### Compliance Gaps
- No Terms of Service on website
- No Privacy Policy on website
- No cookie consent (not needed currently — no tracking)
- No CAN-SPAM footer in email templates
- No data retention policy documented
- No GDPR data export/deletion flow
- Consent records table exists but empty

---

## SECTION 11 — Recommended Stack

### Final Recommended Stack

| Layer | Tool | Status |
|-------|------|--------|
| Frontend | Next.js 15 + Tailwind | KEEP |
| Auth | Supabase Auth | KEEP + add Google OAuth + MFA |
| Database | Supabase PostgreSQL 17 | KEEP + fix RLS + add indexes |
| Hosting | Hostinger VPS x2 | KEEP |
| Proxy | Traefik | KEEP |
| Agent Gateway | OpenClaw | KEEP |
| Workflows | Trigger.dev | KEEP |
| Email (out) | Resend | KEEP |
| Email (in) | Custom SMTP | KEEP (add spam filtering) |
| Voice | Vapi | KEEP |
| Search | SearchAPI | KEEP |
| Payments | Stripe | ADD |
| Calendar | Cal.com | ADD |
| Analytics | Plausible | ADD |
| Monitoring | UptimeRobot | ADD |
| Contracts | Manual PDF + e-sign | ADD |
| Support | Simple ticket system in Supabase | BUILD |

### Integrations to ADD
1. **Stripe** — Payment processing (CRITICAL)
2. **Cal.com** — Consultation scheduling
3. **Plausible Analytics** — Privacy-friendly web analytics
4. **UptimeRobot** — Uptime monitoring with alerts
5. **Google OAuth** — Easier login for clients

### Integrations to REMOVE
- None currently. All serve a purpose.

### Integrations to UPGRADE
- **Supabase RLS** — Fix all permissive policies (security-critical)
- **SMTP Receiver** — Add basic spam filtering (DNSBL)
- **Health Endpoint** — Add response time tracking

---

## SECTION 12 — 7/30/90 Day Action Plan

### A. Immediate Fixes (Next 7 Days)

| # | Action | Impact |
|---|--------|--------|
| 1 | Fix RLS policies — replace `anon_write` with scoped policies | Security |
| 2 | Add `SUPABASE_SERVICE_ROLE_KEY` to VPS 1 production env | Security |
| 3 | Add Terms of Service + Privacy Policy pages | Legal |
| 4 | Add 56 missing foreign key indexes | Performance |
| 5 | Remove hardcoded webhook secret fallbacks | Security |
| 6 | Enable leaked password protection (Supabase Pro) | Security |
| 7 | Add UptimeRobot monitoring for all endpoints | Operations |

### B. Near-Term Priorities (Next 30 Days)

| # | Action | Impact |
|---|--------|--------|
| 1 | Connect Stripe — create 6 products, add webhook endpoint, checkout flow | Revenue |
| 2 | Build client onboarding workflow (welcome email, checklist, kickoff) | Delivery |
| 3 | Create service delivery templates (what does each tier deliver monthly?) | Delivery |
| 4 | Add Cal.com for consultation scheduling | Sales |
| 5 | Add Plausible analytics to landing page | Marketing |
| 6 | Build monthly report generation + delivery system | Client value |
| 7 | Create 5 core SOPs (onboarding, SEO audit, content, website build, support) | Operations |
| 8 | Test all 6 Trigger.dev workflows end-to-end | Reliability |
| 9 | Start using memory system — seed with SOPs and client data | Knowledge |
| 10 | Add Google OAuth for client login | UX |

### C. Scale Priorities (Next 90 Days)

| # | Action | Impact |
|---|--------|--------|
| 1 | Build client portal (project status, reports, invoices) | Client experience |
| 2 | Build delivery dashboard (monthly tasks, checklists, deadlines) | Operations |
| 3 | Build revenue dashboard with real Stripe data (MRR, churn, LTV) | Finance |
| 4 | Implement subscription management (upgrade/downgrade/cancel) | Billing |
| 5 | Add support ticket system | Client support |
| 6 | Build content calendar and scheduling | Content delivery |
| 7 | Implement dunning automation for failed payments | Revenue protection |
| 8 | Add client NPS/feedback collection | Quality |
| 9 | Build renewal reminder system (12-month commitment) | Retention |
| 10 | Implement multi-tenant sub-company provisioning at scale | Ventures |

### D-J. Additional Recommendations

**D. Tooling Upgrades:**
- Supabase: Upgrade to Pro for leaked password protection
- Next.js: Update to latest stable
- Add Redis for session caching (Trigger.dev already uses it)

**E. Integrations to Add:**
- Stripe, Cal.com, Plausible, UptimeRobot, Google OAuth

**F. Integrations to Remove:**
- None

**G. Automations to Build:**
- New client → welcome email + Slack notification + task creation
- Monthly → report generation + email delivery per client
- Payment failed → dunning email sequence (3 reminders over 14 days)
- Lead score >70 → auto-qualify + Slack alert to Mercury
- Subscription activated → create monthly task template

**H. Workflows to Rewrite:**
- `lead-intake`: Add scoring logic, auto-qualification threshold
- `follow-up-sequence`: Add consent verification before each email
- `monthly-report`: Add per-client data aggregation + PDF generation

**I. Human Approval Gates to Add:**
- Contract signing (before service activation)
- Monthly report approval (before sending to client)
- Subscription cancellation (always human-reviewed)
- Refund processing (always human-reviewed)
- Public content publication (blog, social)

**J. Best-Practice Operating Model:**
```
SALES:      Lead → Qualify → Consult → Propose → Contract → Payment
ONBOARD:    Welcome → Discovery → Setup → Kickoff
DELIVER:    Monthly tasks → Execute → Review → Report → Send
MAINTAIN:   Support tickets → Response → Resolution → Follow-up
GROW:       Quarterly review → Upsell → Renewal
INTERNAL:   SOPs → Playbooks → Training → Quality checks
```

---

## SECTION 13 — Final Priority Checklist

### Must Do Before First Client
- [ ] Fix RLS security policies
- [ ] Connect Stripe with 6 subscription products
- [ ] Add Terms of Service page
- [ ] Add Privacy Policy page
- [ ] Create service delivery templates (what each tier includes monthly)
- [ ] Build client onboarding flow
- [ ] Set up consultation scheduling (Cal.com)
- [ ] Test full pipeline: lead → proposal → payment → onboard → deliver
- [ ] Add CAN-SPAM compliant email footer template
- [ ] Add UptimeRobot monitoring

### Must Do Before 5 Clients
- [ ] Build client portal (read-only project/invoice view)
- [ ] Build monthly report system
- [ ] Create 5 core SOPs
- [ ] Test all Trigger.dev workflows
- [ ] Start using memory system for client context
- [ ] Add analytics to landing page
- [ ] Build delivery dashboard with task checklists

### Must Do Before 20 Clients
- [ ] Revenue dashboard with real Stripe data
- [ ] Support ticket system
- [ ] Dunning automation for failed payments
- [ ] Subscription management (upgrade/downgrade)
- [ ] Client NPS/feedback system
- [ ] Renewal reminder automation
- [ ] Content calendar system
- [ ] Sub-company provisioning at scale
- [ ] Agent evaluation system (are agents actually performing?)
- [ ] Disaster recovery documentation

---

*This audit represents the current state as of April 11, 2026. The platform architecture is sound. The primary work is moving from "built" to "operating" — security hardening, Stripe integration, client-facing workflows, and service delivery systems.*
