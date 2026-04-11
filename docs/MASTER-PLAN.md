# North Bridge Digital — Master Operations Plan

> Everything we built, how it connects, and what to do next.
> Last updated: April 11, 2026

---

## 1. What We Have

### Infrastructure

| System | Location | Status |
|--------|----------|--------|
| **VPS 1** (145.223.75.46) | Hostinger KVM 2, 2 CPU, 8GB RAM, 96GB | Running |
| **VPS 2** (187.77.207.22) | Hostinger KVM 1, 1 CPU, 4GB RAM, 48GB | Running |
| **Supabase** (lwxhdiximymbpaazhulo) | Cloud, PostgreSQL 17, us-east-1 | Active |
| **GitHub** (detroitvr221/venture-os) | Public repo, 108 files | 16 commits |
| **Domain** | thenorthbridgemi.com | Hostinger DNS |

### Services on VPS 1

| Service | URL | Container |
|---------|-----|-----------|
| North Bridge Digital Dashboard | https://thenorthbridgemi.com | venture-os-web-1 |
| OpenClaw Master Gateway | https://claw.thenorthbridgemi.com | openclaw-gateway-1 |
| Traefik Reverse Proxy | Ports 80/443 | traefik-traefik-1 |

### Services on VPS 2

| Service | URL | Container |
|---------|-----|-----------|
| OpenClaw Worker Gateway | http://187.77.207.22:18789 | openclaw-workers-worker-1 |

### Cloud Services

| Service | Purpose | Key |
|---------|---------|-----|
| **Supabase** | Database + Auth + Storage | anon key configured |
| **OpenAI** | GPT-5.4-mini, GPT-4.1-mini, o4-mini | sk-proj-MT61... |
| **Nexos** | GPT 5.4 (free, $0) | nexos-team-6101... |
| **Mem0** | Long-term memory (10 memories) | m0-RAg36c... |
| **Apollo.io** | Company enrichment | 5XzGQrF7... |
| **Slack** | Agent communication channel | xoxb-1085... |
| **GitHub** | Code repos, MCP server | ghp_bRjC0... |

---

## 2. The Platform (North Bridge Digital Dashboard)

### Architecture
```
Browser → thenorthbridgemi.com → Traefik (HTTPS) → Next.js 15 (port 3000)
                                                      ↕
                                                   Supabase
                                                  (41 tables)
```

### Pages (15 total)

| Page | URL | Type | Data Source |
|------|-----|------|-------------|
| Landing | `/` | Public | Static |
| Login | `/login` | Public | Supabase Auth |
| Signup | `/signup` | Public | Supabase Auth |
| Overview | `/overview` | Protected | leads, clients, projects, kpis, audit_logs |
| Leads | `/leads` | Protected | leads table (Kanban) |
| Proposals | `/proposals` | Protected | proposals table |
| Agents | `/agents` | Protected | agents table |
| SEO Audits | `/seo` | Protected | website_audits, seo_findings |
| Campaigns | `/campaigns` | Protected | campaigns, outreach_events |
| Approvals | `/approvals` | Protected | approvals table |
| Billing | `/billing` | Protected | invoices, subscriptions |
| Invoices | `/billing/invoices` | Protected | invoices table |
| Usage | `/billing/usage` | Protected | usage_meters, agent_costs |
| Companies | `/companies` | Protected | sub_companies, brands |
| New Company | `/companies/new` | Protected | Form → sub_companies |

### Server Actions (16)
createLead, updateLeadStage, approvePendingApproval, rejectPendingApproval, createSubCompany, triggerSeoAudit, generateProposal, sendProposal, acceptProposal, startFollowUp, runSeoAudit, createCampaign, pauseCampaign, resumeCampaign, createInvoice, updateInvoiceStatus

### API Routes
- `POST /api/openclaw/webhook` — Receives agent results from OpenClaw
- `POST /api/openclaw/trigger` — Triggers agent runs on OpenClaw

### Auth
- Email: `admin@thenorthbridgemi.com`
- Password: `NorthBridge2026!`
- Supabase Auth with middleware protection

