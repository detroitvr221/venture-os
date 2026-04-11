-- ═══════════════════════════════════════════════════════════════════════════
-- VentureOS — Complete PostgreSQL schema
-- Target: Supabase (PostgreSQL 15+)
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- trigram indexes for search

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper: auto-update updated_at
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Macro to attach the trigger to a table
-- Usage:  SELECT public.enable_updated_at('my_table');
CREATE OR REPLACE FUNCTION public.enable_updated_at(tbl regclass)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Organizations
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.organizations (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  logo_url      text,
  billing_email text NOT NULL,
  stripe_customer_id text,
  settings      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.organizations');

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Organization Members
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.organization_members (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  role            text NOT NULL CHECK (role IN ('owner','admin','agent','viewer')),
  invited_email   text,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.organization_members');

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Sub-Companies
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.sub_companies (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  industry        text,
  website         text,
  settings        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
CREATE INDEX idx_sub_companies_org ON public.sub_companies(organization_id);
ALTER TABLE public.sub_companies ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.sub_companies');

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Brands
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.brands (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  voice_guidelines text,
  colors          jsonb NOT NULL DEFAULT '{}',
  logo_url        text,
  fonts           jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_brands_org ON public.brands(organization_id);
CREATE INDEX idx_brands_company ON public.brands(company_id);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.brands');

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Leads
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.leads (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  contact_name        text NOT NULL,
  contact_email       text NOT NULL,
  contact_phone       text,
  source              text,
  stage               text NOT NULL DEFAULT 'new'
                        CHECK (stage IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  score               int NOT NULL DEFAULT 0,
  assigned_agent      text,
  notes               text,
  expected_value      numeric,
  lost_reason         text,
  converted_client_id uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_leads_company ON public.leads(company_id);
CREATE INDEX idx_leads_stage ON public.leads(stage);
CREATE INDEX idx_leads_email ON public.leads(contact_email);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.leads');

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Clients
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.clients (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text NOT NULL,
  phone           text,
  website         text,
  industry        text,
  tier            text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active','churned','paused')),
  onboarded_at    timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_org ON public.clients(organization_id);
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_clients_status ON public.clients(status);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.clients');

-- FK from leads back to clients
ALTER TABLE public.leads
  ADD CONSTRAINT fk_leads_converted_client
  FOREIGN KEY (converted_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Contacts
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.contacts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  first_name      text NOT NULL,
  last_name       text NOT NULL,
  email           text NOT NULL,
  phone           text,
  role            text,
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_contacts_client ON public.contacts(client_id);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.contacts');

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Projects
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.projects (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  status          text NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
  start_date      timestamptz,
  end_date        timestamptz,
  budget          numeric,
  settings        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_projects_company ON public.projects(company_id);
CREATE INDEX idx_projects_client ON public.projects(client_id);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.projects');

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Tasks
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.tasks (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  status           text NOT NULL DEFAULT 'backlog'
                     CHECK (status IN ('backlog','in_progress','review','done')),
  priority         text NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low','medium','high','urgent')),
  assigned_agent   text,
  assigned_user_id uuid,
  due_date         timestamptz,
  completed_at     timestamptz,
  parent_task_id   uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.tasks');

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Proposals
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.proposals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','accepted','rejected')),
  content         jsonb NOT NULL DEFAULT '{}',
  total_amount    numeric NOT NULL DEFAULT 0,
  valid_until     timestamptz,
  sent_at         timestamptz,
  accepted_at     timestamptz,
  rejected_at     timestamptz,
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposals_org ON public.proposals(organization_id);
CREATE INDEX idx_proposals_company ON public.proposals(company_id);
CREATE INDEX idx_proposals_client ON public.proposals(client_id);
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.proposals');

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Websites
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.websites (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  url             text NOT NULL,
  name            text NOT NULL,
  platform        text,
  last_crawled_at timestamptz,
  health_score    numeric,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_websites_org ON public.websites(organization_id);
CREATE INDEX idx_websites_company ON public.websites(company_id);
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.websites');

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. Website Audits
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.website_audits (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  website_id      uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  audit_type      text NOT NULL,
  score           numeric,
  findings_count  int NOT NULL DEFAULT 0,
  raw_data        jsonb NOT NULL DEFAULT '{}',
  completed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_website_audits_org ON public.website_audits(organization_id);
CREATE INDEX idx_website_audits_website ON public.website_audits(website_id);
ALTER TABLE public.website_audits ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.website_audits');

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. SEO Findings
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.seo_findings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  audit_id        uuid NOT NULL REFERENCES public.website_audits(id) ON DELETE CASCADE,
  url             text NOT NULL,
  category        text NOT NULL,
  severity        text NOT NULL CHECK (severity IN ('info','warning','error','critical')),
  title           text NOT NULL,
  description     text NOT NULL,
  recommendation  text,
  resolved        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_findings_org ON public.seo_findings(organization_id);
CREATE INDEX idx_seo_findings_audit ON public.seo_findings(audit_id);
ALTER TABLE public.seo_findings ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.seo_findings');

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. AI Assessments
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.ai_assessments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  website_id      uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  summary         text NOT NULL,
  recommendations text[] NOT NULL DEFAULT '{}',
  raw_data        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_assessments_org ON public.ai_assessments(organization_id);
CREATE INDEX idx_ai_assessments_website ON public.ai_assessments(website_id);
ALTER TABLE public.ai_assessments ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.ai_assessments');

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. Agents
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.agents (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  display_name         text NOT NULL,
  description          text,
  model                text NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  system_prompt_version text NOT NULL DEFAULT '1.0.0',
  is_active            boolean NOT NULL DEFAULT true,
  config               jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
CREATE INDEX idx_agents_org ON public.agents(organization_id);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.agents');

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. Agent Threads
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.agent_threads (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  parent_thread_id uuid REFERENCES public.agent_threads(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting','closed')),
  subject         text,
  context         jsonb NOT NULL DEFAULT '{}',
  started_by      text NOT NULL,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_threads_org ON public.agent_threads(organization_id);
CREATE INDEX idx_agent_threads_agent ON public.agent_threads(agent_id);
ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.agent_threads');

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. Agent Tool Calls
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.agent_tool_calls (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  thread_id       uuid NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  agent_name      text NOT NULL,
  tool_name       text NOT NULL,
  input           jsonb NOT NULL DEFAULT '{}',
  output          jsonb,
  duration_ms     int,
  error           text,
  called_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_tool_calls_org ON public.agent_tool_calls(organization_id);
CREATE INDEX idx_agent_tool_calls_thread ON public.agent_tool_calls(thread_id);
ALTER TABLE public.agent_tool_calls ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.agent_tool_calls');

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. Agent Costs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.agent_costs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  thread_id       uuid REFERENCES public.agent_threads(id) ON DELETE SET NULL,
  agent_name      text NOT NULL,
  model           text NOT NULL,
  input_tokens    int NOT NULL DEFAULT 0,
  output_tokens   int NOT NULL DEFAULT 0,
  cost_usd        numeric NOT NULL DEFAULT 0,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_costs_org ON public.agent_costs(organization_id);
CREATE INDEX idx_agent_costs_recorded ON public.agent_costs(recorded_at);
ALTER TABLE public.agent_costs ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.agent_costs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. Memories  (with pgvector embedding)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.memories (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope           text NOT NULL CHECK (scope IN ('organization','company','client','project','agent')),
  scope_id        uuid NOT NULL,
  content         text NOT NULL,
  embedding       vector(1536),    -- OpenAI text-embedding-3-small dimension
  metadata        jsonb NOT NULL DEFAULT '{}',
  source          text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_memories_org ON public.memories(organization_id);
CREATE INDEX idx_memories_scope ON public.memories(scope, scope_id);
CREATE INDEX idx_memories_embedding ON public.memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.memories');

-- ═══════════════════════════════════════════════════════════════════════════
-- 20. Memory Entities (knowledge graph nodes)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.memory_entities (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  entity_type     text NOT NULL,
  description     text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_entities_org ON public.memory_entities(organization_id);
CREATE INDEX idx_memory_entities_type ON public.memory_entities(entity_type);
ALTER TABLE public.memory_entities ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.memory_entities');

-- ═══════════════════════════════════════════════════════════════════════════
-- 21. Memory Edges (knowledge graph edges)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.memory_edges (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_entity_id  uuid NOT NULL REFERENCES public.memory_entities(id) ON DELETE CASCADE,
  target_entity_id  uuid NOT NULL REFERENCES public.memory_entities(id) ON DELETE CASCADE,
  relation          text NOT NULL,
  weight            numeric NOT NULL DEFAULT 1.0,
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_memory_edges_org ON public.memory_edges(organization_id);
CREATE INDEX idx_memory_edges_source ON public.memory_edges(source_entity_id);
CREATE INDEX idx_memory_edges_target ON public.memory_edges(target_entity_id);
ALTER TABLE public.memory_edges ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.memory_edges');

-- ═══════════════════════════════════════════════════════════════════════════
-- 22. Knowledge Sources
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.knowledge_sources (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES public.sub_companies(id) ON DELETE SET NULL,
  name            text NOT NULL,
  source_type     text NOT NULL CHECK (source_type IN ('document','url','api','manual')),
  uri             text,
  content_hash    text,
  last_synced_at  timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_knowledge_sources_org ON public.knowledge_sources(organization_id);
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.knowledge_sources');

-- ═══════════════════════════════════════════════════════════════════════════
-- 23. Workflows
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.workflows (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  trigger_type     text NOT NULL,
  trigger_config   jsonb NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','paused','completed','failed')),
  steps_definition jsonb NOT NULL DEFAULT '[]',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflows_org ON public.workflows(organization_id);
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.workflows');

-- ═══════════════════════════════════════════════════════════════════════════
-- 24. Workflow Runs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.workflow_runs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id     uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','paused','completed','failed','cancelled')),
  current_step    int NOT NULL DEFAULT 0,
  context         jsonb NOT NULL DEFAULT '{}',
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflow_runs_org ON public.workflow_runs(organization_id);
CREATE INDEX idx_workflow_runs_workflow ON public.workflow_runs(workflow_id);
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.workflow_runs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 25. Workflow Steps
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.workflow_steps (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id          uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_index      int NOT NULL,
  agent_name      text,
  action          text NOT NULL,
  input           jsonb NOT NULL DEFAULT '{}',
  output          jsonb,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','completed','failed','skipped')),
  started_at      timestamptz,
  completed_at    timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workflow_steps_org ON public.workflow_steps(organization_id);
CREATE INDEX idx_workflow_steps_run ON public.workflow_steps(run_id);
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.workflow_steps');

-- ═══════════════════════════════════════════════════════════════════════════
-- 26. Approvals
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.approvals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_run_id uuid REFERENCES public.workflow_runs(id) ON DELETE SET NULL,
  resource_type   text NOT NULL,
  resource_id     uuid NOT NULL,
  requested_by    text NOT NULL,
  decided_by      text,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  reason          text,
  decided_at      timestamptz,
  expires_at      timestamptz,
  context         jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_approvals_org ON public.approvals(organization_id);
CREATE INDEX idx_approvals_status ON public.approvals(status);
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.approvals');

-- ═══════════════════════════════════════════════════════════════════════════
-- 27. Subscriptions
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.subscriptions (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text,
  plan_name              text NOT NULL,
  status                 text NOT NULL DEFAULT 'trialing'
                           CHECK (status IN ('trialing','active','past_due','cancelled','paused')),
  interval               text NOT NULL CHECK (interval IN ('monthly','quarterly','yearly')),
  current_period_start   timestamptz NOT NULL,
  current_period_end     timestamptz NOT NULL,
  cancel_at              timestamptz,
  metadata               jsonb NOT NULL DEFAULT '{}',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.subscriptions');

-- ═══════════════════════════════════════════════════════════════════════════
-- 28. Invoices
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.invoices (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id    uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id  text,
  number             text NOT NULL,
  status             text NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','open','paid','void','uncollectible')),
  amount_due         numeric NOT NULL DEFAULT 0,
  amount_paid        numeric NOT NULL DEFAULT 0,
  currency           text NOT NULL DEFAULT 'usd',
  line_items         jsonb NOT NULL DEFAULT '[]',
  due_date           timestamptz,
  paid_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.invoices');

-- ═══════════════════════════════════════════════════════════════════════════
-- 29. Usage Meters
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.usage_meters (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meter_name      text NOT NULL,
  value           numeric NOT NULL DEFAULT 0,
  period_start    timestamptz NOT NULL,
  period_end      timestamptz NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_meters_org ON public.usage_meters(organization_id);
CREATE INDEX idx_usage_meters_period ON public.usage_meters(period_start, period_end);
ALTER TABLE public.usage_meters ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.usage_meters');

-- ═══════════════════════════════════════════════════════════════════════════
-- 30. Payouts
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.payouts (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id       uuid REFERENCES public.sub_companies(id) ON DELETE SET NULL,
  stripe_payout_id text,
  amount           numeric NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'usd',
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_transit','paid','failed','cancelled')),
  arrival_date     timestamptz,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_org ON public.payouts(organization_id);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.payouts');

-- ═══════════════════════════════════════════════════════════════════════════
-- 31. Campaigns
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.campaigns (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id       uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  name             text NOT NULL,
  channel          text NOT NULL CHECK (channel IN ('email','sms','phone','linkedin','chat')),
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','scheduled','active','paused','completed')),
  audience_filter  jsonb NOT NULL DEFAULT '{}',
  content_template jsonb NOT NULL DEFAULT '{}',
  scheduled_at     timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  stats            jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX idx_campaigns_company ON public.campaigns(company_id);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.campaigns');

-- ═══════════════════════════════════════════════════════════════════════════
-- 32. Outreach Events
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.outreach_events (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  client_id       uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type      text NOT NULL,
  channel         text NOT NULL CHECK (channel IN ('email','sms','phone','linkedin','chat')),
  metadata        jsonb NOT NULL DEFAULT '{}',
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outreach_events_org ON public.outreach_events(organization_id);
CREATE INDEX idx_outreach_events_company ON public.outreach_events(company_id);
CREATE INDEX idx_outreach_events_client ON public.outreach_events(client_id);
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.outreach_events');

-- ═══════════════════════════════════════════════════════════════════════════
-- 33. Email Logs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.email_logs (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  campaign_id         uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  from_address        text NOT NULL,
  to_address          text NOT NULL,
  subject             text NOT NULL,
  body_preview        text,
  status              text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','failed')),
  provider_message_id text,
  sent_at             timestamptz,
  opened_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_logs_org ON public.email_logs(organization_id);
CREATE INDEX idx_email_logs_company ON public.email_logs(company_id);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.email_logs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 34. SMS Logs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.sms_logs (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id          uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  campaign_id         uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  from_number         text NOT NULL,
  to_number           text NOT NULL,
  body                text NOT NULL,
  status              text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','sent','delivered','failed')),
  provider_message_id text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_logs_org ON public.sms_logs(organization_id);
CREATE INDEX idx_sms_logs_company ON public.sms_logs(company_id);
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.sms_logs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 35. Call Logs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.call_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  from_number     text NOT NULL,
  to_number       text NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('inbound','outbound')),
  duration_seconds int,
  recording_url   text,
  transcript      text,
  outcome         text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_call_logs_org ON public.call_logs(organization_id);
CREATE INDEX idx_call_logs_company ON public.call_logs(company_id);
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.call_logs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 36. Consent Records
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.consent_records (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES public.sub_companies(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  consent_type    text NOT NULL CHECK (consent_type IN ('email','sms','phone','marketing','data_processing')),
  granted         boolean NOT NULL,
  ip_address      text,
  source          text,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_records_org ON public.consent_records(organization_id);
CREATE INDEX idx_consent_records_company ON public.consent_records(company_id);
CREATE INDEX idx_consent_records_contact ON public.consent_records(contact_id);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.consent_records');

-- ═══════════════════════════════════════════════════════════════════════════
-- 37. Audit Logs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_type      text NOT NULL CHECK (actor_type IN ('user','agent','system')),
  actor_id        text NOT NULL,
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     uuid NOT NULL,
  changes         jsonb,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.audit_logs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 38. Integrations
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.integrations (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider              text NOT NULL,
  status                text NOT NULL DEFAULT 'disconnected'
                          CHECK (status IN ('connected','disconnected','error')),
  config                jsonb NOT NULL DEFAULT '{}',
  credentials_encrypted text,
  last_synced_at        timestamptz,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);
CREATE INDEX idx_integrations_org ON public.integrations(organization_id);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.integrations');

-- ═══════════════════════════════════════════════════════════════════════════
-- 39. Playbooks
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.playbooks (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES public.sub_companies(id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  trigger         text NOT NULL,
  steps           jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_playbooks_org ON public.playbooks(organization_id);
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.playbooks');

-- ═══════════════════════════════════════════════════════════════════════════
-- 40. KPIs
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE public.kpis (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id      uuid REFERENCES public.sub_companies(id) ON DELETE SET NULL,
  name            text NOT NULL,
  metric_key      text NOT NULL,
  current_value   numeric NOT NULL DEFAULT 0,
  target_value    numeric,
  unit            text,
  period          text NOT NULL,
  trend           text CHECK (trend IN ('up','down','flat')),
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kpis_org ON public.kpis(organization_id);
CREATE INDEX idx_kpis_period ON public.kpis(period);
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
SELECT public.enable_updated_at('public.kpis');

-- ═══════════════════════════════════════════════════════════════════════════
-- Row-Level Security Policies
-- Every table gets a basic "org members can read their org's data" policy.
-- Service-role key bypasses RLS, so server-side code is unaffected.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: returns true if the current JWT user is a member of the given org.
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: returns the role of the current user in a given org.
CREATE OR REPLACE FUNCTION public.get_org_role(org_id uuid)
RETURNS text AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Macro: create a standard read policy for any org-scoped table.
CREATE OR REPLACE FUNCTION public.create_org_read_policy(tbl text)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY org_read ON public.%I FOR SELECT USING (public.is_org_member(organization_id));',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- Macro: create a standard write policy (insert/update) for admins/owners.
CREATE OR REPLACE FUNCTION public.create_org_write_policy(tbl text)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY org_write ON public.%I FOR ALL USING (
      public.get_org_role(organization_id) IN (''owner'',''admin'')
    );',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- Apply read policies to every org-scoped table.
SELECT public.create_org_read_policy(t) FROM unnest(ARRAY[
  'organizations',
  'organization_members',
  'sub_companies',
  'brands',
  'leads',
  'clients',
  'contacts',
  'projects',
  'tasks',
  'proposals',
  'websites',
  'website_audits',
  'seo_findings',
  'ai_assessments',
  'agents',
  'agent_threads',
  'agent_tool_calls',
  'agent_costs',
  'memories',
  'memory_entities',
  'memory_edges',
  'knowledge_sources',
  'workflows',
  'workflow_runs',
  'workflow_steps',
  'approvals',
  'subscriptions',
  'invoices',
  'usage_meters',
  'payouts',
  'campaigns',
  'outreach_events',
  'email_logs',
  'sms_logs',
  'call_logs',
  'consent_records',
  'audit_logs',
  'integrations',
  'playbooks',
  'kpis'
]) AS t;

-- Apply write policies to mutable tables (not audit_logs — append-only).
SELECT public.create_org_write_policy(t) FROM unnest(ARRAY[
  'organizations',
  'organization_members',
  'sub_companies',
  'brands',
  'leads',
  'clients',
  'contacts',
  'projects',
  'tasks',
  'proposals',
  'websites',
  'website_audits',
  'seo_findings',
  'ai_assessments',
  'agents',
  'agent_threads',
  'agent_tool_calls',
  'agent_costs',
  'memories',
  'memory_entities',
  'memory_edges',
  'knowledge_sources',
  'workflows',
  'workflow_runs',
  'workflow_steps',
  'approvals',
  'subscriptions',
  'invoices',
  'usage_meters',
  'payouts',
  'campaigns',
  'outreach_events',
  'email_logs',
  'sms_logs',
  'call_logs',
  'consent_records',
  'integrations',
  'playbooks',
  'kpis'
]) AS t;
