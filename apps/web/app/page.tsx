"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Globe,
  Bot,
  FileText,
  Rocket,
  Cog,
  ScanSearch,
  Hammer,
  Radio,
  Users,
  TrendingUp,
  Shield,
  Code2,
  Briefcase,
  DollarSign,
  BookOpen,
  Database,
  GitBranch,
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Zap,
  UserCheck,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const services = [
  {
    icon: Search,
    title: "SEO & Growth",
    description:
      "Our SEO agent crawls your site, identifies technical issues, and builds a prioritized action plan. A human strategist reviews every recommendation before it ships.",
  },
  {
    icon: Globe,
    title: "Website & Presence",
    description:
      "AI audits your site for trust, speed, and conversions. Our team builds or rebuilds it to convert. You own the code, the design, and the results.",
  },
  {
    icon: Bot,
    title: "AI Integration",
    description:
      "We map your workflows, identify automation opportunities, and deploy AI agents inside your business. Human operators manage the rollout and monitor performance.",
  },
  {
    icon: FileText,
    title: "Content Operations",
    description:
      "AI writers draft blog posts, social content, and email sequences at scale. Human editors review every piece before it goes live. Quality at volume.",
  },
  {
    icon: Rocket,
    title: "Venture Building",
    description:
      "From napkin idea to running company in 30 days. AI agents scaffold the brand, website, and operations. Humans approve every strategic decision.",
  },
  {
    icon: Cog,
    title: "Automation & CRM",
    description:
      "Automated lead intake, consent-checked follow-up sequences, and billing workflows. Every outbound message is logged. Every financial action is human-approved.",
  },
];

const steps = [
  {
    icon: ScanSearch,
    step: "01",
    title: "We Audit",
    description:
      "AI agents analyze your website, SEO, content, and operations. Human strategists review the findings and build your action plan.",
  },
  {
    icon: Hammer,
    step: "02",
    title: "We Build",
    description:
      "AI agents write the code, draft the content, and configure the systems. Human operators review, approve, and deploy.",
  },
  {
    icon: Radio,
    step: "03",
    title: "We Operate",
    description:
      "11 AI agents run your operations 24/7. Human oversight on every sensitive action — outreach, billing, deployments, and client communications.",
  },
];

const agents = [
  { name: "CEO / Operator", role: "Strategy & Routing", description: "Routes work across the team, reviews KPIs, and makes priority calls. Human approval required for high-risk decisions." },
  { name: "Sales Agent", role: "Pipeline & Proposals", description: "Qualifies leads, drafts proposals, and suggests outreach. Never sends first-contact without human approval." },
  { name: "SEO Agent", role: "Audits & Rankings", description: "Crawls sites, analyzes indexing and content gaps, generates action plans. Human strategist reviews every audit." },
  { name: "Web Presence", role: "Sites & Conversion", description: "Audits trust signals, brand consistency, local presence, and conversion clarity. Recommends fixes humans implement." },
  { name: "AI Integration", role: "Automation & Workflows", description: "Maps client workflows, identifies automation opportunities, drafts integration plans with ROI estimates." },
  { name: "Venture Builder", role: "New Companies", description: "Scaffolds new businesses — brand, website, KPIs, workflows. Every company launch requires human approval gate." },
  { name: "Developer", role: "Code & Deploys", description: "Writes code in a sandbox, opens PRs, updates docs. Never deploys to production without human review." },
  { name: "Ops Agent", role: "Monitoring & Health", description: "Monitors workflows, retries, queue health, and incidents. Escalates to humans when intervention is needed." },
  { name: "Finance Agent", role: "Billing & Revenue", description: "Tracks subscriptions, invoices, and usage. Drafts recommendations. No autonomous money movement — ever." },
  { name: "Research Agent", role: "Intel & Analysis", description: "Fetches market data, competitor summaries, and tech references. Attaches source provenance to every output." },
  { name: "Compliance", role: "Safety & Guardrails", description: "Validates consent, communication legality, and financial action gating. The agent that keeps every other agent honest." },
];

const stats = [
  { value: "11", label: "AI Agents", sublabel: "working alongside human operators", icon: Bot },
  { value: "24/7", label: "Operations", sublabel: "with human oversight on sensitive actions", icon: Clock },
  { value: "48hr", label: "Proposals", sublabel: "from first contact to delivery", icon: Zap },
  { value: "100%", label: "Auditable", sublabel: "every action logged, every approval tracked", icon: Shield },
];

