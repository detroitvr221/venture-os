"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  FileText,
  Rocket,
  Search,
  TrendingUp,
  Users,
  Shield,
  Zap,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Megaphone,
  Palette,
  Code2,
  MessageSquare,
  Eye,
  Layers,
  Building2,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const buildPackages = [
  {
    name: "Launch",
    price: "$99",
    period: "/month",
    description: "Perfect for getting online fast",
    features: [
      "1 landing page",
      "Mobile optimization",
      "Contact form setup",
      "Basic analytics",
      "Minor monthly edits",
    ],
    cta: "Start with Launch",
    popular: false,
  },
  {
    name: "Build",
    price: "$199",
    period: "/month",
    description: "For businesses ready to grow",
    features: [
      "Up to 5 pages",
      "Lead capture forms",
      "Light integrations",
      "Hosting & domain guidance",
      "Monthly updates",
    ],
    cta: "Start with Build",
    popular: true,
  },
  {
    name: "Platform",
    price: "$299",
    period: "/month",
    description: "Advanced web experiences",
    features: [
      "Website + app layer",
      "Ongoing design/dev improvements",
      "Customer journey optimization",
      "Dashboard/admin support",
      "Priority support",
    ],
    cta: "Start with Platform",
    popular: false,
  },
];

const growthPackages = [
  {
    name: "Visibility",
    price: "$99",
    period: "/month",
    description: "Get found online",
    features: [
      "Basic SEO setup",
      "Google Business optimization",
      "Title & meta updates",
      "Profile consistency audit",
      "1 monthly check-in",
    ],
    cta: "Start with Visibility",
    popular: false,
  },
  {
    name: "Growth",
    price: "$199",
    period: "/month",
    description: "Accelerate your presence",
    features: [
      "SEO improvements",
      "Social media support",
      "2-4 content pieces/month",
      "Analytics reporting",
      "Monthly optimization",
    ],
    cta: "Start with Growth",
    popular: true,
  },
  {
    name: "Momentum",
    price: "$299",
    period: "/month",
    description: "Full growth engine",
    features: [
      "SEO + social + visibility",
      "Content planning",
      "Lead generation optimization",
      "Monthly strategy touchpoint",
      "Priority execution",
    ],
    cta: "Start with Momentum",
    popular: false,
  },
];

const capabilities = [
  { icon: Globe, title: "Website Design & Development", description: "From landing pages to full platforms. Built to convert, designed to impress." },
  { icon: Search, title: "SEO & Search Optimization", description: "Get found by the people searching for what you offer. Technical SEO, content, and rankings." },
  { icon: Megaphone, title: "Social Media Support", description: "Consistent branded content, community management, and social strategy that builds presence." },
  { icon: FileText, title: "Content Marketing", description: "Blog posts, case studies, and branded content that positions you as the authority." },
  { icon: Palette, title: "Brand Strategy & Identity", description: "Logos, colors, voice, and visual identity that makes your brand unforgettable." },
  { icon: Code2, title: "Digital Systems & Automation", description: "Modern tools, workflows, and systems that make your operations faster and smoother." },
];

const steps = [
  { step: "01", title: "We Learn", description: "We start with a consultation to understand your business, goals, and challenges. No cookie-cutter plans.", icon: MessageSquare },
  { step: "02", title: "We Build", description: "Our team designs, develops, and optimizes your digital presence. Real work, real progress, every month.", icon: Layers },
  { step: "03", title: "We Grow", description: "Ongoing SEO, content, and visibility improvements that compound over time. Monthly reporting so you see the results.", icon: TrendingUp },
];

const stats = [
  { value: "2", label: "Service Tracks", sublabel: "Build + Growth", icon: Layers },
  { value: "6", label: "Packages", sublabel: "starting at $99/mo", icon: Zap },
  { value: "48hr", label: "Proposals", sublabel: "from consult to delivery", icon: FileText },
  { value: "100%", label: "Transparent", sublabel: "monthly reports included", icon: Shield },
];