---

## 3. The Agents (OpenClaw)

### VPS 1 — Master Gateway (11 agents)

| ID | Name | Role | Model |
|----|------|------|-------|
| main | Atlas | CEO/Operator — routes work, reviews KPIs | gpt-5.4-mini |
| sales | Mercury | Sales — qualifies leads, prepares proposals | gpt-5.4-mini |
| seo | Beacon | SEO — crawls sites, generates action plans | gpt-5.4-mini |
| web-presence | Canvas | Web Presence — audits sites, conversion | gpt-5.4-mini |
| ai-integration | Nexus | AI Integration — maps workflows, automation | gpt-5.4-mini |
| venture-builder | Forge | Venture Builder — launches new companies | gpt-5.4-mini |
| developer | Cipher | Developer — writes code, opens PRs | gpt-5.4-mini |
| ops | Pulse | Ops — monitors workflows, health | gpt-5.4-mini |
| finance | Ledger | Finance — billing, invoices, revenue | gpt-5.4-mini |
| research | Scout | Research — market data, competitor analysis | gpt-5.4-mini |
| compliance | Sentinel | Compliance — consent, legality, guardrails | gpt-5.4-mini |

### VPS 2 — Worker Gateway (4 agents)

| ID | Name | Role |
|----|------|------|
| main | Relay | VPS2 Coordinator |
| researcher | Scout | Deep research |
| writer | Ink | Long-form content |
| analyst | Metric | Data analysis |

### Agent Configuration
- **Gateway tokens**: `vos-gw-token-2026` (VPS 1), `vos-worker-token-2026` (VPS 2)
- **Hooks tokens**: `vos-hooks-token-2026` (VPS 1), `vos-worker-hooks-2026` (VPS 2)
- **Slack**: Both connected, open group policy, open DMs
- **Models**: OpenAI (3) + Nexos (1 free)
- **MCP**: GitHub server on VPS 1
- **Tools**: coding profile, web search + fetch, elevated enabled

---

## 4. The Database (Supabase)

### Schema (41 tables)

**Tenancy**: organizations, organization_members, sub_companies, brands
**CRM**: leads (5), clients (1), contacts
**Delivery**: projects (1), tasks, proposals, documents
**SEO**: websites, website_audits, seo_findings, ai_assessments
**Agents**: agents (11), agent_threads, agent_tool_calls, agent_costs
**Memory**: memories, memory_entities, memory_edges, knowledge_sources
**Workflows**: workflows, workflow_runs, workflow_steps, approvals
**Billing**: subscriptions, invoices, usage_meters, payouts
**Comms**: campaigns, outreach_events, email_logs, sms_logs, call_logs, consent_records
**System**: audit_logs, integrations, playbooks, kpis (6)

### Seeded Data
- 1 organization (North Bridge Digital)
- 1 sub-company (North Bridge Digital AI Agency)
- 1 brand
- 11 agents
- 5 leads (Sarah Mitchell, James Chen, Maria Rodriguez, David Park, Lisa Thompson)
- 1 client (GreenPaws Pet Co)
- 1 project (GreenPaws Full Rebrand)
- 6 KPIs (revenue, clients, conversion, cost, audits, uptime)

---

## 5. Integrations Map

```
                    ┌─────────────────────┐
                    │   North Bridge      │
                    │   Dashboard         │
                    │   (Next.js)         │
                    └────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
    │   Supabase     │ │ OpenClaw │ │  Slack      │
    │   (Database)   │ │ (Agents) │ │  (Comms)    │
    │   41 tables    │ │ 15 agents│ │  Channel    │
    └────────────────┘ └────┬─────┘ └─────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
  ┌──────▼──────┐  ┌───────▼──────┐  ┌────────▼─────┐
  │   OpenAI    │  │    Mem0      │  │   Apollo.io  │
  │   Models    │  │   Memory     │  │   Enrichment │
  │   GPT-5.4   │  │   10 items   │  │   Org data   │
  └─────────────┘  └──────────────┘  └──────────────┘
         │
  ┌──────▼──────┐
  │   GitHub    │
  │   MCP       │
  │   Repos     │
  └─────────────┘
```

