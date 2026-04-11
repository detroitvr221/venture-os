# VentureOS Architecture

## Overview

VentureOS is an AI-powered venture operating system that manages the full lifecycle of building and running multiple businesses. It employs a roster of 11 specialized AI agents coordinated by a central orchestrator, backed by a PostgreSQL database with row-level security for multi-tenant isolation.

## System Layers

```
+─────────────────────────────────────────────────────────────+
|                      Client Applications                     |
|            (Web Dashboard, Mobile App, API Clients)          |
+─────────────────────────────────────────────────────────────+
                              |
                              v
+─────────────────────────────────────────────────────────────+
|                      API Gateway / Edge Functions             |
|                  (Authentication, Rate Limiting)              |
+─────────────────────────────────────────────────────────────+
                              |
                              v
+─────────────────────────────────────────────────────────────+
|                     Agent Orchestrator                        |
|          (Routing, Handoffs, Approvals, Cost Tracking)        |
+─────────────────────────────────────────────────────────────+
         |           |           |           |           |
         v           v           v           v           v
+--------+  +--------+  +--------+  +--------+  +--------+
|  CEO   |  | Sales  |  |  SEO   |  |  Dev   |  | ...x7  |
| Agent  |  | Agent  |  | Agent  |  | Agent  |  | Agents |
+--------+  +--------+  +--------+  +--------+  +--------+
         |           |           |           |           |
         v           v           v           v           v
+─────────────────────────────────────────────────────────────+
|                      Service Layer                            |
|       (Leads, Billing, Communications, Approvals)             |
+─────────────────────────────────────────────────────────────+
         |                       |                       |
         v                       v                       v
+──────────────+    +──────────────────+    +──────────────+
|   Supabase   |    |   Integrations   |    |    Memory    |
|  PostgreSQL  |    | (Stripe, SendGrid|    | (Mem0, pgvec)|
|     + RLS    |    |  Firecrawl, etc) |    |              |
+──────────────+    +──────────────────+    +──────────────+
```

## Package Architecture

### packages/shared
The foundation package containing TypeScript types, constants, permissions, and Zod validators. Every other package depends on this. Zero runtime dependencies beyond Zod.

### packages/db
Supabase client factory and the complete SQL schema. Provides `createClient()` for server-side operations (service-role key) and `createUserClient()` for client-side operations (RLS-enforced).

### packages/agents
The 11 agent prompt definitions (Markdown files in `src/roster/`) and the orchestrator that routes requests, manages handoffs, enforces approval gates, and tracks costs.

### packages/services
Business logic services that enforce validation, permissions, and audit logging:
- **LeadService**: Full CRM pipeline from lead creation to client conversion
- **BillingService**: Subscriptions, usage metering, invoicing, Stripe sync
- **CommsService**: Compliance-first email/SMS with consent, suppression, and quiet-hours checks
- **ApprovalService**: Create/approve/reject approval requests with workflow integration

### packages/integrations
Third-party API wrappers:
- **Mem0Client**: Scoped memory search, add, update, delete
- **FirecrawlClient**: Website crawling, content extraction, web search

## Data Model

The database contains 40 tables organized into these domains:

- **Organization**: organizations, organization_members
- **Sub-Companies**: sub_companies, brands
- **CRM**: leads, clients, contacts
- **Projects**: projects, tasks
- **Proposals**: proposals
- **Web Presence**: websites, website_audits, seo_findings, ai_assessments
- **Agents**: agents, agent_threads, agent_tool_calls, agent_costs
- **Memory**: memories, memory_entities, memory_edges, knowledge_sources
- **Workflows**: workflows, workflow_runs, workflow_steps, approvals
- **Billing**: subscriptions, invoices, usage_meters, payouts
- **Communications**: campaigns, outreach_events, email_logs, sms_logs, call_logs, consent_records
- **Platform**: audit_logs, integrations, playbooks, kpis

## Multi-Tenancy

Data isolation is enforced at two levels:

1. **Row-Level Security (RLS)**: Every table has PostgreSQL RLS policies that verify the requesting user is a member of the relevant organization.
2. **Application-Layer RBAC**: The permission matrix defines what each role (owner, admin, agent, viewer) can do on each resource type.

## Agent Architecture

Each agent has:
- A **system prompt** defining its identity, capabilities, boundaries, and handoff rules
- A **tool set** — the subset of service operations it can invoke
- A **memory scope** — what organizational memory it can read and write
- **Approval thresholds** — actions above certain values require human approval

The orchestrator routes requests using keyword-based matching, creates conversation threads, and manages the lifecycle of agent interactions including cross-agent handoffs.

## Security Model

- All secrets stored in environment variables, never in code
- Supabase service-role key used only server-side
- RLS prevents cross-tenant data access at the database level
- Consent verification required before any outbound communication
- Audit logs capture every mutation with actor identity and change diffs
- Approval gates for high-value and irreversible actions
