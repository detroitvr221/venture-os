"use client";

import { useState, useCallback } from "react";
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
  Menu,
  X,
  Star,
  ChevronDown,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const buildPackages = [
  {
    name: "Launch",
    price: "$199",
    strikePrice: "$497",
    period: "/month",
    description: "Get online with a professional presence",
    features: [
      "Custom landing page design",
      "Mobile-first responsive build",
      "Contact form + lead capture",
      "Google Analytics setup",
      "SSL + hosting configuration",
      "2 rounds of revisions per month",
      "Monthly performance check-in",
      "48-hour response time",
    ],
    cta: "Get Started",
    popular: false,
    save: "60% off",
  },
  {
    name: "Build",
    price: "$399",
    strikePrice: "$997",
    period: "/month",
    description: "Most popular — full website with lead generation",
    features: [
      "Everything in Launch, plus:",
      "Up to 10-page custom website",
      "Lead funnels + conversion forms",
      "CRM integration setup",
      "Blog or content section",
      "Speed optimization (90+ score)",
      "Monthly design updates",
      "Bi-weekly strategy calls",
      "Priority 24-hour support",
    ],
    cta: "Get Started",
    popular: true,
    save: "60% off",
  },
  {
    name: "Platform",
    price: "$699",
    strikePrice: "$1,997",
    period: "/month",
    description: "Full digital platform for serious growth",
    features: [
      "Everything in Build, plus:",
      "Unlimited pages + app features",
      "Custom dashboard / client portal",
      "E-commerce or booking system",
      "A/B testing + conversion optimization",
      "API integrations + automation",
      "Weekly strategy sessions",
      "Dedicated project manager",
      "Same-day priority support",
    ],
    cta: "Get Started",
    popular: false,
    save: "65% off",
  },
];

