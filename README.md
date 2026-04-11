# VentureOS

An AI-powered venture operating system for building and managing multiple businesses. VentureOS deploys a roster of 11 specialized AI agents -- from CEO to Compliance -- coordinated by a central orchestrator to automate sales pipelines, SEO audits, web presence management, billing, and more.

## Project Stats

| Metric | Count |
|--------|-------|
| Total files | 103 |
| Lines of code | 19,000+ |
| Dashboard pages | 19 |
| Database tables | 41 (all with RLS) |
| AI agents | 11 |
| Workflows | 6 |
| Build phases | 4/4 complete |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env
# Fill in your API keys (see docs/env-reference.md for the full list)

# 3. Start local services (Postgres, Redis, MailHog)
docker compose up -d

# 4. Run database migrations (requires Supabase project)
pnpm db:migrate

# 5. Start development
pnpm dev
```

The dashboard is at `http://localhost:3000`. MailHog UI for captured emails is at `http://localhost:8025`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Monorepo | Turborepo + pnpm workspaces |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT + RLS) |
| AI Models | Claude (Anthropic), GPT-4o (OpenAI) |
| Memory | Mem0 + pgvector |
| Web Crawling | Firecrawl |
| Payments | Stripe |
| Email | Resend |
| SMS/Voice | Twilio |
| Validation | Zod |

## Directory Structure

```
venture-os/
├── packages/
│   ├── shared/            # Types, constants, validators, permissions
│   │   └── src/
│   │       ├── types.ts        # All TypeScript interfaces
│   │       ├── constants.ts    # Enums, labels, config values
│   │       ├── permissions.ts  # RBAC permission matrix
│   │       ├── validators.ts   # Zod schemas for API input
│   │       └── index.ts        # Barrel export
│   │
│   ├── db/                # Database layer
│   │   └── src/
│   │       ├── index.ts        # Supabase client factory
│   │       └── schema.sql      # Complete PostgreSQL schema (40 tables)
│   │
│   ├── agents/            # AI agent system
│   │   └── src/
│   │       ├── orchestrator.ts # Request routing, handoffs, approvals
│   │       └── roster/         # Agent prompt definitions
│   │           ├── ceo.md
│   │           ├── sales.md
│   │           ├── seo.md
│   │           ├── web-presence.md
│   │           ├── ai-integration.md
│   │           ├── venture-builder.md
│   │           ├── developer.md
│   │           ├── ops.md
│   │           ├── finance.md
│   │           ├── research.md
│   │           └── compliance.md
│   │
│   ├── services/          # Business logic
│   │   └── src/
│   │       ├── leads.ts        # CRM pipeline management
│   │       ├── billing.ts      # Subscriptions, invoicing, Stripe sync
│   │       ├── comms.ts        # Compliance-first email/SMS
│   │       └── approvals.ts    # Approval gates + workflow integration
│   │
│   └── integrations/      # Third-party wrappers
│       └── src/
│           ├── mem0.ts         # Memory search/store (scoped)
│           └── firecrawl.ts    # Web crawling and extraction
│
├── docs/
│   ├── architecture.md    # System architecture overview
│   └── adr/               # Architecture Decision Records
│       ├── 001-monorepo-structure.md
│       ├── 002-supabase-as-backend.md
│       ├── 003-multi-agent-architecture.md
│       ├── 004-approval-gates.md
│       ├── 005-compliance-first-communications.md
│       ├── 006-memory-and-knowledge-graph.md
│       ├── 007-rbac-and-rls.md
│       ├── 008-audit-logging.md
│       ├── 009-cost-tracking.md
│       └── 010-sandbox-execution.md
│
├── package.json           # Root workspace config
├── pnpm-workspace.yaml    # Workspace definition
├── turbo.json             # Turborepo pipeline config
└── .env.example           # Environment variable template
```

## Architecture Overview

VentureOS follows a layered architecture:

1. **Client Layer** -- Web dashboard and API clients
2. **API Gateway** -- Authentication, rate limiting, routing
3. **Agent Orchestrator** -- Routes requests to the right agent, manages handoffs, enforces approval gates, tracks costs
4. **Agent Roster** -- 11 specialized agents each with defined roles, tools, memory scopes, and boundaries
5. **Service Layer** -- Business logic with validation, permissions, and audit logging
6. **Data Layer** -- PostgreSQL with RLS for multi-tenant isolation, pgvector for semantic search

## The Agent Roster

| Agent | Role |
|-------|------|
| CEO | Strategic oversight, priority setting, conflict resolution |
| Sales | Lead qualification, pipeline management, proposals |
| SEO | Website audits, keyword research, ranking optimization |
| Web Presence | Brand consistency, content management, digital presence |
| AI Integration | AI tool evaluation, prompt optimization, cost management |
| Venture Builder | Opportunity validation, business modeling, venture launch |
| Developer | Code implementation, deployment, technical fixes |
| Ops | Project delivery, resource allocation, client onboarding |
| Finance | Billing, invoicing, cost tracking, financial reporting |
| Research | Market research, competitive intelligence, trend analysis |
| Compliance | Consent management, regulatory compliance, data privacy |

## Key Design Decisions

- **Multi-tenancy via RLS**: Every table has Row-Level Security policies ensuring organizations can only access their own data
- **Compliance-first communications**: No outbound message is sent without consent verification, suppression checks, and quiet-hours enforcement
- **Approval gates**: High-value actions pause for human review before execution
- **Scoped memory**: Agents only access memories within their permission scope
- **Full audit trail**: Every mutation is logged with actor identity and change diffs
- **Cost tracking**: Per-agent, per-thread, per-organization AI spend monitoring

## Environment Variables

See `.env.example` for the full list. At minimum you need:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for database access
- `OPENAI_API_KEY` or Anthropic key for AI model access
- `STRIPE_SECRET_KEY` for billing
- `FIRECRAWL_API_KEY` for web crawling
- `MEM0_API_KEY` for memory management

## License

Proprietary. All rights reserved.
