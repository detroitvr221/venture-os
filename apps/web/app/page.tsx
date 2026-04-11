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
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const services = [
  {
    icon: Search,
    title: "SEO & Growth",
    description:
      "AI-powered SEO audits, keyword strategy, and content optimization to drive organic traffic and dominate search rankings.",
  },
  {
    icon: Globe,
    title: "Website & Presence",
    description:
      "Full website builds, UX audits, and conversion optimization. Your digital presence, engineered for results.",
  },
  {
    icon: Bot,
    title: "AI Integration",
    description:
      "Automate workflows, deploy AI agents inside your business, and unlock efficiency at every level of operations.",
  },
  {
    icon: FileText,
    title: "Content Operations",
    description:
      "Blog, social, and email content at scale with AI writers. Consistent quality, unlimited output.",
  },
  {
    icon: Rocket,
    title: "Venture Building",
    description:
      "Launch new companies with AI-first operations from day one. From concept to revenue, fully automated.",
  },
  {
    icon: Cog,
    title: "Automation & CRM",
    description:
      "Lead intake, follow-up sequences, and billing automation. Your sales pipeline on autopilot.",
  },
];

const steps = [
  {
    icon: ScanSearch,
    step: "01",
    title: "We Audit",
    description:
      "Deep analysis of your digital presence, SEO performance, and operations to identify every opportunity.",
  },
  {
    icon: Hammer,
    step: "02",
    title: "We Build",
    description:
      "Custom AI agents, workflows, and automations designed specifically for your business needs.",
  },
  {
    icon: Radio,
    step: "03",
    title: "We Operate",
    description:
      "Ongoing management with 11 specialist AI agents working 24/7 to grow and optimize your business.",
  },
];

const agents = [
  { name: "Atlas", role: "CEO / Operator", description: "Orchestrates all agents, prioritizes tasks, and makes strategic decisions across the entire portfolio." },
  { name: "Mercury", role: "Sales", description: "Manages lead intake, qualification, outreach sequences, and pipeline conversion." },
  { name: "Beacon", role: "SEO", description: "Runs technical audits, keyword research, content optimization, and rank tracking." },
  { name: "Canvas", role: "Web Presence", description: "Builds and maintains websites, landing pages, and conversion funnels." },
  { name: "Nexus", role: "AI Integration", description: "Deploys AI tools, chatbots, and workflow automation inside client businesses." },
  { name: "Forge", role: "Venture Builder", description: "Launches new companies with automated operations, branding, and go-to-market." },
  { name: "Cipher", role: "Developer", description: "Writes code, ships features, manages deployments, and maintains infrastructure." },
  { name: "Pulse", role: "Operations", description: "Monitors systems, handles scheduling, and ensures smooth day-to-day operations." },
  { name: "Ledger", role: "Finance", description: "Generates invoices, tracks expenses, manages budgets, and produces financial reports." },
  { name: "Scout", role: "Research", description: "Gathers market intelligence, competitive analysis, and trend reports." },
  { name: "Sentinel", role: "Compliance", description: "Ensures legal compliance, data privacy, contract review, and risk management." },
];

const stats = [
  { value: "11", label: "AI Agents", icon: Bot },
  { value: "41", label: "Database Tables", icon: Database },
  { value: "6", label: "Automated Workflows", icon: GitBranch },
  { value: "24/7", label: "Operations", icon: Clock },
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
              Agents
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
        {/* Gradient glow */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6] opacity-[0.07] blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 translate-y-0 rounded-full bg-[#8b5cf6] opacity-[0.05] blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#222] bg-[#111] px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-xs text-[#888]">
              11 AI Agents Online
            </span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
              AI-Powered Agency
            </span>
            <br />
            <span className="text-white">
              Services for Modern Businesses
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#888] leading-relaxed">
            North Bridge Digital is an AI holding company that launches and
            operates businesses. We deploy specialist AI agents to handle SEO,
            sales, development, and operations — so you can scale without limits.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3b82f620] transition-all hover:shadow-[#3b82f640] hover:scale-[1.02]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => scrollTo("services")}
              className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#111] px-8 py-3.5 text-sm font-semibold text-[#ccc] transition-all hover:border-[#444] hover:text-white"
            >
              Learn More
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
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
            What We Do
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Full-Stack AI Agency Services
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            Everything your business needs to grow, automated and managed by
            specialist AI agents.
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
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[#888]">
              Three steps to transform your business with AI-powered operations.
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
            11 Specialist AI Agents
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            A full team of AI agents working around the clock to run every aspect
            of your business.
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

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <Icon className="mx-auto h-6 w-6 text-[#3b82f6]" />
                  <p className="mt-3 text-4xl font-extrabold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-[#888]">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-[#1a1a1a] bg-gradient-to-br from-[#111] to-[#0d0d0d] p-12 text-center lg:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to transform your business?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[#888]">
            Get started with North Bridge Digital and let our AI agents take your
            operations to the next level.
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
              href="/login"
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
              North Bridge Digital &copy; 2026
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/overview"
              className="text-sm text-[#666] transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#666] transition-colors hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