const growthPackages = [
  {
    name: "Visibility",
    price: "$199",
    strikePrice: "$497",
    period: "/month",
    description: "Start showing up where customers search",
    features: [
      "Full technical SEO audit",
      "Google Business Profile optimization",
      "On-page SEO (titles, metas, headers)",
      "Local citation building",
      "Keyword tracking dashboard",
      "Monthly rankings report",
      "1 strategy call per month",
      "48-hour response time",
    ],
    cta: "Get Started",
    popular: false,
    save: "60% off",
  },
  {
    name: "Growth",
    price: "$399",
    strikePrice: "$997",
    period: "/month",
    description: "Most popular — SEO + content + social combined",
    features: [
      "Everything in Visibility, plus:",
      "4-8 SEO-optimized content pieces/mo",
      "Social media management (3 platforms)",
      "Branded content creation",
      "Monthly competitor analysis",
      "Analytics + conversion tracking",
      "Bi-weekly strategy calls",
      "Priority 24-hour support",
    ],
    cta: "Get Started",
    popular: true,
    save: "60% off",
  },
  {
    name: "Momentum",
    price: "$699",
    strikePrice: "$1,997",
    period: "/month",
    description: "Full-stack growth engine with strategy",
    features: [
      "Everything in Growth, plus:",
      "12+ content pieces per month",
      "Paid ad management (Google + Meta)",
      "Landing page creation + testing",
      "Lead gen funnel optimization",
      "Email marketing automation",
      "Weekly strategy sessions",
      "Dedicated growth strategist",
      "Same-day priority support",
    ],
    cta: "Get Started",
    popular: false,
    save: "65% off",
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
  { value: "6", label: "Packages", sublabel: "starting at $199/mo", icon: Zap },
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

export function LandingClient() {
  const [email, setEmail] = useState("");
  const [pricingTrack, setPricingTrack] = useState<"build" | "growth">("build");
  const [mobileNav, setMobileNav] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollTo = (id: string) => {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-50 border-b border-[#ffffff08] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
              <span className="text-sm font-bold text-white">NB</span>
            </div>
            <span className="bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-lg font-bold text-transparent">
              Northbridge Digital
            </span>
          </div>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileNav(!mobileNav)} className="rounded p-2 text-[#9ca3af] hover:text-white md:hidden" aria-label="Toggle navigation menu">
            {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <button onClick={() => scrollTo("services")} className="text-sm text-[#9ca3af] transition-colors hover:text-white" aria-label="Services">Services</button>
            <button onClick={() => scrollTo("pricing")} className="text-sm text-[#9ca3af] transition-colors hover:text-white" aria-label="Pricing">Pricing</button>
            <button onClick={() => scrollTo("how-it-works")} className="text-sm text-[#9ca3af] transition-colors hover:text-white" aria-label="How It Works">How It Works</button>
            <button onClick={() => scrollTo("ventures")} className="text-sm text-[#9ca3af] transition-colors hover:text-white" aria-label="Ventures">Ventures</button>
            <Link href="/login" className="rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90">
              Sign In
            </Link>
          </div>
        </div>
        {/* Mobile nav dropdown */}
        {mobileNav && (
          <div className="border-t border-[#222] bg-[#0a0a0a] px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <button onClick={() => scrollTo("services")} className="text-left text-sm text-[#9ca3af] hover:text-white">Services</button>
              <button onClick={() => scrollTo("pricing")} className="text-left text-sm text-[#9ca3af] hover:text-white">Pricing</button>
              <button onClick={() => scrollTo("how-it-works")} className="text-left text-sm text-[#9ca3af] hover:text-white">How It Works</button>
              <button onClick={() => scrollTo("ventures")} className="text-left text-sm text-[#9ca3af] hover:text-white">Ventures</button>
              <Link href="/book" className="text-left text-sm text-[#9ca3af] hover:text-white" onClick={() => setMobileNav(false)}>Book a Call</Link>
              <Link href="/login" className="mt-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-center text-sm font-medium text-white" onClick={() => setMobileNav(false)}>
                Sign In
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section aria-label="Hero" className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        <div className="pointer-events-none absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4FC3F7] opacity-[0.07] blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 translate-y-0 rounded-full bg-[#F5C542] opacity-[0.05] blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#222] bg-[#111] px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-xs text-[#9ca3af]">Now accepting new clients &middot; Packages from $199/mo</span>
          </div>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-white">Build. Launch.</span>
            <br />
            <span className="bg-gradient-to-r from-[#4FC3F7] via-[#7DD6C0] to-[#F5C542] bg-clip-text text-transparent">
              Grow Online.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[#9ca3af] leading-relaxed">
            Northbridge Digital helps businesses show up stronger online through
            websites, SEO, social media, and modern digital systems. Real people.
            Real execution. Real results.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#737373]">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> Websites & landing pages</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> SEO & visibility</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#22c55e]" /> From $199/month</span>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4FC3F720] transition-all hover:shadow-[#4FC3F740] hover:scale-[1.02]"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#111] px-8 py-3.5 text-sm font-semibold text-[#ccc] transition-all hover:border-[#444] hover:text-white"
            >
              Book a Free Call
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="h-10 w-6 rounded-full border-2 border-[#333] p-1">
            <div className="h-2 w-full rounded-full bg-[#888] animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────────── */}
      <section id="services" aria-labelledby="services-heading" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4FC3F7]">What We Do</p>
          <h2 id="services-heading" className="mt-3 text-3xl font-bold sm:text-4xl">Everything You Need to Grow Online</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#9ca3af]">
            Strategy, design, development, and growth — all from one team. No juggling vendors. No gaps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="group rounded-2xl border border-[#1a1a1a] bg-[#111] p-7 transition-all hover:border-[#333] hover:bg-[#141414]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4FC3F710] transition-colors group-hover:bg-[#4FC3F720]">
                  <Icon className="h-6 w-6 text-[#4FC3F7]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{cap.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#9ca3af]">{cap.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" aria-labelledby="pricing-heading" className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#F5C542]">Pricing</p>
            <h2 id="pricing-heading" className="mt-3 text-3xl font-bold sm:text-4xl">Simple, Transparent Packages</h2>
            <p className="mx-auto mt-4 max-w-xl text-[#9ca3af]">
              Two tracks. Three tiers each. Pick what fits. All plans include a 12-month commitment.
            </p>
          </div>

          {/* Track Toggle */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex rounded-xl border border-[#222] bg-[#0a0a0a] p-1">
              <button
                onClick={() => setPricingTrack("build")}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition ${
                  pricingTrack === "build" ? "bg-gradient-to-r from-[#4FC3F7] to-[#38B2AC] text-white" : "text-[#9ca3af] hover:text-white"
                }`}
              >
                <Globe className="mr-2 inline h-4 w-4" />
                Build Track
              </button>
              <button
                onClick={() => setPricingTrack("growth")}
                className={`rounded-lg px-6 py-2.5 text-sm font-medium transition ${
                  pricingTrack === "growth" ? "bg-gradient-to-r from-[#F5C542] to-[#F7A541] text-white" : "text-[#9ca3af] hover:text-white"
                }`}
              >
                <TrendingUp className="mr-2 inline h-4 w-4" />
                Growth Track
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-[#737373]">
            {pricingTrack === "build" ? "Websites, landing pages, and platform builds" : "SEO, social media, and online visibility"}
          </p>

          {/* Pricing Cards */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {(pricingTrack === "build" ? buildPackages : growthPackages).map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border p-7 transition-all ${
                  pkg.popular
                    ? "border-[#4FC3F7] bg-[#111] shadow-lg shadow-[#4FC3F710]"
                    : "border-[#1a1a1a] bg-[#111] hover:border-[#333]"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                  {"save" in pkg && (
                    <span className="rounded-full bg-[#10b981]/20 px-2.5 py-0.5 text-[10px] font-semibold text-[#10b981]">
                      {(pkg as Record<string, unknown>).save as string}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#9ca3af]">{pkg.description}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">{pkg.price}</span>
                  <span className="text-sm text-[#737373]">{pkg.period}</span>
                </div>
                {"strikePrice" in pkg && (
                  <p className="mt-1 text-sm text-[#737373]">
                    <span className="line-through">{(pkg as Record<string, unknown>).strikePrice as string}/mo</span>
                    <span className="ml-2 text-[#10b981]">Limited time</span>
                  </p>
                )}
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
                      ? "bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] text-white hover:opacity-90"
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
      <section id="how-it-works" aria-labelledby="how-it-works-heading" className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4FC3F7]">Our Process</p>
          <h2 id="how-it-works-heading" className="mt-3 text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#9ca3af]">
            Three steps to a stronger online presence. We handle the execution so you can focus on your business.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <span className="mt-5 block text-xs font-bold uppercase tracking-widest text-[#4FC3F7]">Step {item.step}</span>
                <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Ventures ──────────────────────────────────────────────────── */}
      <section id="ventures" aria-labelledby="ventures-heading" className="border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-[#F5C542]">Beyond Client Work</p>
              <h2 id="ventures-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
                We Build Businesses Too.
              </h2>
              <p className="mt-4 text-[#9ca3af] leading-relaxed">
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
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5C542]" />
                    <span className="text-sm text-[#ccc]">{point}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#1a1a1a] bg-[#111] p-8">
              <h3 className="text-lg font-semibold text-white">The Northbridge Model</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-4">
                  <p className="text-sm font-medium text-[#4FC3F7]">Client Services</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">Web, SEO, social, content, and digital systems for outside businesses</p>
                </div>
                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-4">
                  <p className="text-sm font-medium text-[#F5C542]">Internal Ventures</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">Our own brands designed for long-term digital growth</p>
                </div>
                <div className="rounded-lg border border-[#222] bg-[#0d0d0d] p-4">
                  <p className="text-sm font-medium text-[#10b981]">Partner Support</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">Modernizing operations for business owners who want to scale</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#f59e0b]">Social Proof</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Trusted by Businesses Across Michigan</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              quote: "Northbridge completely transformed our online presence. Within months we saw a real increase in leads from search.",
              name: "Marcus T.",
              role: "Owner, Apex Property Services",
            },
            {
              quote: "The monthly partnership model is refreshing. No surprise invoices, just consistent progress and clear reporting every month.",
              name: "Rachel K.",
              role: "Founder, Bloom & Co.",
            },
            {
              quote: "They built our site, set up our SEO, and handle our social. Having one team for everything makes life so much easier.",
              name: "David L.",
              role: "Managing Director, LPG Consulting",
            },
          ].map((testimonial, i) => (
            <div key={i} className="rounded-2xl border border-[#1a1a1a] bg-[#111] p-7">
              <div className="flex gap-1 text-[#f59e0b]">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#ccc]">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="mt-4 border-t border-[#222] pt-4">
                <p className="text-sm font-medium text-white">{testimonial.name}</p>
                <p className="text-xs text-[#9ca3af]">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "50+", label: "Projects Delivered" },
            { value: "6", label: "Service Packages" },
            { value: "MI", label: "Based in Michigan" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#1a1a1a] bg-[#111] p-5">
              <p className="text-3xl font-extrabold bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-transparent">{stat.value}</p>
              <p className="mt-1 text-sm text-[#9ca3af]">{stat.label}</p>
            </div>
          ))}
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
                  <Icon className="mx-auto h-6 w-6 text-[#4FC3F7]" />
                  <p className="mt-3 text-4xl font-extrabold bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-transparent">{stat.value}</p>
                  <p className="mt-1 text-sm font-medium text-white">{stat.label}</p>
                  <p className="mt-0.5 text-xs text-[#737373]">{stat.sublabel}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4FC3F7]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold">Common Questions</h2>
        </div>
        <div className="mt-12 space-y-4">
          {faqs.map((faq, i) => (
            <div key={faq.q} className="rounded-xl border border-[#1a1a1a] bg-[#111]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between p-5 text-left"
                role="heading"
                aria-level={3}
              >
                <h3 className="text-sm font-semibold text-white">{faq.q}</h3>
                <ChevronDown className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              <div className={`grid transition-all duration-300 ease-in-out ${openFaq === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="border-t border-[#1a1a1a] px-5 pb-5 pt-3">
                    <p className="text-sm text-[#9ca3af] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-[#1a1a1a] bg-gradient-to-br from-[#111] to-[#0d0d0d] p-12 text-center lg:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to Grow Your Business Online?</h2>
          <p className="mx-auto mt-4 max-w-lg text-[#9ca3af]">
            Websites, SEO, social media, and digital systems. One team, one monthly price, real results.
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="cta-email" className="sr-only">Email address</label>
            <input
              id="cta-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-[#333] bg-[#0a0a0a] px-5 py-3 text-sm text-white placeholder-[#737373] outline-none transition-colors focus:border-[#4FC3F7]"
            />
            <Link
              href={email ? `/signup?email=${encodeURIComponent(email)}` : "/signup"}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer aria-label="Site footer" role="contentinfo" className="border-t border-[#1a1a1a]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Services</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollTo("services")} className="text-sm text-[#737373] hover:text-white">Website Design</button></li>
                <li><button onClick={() => scrollTo("services")} className="text-sm text-[#737373] hover:text-white">SEO Optimization</button></li>
                <li><button onClick={() => scrollTo("services")} className="text-sm text-[#737373] hover:text-white">Social Media</button></li>
                <li><button onClick={() => scrollTo("services")} className="text-sm text-[#737373] hover:text-white">Content Marketing</button></li>
                <li><button onClick={() => scrollTo("services")} className="text-sm text-[#737373] hover:text-white">Brand Strategy</button></li>
                <li><button onClick={() => scrollTo("services")} className="text-sm text-[#737373] hover:text-white">Digital Systems</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollTo("how-it-works")} className="text-sm text-[#737373] hover:text-white">How It Works</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="text-sm text-[#737373] hover:text-white">Pricing</button></li>
                <li><button onClick={() => scrollTo("ventures")} className="text-sm text-[#737373] hover:text-white">Ventures</button></li>
                <li><Link href="/book" className="text-sm text-[#737373] hover:text-white">Book a Call</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/signup" className="text-sm text-[#737373] hover:text-white">Get Started</Link></li>
                <li><Link href="/login" className="text-sm text-[#737373] hover:text-white">Client Login</Link></li>
                <li><Link href="/book" className="text-sm text-[#737373] hover:text-white">Free Consultation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="text-sm text-[#737373] hover:text-white">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-sm text-[#737373] hover:text-white">Privacy Policy</Link></li>
              </ul>
              <h4 className="text-sm font-semibold text-white mb-3 mt-6">Contact</h4>
              <p className="text-sm text-[#737373]">hello@thenorthbridgemi.org</p>
              <p className="text-sm text-[#737373]">Michigan, USA</p>
            </div>
          </div>
          <div className="mt-8 border-t border-[#1a1a1a] pt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
                <span className="text-[10px] font-bold text-white">NB</span>
              </div>
              <span className="text-sm text-[#9ca3af]">
                Northbridge Digital &copy; 2026. Build. Launch. Grow.
              </span>
            </div>
            <p className="text-xs text-[#737373]">Michigan digital agency — websites, SEO, social media &amp; digital growth</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