---

## 6. Workflows (Trigger.dev — Designed, Not Yet Deployed)

| Workflow | Trigger | Steps |
|----------|---------|-------|
| **Lead Intake** | New lead in Supabase | Score → assign agent → qualify if >70 → follow-up if >50 |
| **SEO Audit** | Manual/webhook | Firecrawl crawl → analyze → findings → report |
| **Proposal Generation** | Lead qualified | GPT-4o generates structured proposal |
| **Follow-up Sequence** | Lead needs nurture | Consent check → quiet hours → Resend email → schedule next |
| **Monthly Report** | Cron monthly | Aggregate KPIs, revenue, costs → HTML report |
| **Launch Company** | Manual | Create sub-company + brand + KPIs + workflows + approval gate |

---

## 7. Brand Voice

### Core Frame
**"AI agents working alongside human operators."**

### Voice Attributes
Decisive, Operationally Credible, Warmly Professional, Speed-Oriented, Systems-Minded, Transparently Hybrid, Accountable by Design

### Key Phrases
- "AI handles the execution. Humans handle the judgment."
- "11 AI agents + human operators"
- "AI-powered, human-guided"
- "Every action logged. Every sensitive decision human-approved."

### Saved At
`.claude/brand-voice-guidelines.md` (215 lines)

---

## 8. What To Do Next (Priority Order)

### Immediate (This Week)

1. **Write SOUL.md for each agent** on VPS 1
   - Each agent needs identity, personality, capabilities, boundaries
   - Save to `/data/.openclaw/agents/{id}/SOUL.md` inside the container
   - This is what makes agents actually useful vs generic

2. **Write HEARTBEAT.md** for automated tasks
   - Morning brief at 8 AM
   - Server health check every 30 min
   - Lead pipeline review every 4 hours
   - Save to `/data/.openclaw/workspace/HEARTBEAT.md`

3. **Install core ClawHub skills**
   - The 33 skills from the earlier session are gone (VPS was rebuilt)
   - Reinstall the best ones: handoff, mission-control, brand-build, client-intake

4. **Deploy Trigger.dev** on VPS 1 or use cloud
   - The 6 workflow jobs are coded but need a running Trigger.dev instance
   - This enables automated lead scoring, SEO audits, follow-up sequences

5. **Set up Resend for email**
   - Sign up at resend.com
   - Verify thenorthbridgemi.com domain
   - Add RESEND_API_KEY to dashboard env
   - Enables: proposal emails, follow-up sequences, reports

### Short Term (Next 2 Weeks)

6. **Connect Stripe for billing**
   - Create Stripe account
   - Add keys to dashboard env
   - Enable: subscription management, invoicing, usage billing

7. **Build agent SOUL.md prompts**
   - Write detailed identity docs for all 11 agents
   - Include: who they are, what they do, how they hand off, what they can't do
   - This is the #1 thing that makes OpenClaw agents effective

8. **Set up Firecrawl for SEO audits**
   - Sign up at firecrawl.dev
   - Add FIRECRAWL_API_KEY
   - Enables: website crawling, SEO analysis, competitor research

9. **Enable Supabase Auth properly**
   - Set up email confirmation flow
   - Add Google OAuth
   - Create user roles (admin, agent, viewer)

10. **Wire dashboard to live OpenClaw webhook bridge**
    - Agent results flow into Supabase via /api/openclaw/webhook
    - Dashboard triggers agent runs via /api/openclaw/trigger
    - This makes the dashboard the true control center

### Medium Term (Month 1-2)

11. **Deploy to production properly**
    - Build Docker image for the Next.js app (instead of cloning + building each restart)
    - Push to Docker Hub or GitHub Container Registry
    - Faster deploys, no npm install on every restart

12. **Add more MCP servers**
    - Notion (project docs)
    - Slack (direct channel access)
    - Stripe (billing from agents)
    - Calendar (scheduling)