const trustPoints = [
  "Human approval on all outbound communications",
  "Consent checks before every email and SMS",
  "No autonomous money movement",
  "Complete audit trail on every action",
  "Code runs in sandboxes, never on production without review",
  "Compliance agent validates every sensitive decision",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [email, setEmail] = useState("");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#ffffff08] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
              <span className="text-sm font-bold text-white">NB</span>
            </div>
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-lg font-bold text-transparent">
              North Bridge Digital
            </span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollTo("services")}
              className="text-sm text-[#888] transition-colors hover:text-white"
            >
              Services
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="text-sm text-[#888] transition-colors hover:text-white"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollTo("agents")}
              className="text-sm text-[#888] transition-colors hover:text-white"
            >
              Our Team
            </button>
            <button
              onClick={() => scrollTo("trust")}
              className="text-sm text-[#888] transition-colors hover:text-white"
            >
              Trust
            </button>
            <Link
              href="/login"
              className="rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] opacity-[0.07] blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 translate-y-0 rounded-full bg-[#8b5cf6] opacity-[0.05] blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#222] bg-[#111] px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-xs text-[#888]">
              11 AI Agents + Human Operators Online
            </span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-white">
              AI Agents That Run
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
              Your Business.
            </span>
            <br />
            <span className="text-white text-4xl sm:text-5xl lg:text-5xl font-bold">
              Humans That Keep It Honest.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#888] leading-relaxed">
            North Bridge Digital deploys 11 specialist AI agents alongside human
            operators to run your marketing, SEO, website, and operations. The AI
            does the heavy lifting. Humans provide the strategy, judgment, and
            approval on everything that matters.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#666]">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> Human-approved outreach</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> 48-hour proposals</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> Full audit trail</span>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3b82f620] transition-all hover:shadow-[#3b82f640] hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#111] px-8 py-3.5 text-sm font-semibold text-[#ccc] transition-all hover:border-[#444] hover:text-white"
            >
              See How It Works
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="h-10 w-6 rounded-full border-2 border-[#333] p-1">
            <div className="h-2 w-full rounded-full bg-[#888] animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────── */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#3b82f6]">
            What We Deliver
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            AI Execution. Human Judgment.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            Six service lines, each powered by specialist AI agents and guided by
            human operators who approve every critical action.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="group rounded-2xl border border-[#1a1a1a] bg-[#111] p-7 transition-all hover:border-[#333] hover:bg-[#141414]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b82f610] transition-colors group-hover:bg-[#3b82f620]">
                  <Icon className="h-6 w-6 text-[#3b82f6]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#888]">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#8b5cf6]">
              Our Process
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Audit. Build. Operate.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[#888]">
              Three phases. AI handles the volume. Humans handle the decisions.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="mt-5 block text-xs font-bold uppercase tracking-widest text-[#3b82f6]">
                    Step {item.step}
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#888]">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Agent Roster ───────────────────────────────────────────────── */}
      <section id="agents" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#3b82f6]">
            The Team
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            11 AI Agents. Human Operators. One Mission.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            Every agent has a defined role, clear boundaries, and a human operator
            who approves anything sensitive. No agent acts alone on decisions that matter.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent, i) => {
            const roleIcons = [
              Briefcase, TrendingUp, Search, Globe, Bot, Rocket, Code2,
              Cog, DollarSign, BookOpen, Shield,
            ];
            const Icon = roleIcons[i] ?? Bot;
            return (
              <div
                key={agent.name}
                className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5 transition-all hover:border-[#333]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {agent.name}
                    </h4>
                    <p className="text-xs text-[#3b82f6]">{agent.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#888]">
                  {agent.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Trust & Safety ─────────────────────────────────────────────── */}
      <section id="trust" className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#22c55e]">
                Built Responsibly
              </p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                AI That You Can Trust.
                <br />
                <span className="text-[#888]">Because Humans Are Always In The Loop.</span>
              </h2>
              <p className="mt-4 text-[#888] leading-relaxed">
                We built compliance into the architecture, not the fine print. Every
                outbound message is consent-checked. Every financial action requires
                human approval. Every agent action is logged with a complete audit trail.
                This is not an afterthought — it is how the system works.
              </p>
            </div>
            <div className="space-y-4">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#22c55e]" />
                  <span className="text-sm text-[#ccc]">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <Icon className="mx-auto h-6 w-6 text-[#3b82f6]" />
                <p className="mt-3 text-4xl font-extrabold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-white">{stat.label}</p>
                <p className="mt-0.5 text-xs text-[#666]">{stat.sublabel}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-[#1a1a1a] bg-gradient-to-br from-[#111] to-[#0d0d0d] p-12 text-center lg:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to put 11 agents to work?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[#888]">
            AI handles the execution. Humans handle the judgment. Together,
            they run your business better than either could alone.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-[#333] bg-[#0a0a0a] px-5 py-3 text-sm text-white placeholder-[#666] outline-none transition-colors focus:border-[#3b82f6]"
            />
            <Link
              href={email ? `/signup?email=${encodeURIComponent(email)}` : "/signup"}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1a1a1a]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
              <span className="text-[10px] font-bold text-white">NB</span>
            </div>
            <span className="text-sm text-[#888]">
              North Bridge Digital &copy; 2026. AI-powered, human-guided.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/overview"
              className="text-sm text-[#666] transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#666] transition-colors hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