const trustPoints = [
  "Monthly reporting on all deliverables",
  "Dedicated point of contact for every client",
  "Clear pricing with no hidden fees",
  "12-month partnership commitment",
  "Real human strategy behind every decision",
  "Modern systems that accelerate execution",
];

const faqs = [
  { q: "What do you actually do?", a: "We help businesses build websites, improve their online visibility, and grow through SEO, social media, and digital systems. Think of us as your digital growth team, without the overhead of hiring in-house." },
  { q: "How is this different from other agencies?", a: "Most agencies sell projects. We sell partnerships. You get ongoing monthly support, real execution, and a team invested in your growth, not just a one-time deliverable." },
  { q: "What's included in the monthly price?", a: "Everything in your selected package. No surprise fees, no hourly billing. You pick a track (Build or Growth), choose a tier, and we get to work." },
  { q: "Do I need both Build and Growth?", a: "Not necessarily. Many clients start with one track and add the other as they grow. We'll recommend what makes sense for your stage." },
  { q: "Is there a contract?", a: "Yes, all packages include a 12-month commitment. This allows us to plan long-term strategy and deliver compounding results." },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [pricingTrack, setPricingTrack] = useState<"build" | "growth">("build");

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
              Northbridge Digital
            </span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <button onClick={() => scrollTo("services")} className="text-sm text-[#888] transition-colors hover:text-white">Services</button>
            <button onClick={() => scrollTo("pricing")} className="text-sm text-[#888] transition-colors hover:text-white">Pricing</button>
            <button onClick={() => scrollTo("how-it-works")} className="text-sm text-[#888] transition-colors hover:text-white">How It Works</button>
            <button onClick={() => scrollTo("ventures")} className="text-sm text-[#888] transition-colors hover:text-white">Ventures</button>
            <Link href="/login" className="rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
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
            <span className="text-xs text-[#888]">Now accepting new clients &middot; Packages from $99/mo</span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-white">Build. Launch.</span>
            <br />
            <span className="bg-gradient-to-r from-[#3b82f6] via-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">
              Grow Online.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#888] leading-relaxed">
            Northbridge Digital helps businesses show up stronger online through
            websites, SEO, social media, and modern digital systems. Real people.
            Real execution. Real results.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#666]">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> Websites & landing pages</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> SEO & visibility</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> From $99/month</span>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#3b82f620] transition-all hover:shadow-[#3b82f640] hover:scale-[1.02]"
            >
              Start Growing
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => scrollTo("pricing")}
              className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#111] px-8 py-3.5 text-sm font-semibold text-[#ccc] transition-all hover:border-[#444] hover:text-white"
            >
              See Packages
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
          <p className="text-sm font-semibold uppercase tracking-widest text-[#3b82f6]">What We Do</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Everything You Need to Grow Online</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            Strategy, design, development, and growth — all from one team. No juggling vendors. No gaps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="group rounded-2xl border border-[#1a1a1a] bg-[#111] p-7 transition-all hover:border-[#333] hover:bg-[#141414]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b82f610] transition-colors group-hover:bg-[#3b82f620]">
                  <Icon className="h-6 w-6 text-[#3b82f6]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#888]">{cap.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#8b5cf6]">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Simple, Transparent Packages</h2>
            <p className="mx-auto mt-4 max-w-xl text-[#888]">
              Two tracks. Three tiers each. Pick what fits. All plans include a 12-month commitment.
            </p>
          </div>

          {/* Track Toggle */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex rounded-xl border border-[#222] bg-[#0a0a0a] p-1">
              <button
                onClick={() => setPricingTrack("build")}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition ${
                  pricingTrack === "build" ? "bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-white" : "text-[#888] hover:text-white"
                }`}
              >
                <Globe className="mr-2 inline h-4 w-4" />
                Build Track
              </button>
              <button
                onClick={() => setPricingTrack("growth")}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition ${
                  pricingTrack === "growth" ? "bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] text-white" : "text-[#888] hover:text-white"
                }`}
              >
                <TrendingUp className="mr-2 inline h-4 w-4" />
                Growth Track
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-[#666]">
            {pricingTrack === "build" ? "Websites, landing pages, and platform builds" : "SEO, social media, and online visibility"}
          </p>

          {/* Pricing Cards */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {(pricingTrack === "build" ? buildPackages : growthPackages).map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border p-7 transition-all ${
                  pkg.popular
                    ? "border-[#3b82f6] bg-[#111] shadow-lg shadow-[#3b82f610]"
                    : "border-[#1a1a1a] bg-[#111] hover:border-[#333]"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                <p className="mt-1 text-xs text-[#888]">{pkg.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-white">{pkg.price}</span>
                  <span className="text-sm text-[#666]">{pkg.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#ccc]">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    pkg.popular
                      ? "bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white hover:opacity-90"
                      : "border border-[#333] text-[#ccc] hover:bg-[#1a1a1a] hover:text-white"
                  }`}
                >
                  {pkg.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#3b82f6]">Our Process</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#888]">
            Three steps to a stronger online presence. We handle the execution so you can focus on your business.
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
                <span className="mt-5 block text-xs font-bold uppercase tracking-widest text-[#3b82f6]">Step {item.step}</span>
                <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#888]">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Ventures ──────────────────────────────────────────────────── */}
      <section id="ventures" className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#8b5cf6]">Beyond Client Work</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                We Build Businesses Too.
              </h2>
              <p className="mt-4 text-[#888] leading-relaxed">
                Northbridge Digital is both a service company and a venture builder. We help outside
                businesses grow, and we launch and operate our own brands — from lead generation companies
                to e-commerce ventures and local service brands.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Launch and operate in-house digital ventures",
                  "Incubate brands in lead gen, e-commerce, and local services",
                  "Help partners modernize and vertically integrate",
                  "Build long-term digital assets under one umbrella",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8b5cf6]" />
                    <span className="text-sm text-[#ccc]">{point}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#111] p-8">
              <h3 className="text-lg font-semibold text-white">The Northbridge Model</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-4">
                  <p className="text-sm font-medium text-[#3b82f6]">Client Services</p>
                  <p className="mt-1 text-xs text-[#888]">Web, SEO, social, content, and digital systems for outside businesses</p>
                </div>
                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-4">
                  <p className="text-sm font-medium text-[#8b5cf6]">Internal Ventures</p>
                  <p className="mt-1 text-xs text-[#888]">Our own brands designed for long-term digital growth</p>
                </div>
                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-4">
                  <p className="text-sm font-medium text-[#10b981]">Partner Support</p>
                  <p className="mt-1 text-xs text-[#888]">Modernizing operations for business owners who want to scale</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#22c55e]">Why Northbridge</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Built on Trust and Transparency</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustPoints.map((point) => (
            <div key={point} className="flex items-start gap-3 rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#22c55e]" />
              <span className="text-sm text-[#ccc]">{point}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <Icon className="mx-auto h-6 w-6 text-[#3b82f6]" />
                  <p className="mt-3 text-4xl font-extrabold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-white">{stat.label}</p>
                  <p className="mt-0.5 text-xs text-[#666]">{stat.sublabel}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#3b82f6]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold">Common Questions</h2>
        </div>
        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
              <h3 className="text-sm font-semibold text-white">{faq.q}</h3>
              <p className="mt-2 text-sm text-[#888] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-[#1a1a1a] bg-gradient-to-br from-[#111] to-[#0d0d0d] p-12 text-center lg:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Grow Your Business Online?</h2>
          <p className="mx-auto mt-4 max-w-lg text-[#888]">
            Websites, SEO, social media, and digital systems. One team, one monthly price, real results.
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
              Start Growing
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
              Northbridge Digital &copy; 2026. Build. Launch. Grow.
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-sm text-[#666] transition-colors hover:text-white">Terms</Link>
            <Link href="/privacy" className="text-sm text-[#666] transition-colors hover:text-white">Privacy</Link>
            <Link href="/login" className="text-sm text-[#666] transition-colors hover:text-white">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