13. **Set up monitoring**
    - Uptime monitoring (UptimeRobot or similar)
    - Slack alerts for container crashes
    - Agent cost tracking dashboard
    - Supabase connection health

14. **Launch first client project end-to-end**
    - Lead comes in → qualify → proposal → accept → project → deliver
    - Test the full pipeline with a real client

15. **Build sub-company for a client**
    - Use the venture-builder workflow
    - Create new sub-company with brand, website, agents
    - Prove the holding company model works

### Long Term (Month 3+)

16. **Stripe Connect for revenue splitting**
    - When sub-companies generate revenue, split with partners
    - Multi-tenant billing architecture

17. **Graphiti entity memory** (behind feature flag)
    - Temporal relationship graph
    - Who owns what, what changed when, decision provenance

18. **E2B/Daytona sandbox execution**
    - Safe code execution for Developer agent
    - Never run untrusted code on host

19. **Agent evaluation framework**
    - Test agent outputs against fixtures
    - Track quality over time
    - A/B test different prompts

20. **Scale to multiple client ventures**
    - Template a sub-company setup
    - Clone and customize per client
    - Each venture has its own agents, memory, billing

---

## 9. Credentials Reference

| Service | Key | Location |
|---------|-----|----------|
| VPS 1 SSH | TheOnly1@TheOnly1@ | root@145.223.75.46 |
| VPS 2 SSH | TheOnly1@TheOnly1@ | root@187.77.207.22 |
| Supabase URL | lwxhdiximymbpaazhulo.supabase.co | Cloud |
| Supabase Anon Key | eyJhbGciOiJIUz... | Docker env |
| OpenAI | sk-proj-MT61... | Docker env |
| Nexos | nexos-team-6101... | Docker env |
| Slack Bot | xoxb-1085... | Docker env |
| Slack App | xapp-1-A0AR... | Docker env |
| Mem0 | m0-RAg36c... | Docker env |
| Apollo.io | 5XzGQrF7... | Code |
| GitHub PAT | ghp_bRjC0... | Docker env |
| OpenClaw VPS1 Token | vos-gw-token-2026 | Config |
| OpenClaw VPS2 Token | vos-worker-token-2026 | Config |
| Dashboard Login | admin@thenorthbridgemi.com / NorthBridge2026! | Supabase Auth |

---

## 10. Architecture Decision Records

10 ADRs documented in `/docs/adr/`:
1. Monorepo structure (pnpm + Turborepo)
2. Supabase as backend
3. Multi-agent architecture
4. Approval gates
5. Compliance-first communications
6. Memory and knowledge graph
7. RBAC and RLS
8. Audit logging
9. Cost tracking
10. Sandbox execution

---

## 11. Repository Structure

```
venture-os/ (108 files, ~21K lines)
├── apps/
│   ├── web/                 # Next.js 15 dashboard (15 pages)
│   │   ├── app/
│   │   │   ├── (auth)/      # login, signup
│   │   │   ├── (dashboard)/ # all protected pages
│   │   │   ├── api/         # openclaw webhook/trigger routes
│   │   │   ├── actions.ts   # 16 server actions
│   │   │   └── page.tsx     # landing page
│   │   ├── lib/supabase/    # client + server helpers
│   │   └── middleware.ts    # auth protection
│   └── workflows/           # Trigger.dev jobs (6)
├── packages/
│   ├── shared/              # types, constants, permissions, validators
│   ├── db/                  # Supabase client + schema (1064 lines SQL)
│   ├── agents/              # 11 agent prompts + orchestrator
│   ├── services/            # leads, billing, comms, approvals
│   └── integrations/        # Mem0, Firecrawl, OpenClaw, Apollo
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── hardening.md
│   ├── api.md
│   ├── env-reference.md
│   ├── adr/ (10 files)
│   └── runbooks/ (4 files)
├── .claude/
│   └── brand-voice-guidelines.md
├── .github/workflows/ci.yml
├── docker-compose.yml
└── .env.example
```

---

*This document is the single source of truth for North Bridge Digital's technical operations.*
