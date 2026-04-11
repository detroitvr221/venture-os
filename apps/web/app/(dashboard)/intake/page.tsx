"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, ArrowRight, ArrowLeft, CheckCircle2, Send, Building2 } from "lucide-react";

// ─── Service definitions ────────────────────────────────────────────────────

const SERVICES = [
  // Build Track
  { id: "web", label: "Website Design & Development", icon: "🌐", track: "build" },
  { id: "landing", label: "Landing Pages", icon: "📄", track: "build" },
  { id: "platform", label: "App / Platform Build", icon: "🖥️", track: "build" },
  { id: "systems", label: "Digital Systems & Automation", icon: "⚙️", track: "build" },
  // Growth Track
  { id: "seo", label: "SEO & Search Optimization", icon: "🔍", track: "growth" },
  { id: "social", label: "Social Media Management", icon: "📱", track: "growth" },
  { id: "content", label: "Content Marketing", icon: "📝", track: "growth" },
  { id: "visibility", label: "Visibility & Lead Generation", icon: "📊", track: "growth" },
];

// ─── Dynamic questions per service ──────────────────────────────────────────

type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "url";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  services: string[]; // which services trigger this question
};

const QUESTIONS: Question[] = [
  // Universal (always shown)
  { id: "company_name", label: "Company / Business Name", type: "text", placeholder: "Acme Corp", required: true, services: ["*"] },
  { id: "contact_name", label: "Your Name", type: "text", placeholder: "John Smith", required: true, services: ["*"] },
  { id: "contact_email", label: "Email Address", type: "text", placeholder: "john@acme.com", required: true, services: ["*"] },
  { id: "contact_phone", label: "Phone Number", type: "text", placeholder: "+1 555 0123", services: ["*"] },
  { id: "website_url", label: "Current Website URL", type: "url", placeholder: "https://acme.com", services: ["*"] },
  { id: "industry", label: "Industry", type: "select", options: ["Technology", "Healthcare", "Finance", "E-commerce", "Real Estate", "Education", "Manufacturing", "Professional Services", "Hospitality", "Other"], services: ["*"] },
  { id: "budget_range", label: "Which package range fits best?", type: "select", options: ["$99/mo (Launch / Visibility)", "$199/mo (Build / Growth)", "$299/mo (Platform / Momentum)", "Multiple packages", "Not sure yet"], required: true, services: ["*"] },
  { id: "timeline", label: "When do you want to start?", type: "select", options: ["Immediately", "Within 2 weeks", "Within a month", "Within 3 months", "Just exploring"], services: ["*"] },

  // SEO-specific
  { id: "seo_current", label: "Have you done SEO before?", type: "select", options: ["Yes, in-house", "Yes, with an agency", "Tried but stopped", "Never"], services: ["seo"] },
  { id: "seo_goals", label: "What are your top SEO goals?", type: "textarea", placeholder: "Rank for specific keywords, increase organic traffic, local SEO...", services: ["seo"] },
  { id: "seo_competitors", label: "Top 3 competitors you want to outrank", type: "textarea", placeholder: "competitor1.com, competitor2.com, competitor3.com", services: ["seo"] },

  // Website-specific
  { id: "web_type", label: "Type of website needed", type: "select", options: ["New website from scratch", "Redesign existing site", "Landing pages", "E-commerce store", "Web application", "Portfolio/Blog"], services: ["web"] },
  { id: "web_pages", label: "Estimated number of pages", type: "select", options: ["1-5 pages", "5-15 pages", "15-30 pages", "30+ pages"], services: ["web"] },
  { id: "web_features", label: "Key features needed", type: "textarea", placeholder: "Contact forms, booking system, payment processing, member area...", services: ["web"] },

  // Systems-specific
  { id: "systems_current", label: "What tools do you currently use?", type: "textarea", placeholder: "CRM, email marketing, project management, spreadsheets, none...", services: ["systems"] },
  { id: "systems_goals", label: "What would you like to automate or streamline?", type: "textarea", placeholder: "Lead follow-up, invoicing, scheduling, reporting...", services: ["systems"] },
  { id: "systems_data", label: "How organized is your current data?", type: "select", options: ["Well organized", "Somewhat organized", "Scattered everywhere", "Starting from scratch"], services: ["systems"] },

  // Content-specific
  { id: "content_types", label: "Content types needed", type: "select", options: ["Blog posts", "Case studies", "Whitepapers", "Email newsletters", "Video scripts", "All of the above"], services: ["content"] },

  // PPC-specific
  { id: "ppc_platforms", label: "Advertising platforms of interest", type: "select", options: ["Google Ads", "Facebook/Instagram Ads", "LinkedIn Ads", "TikTok Ads", "Multiple platforms"], services: ["ppc"] },
  { id: "ppc_monthly", label: "Monthly ad spend budget", type: "select", options: ["Under $1,000", "$1,000 - $5,000", "$5,000 - $15,000", "$15,000+"], services: ["ppc"] },

  // Final
  { id: "goals_summary", label: "What does success look like in 6 months?", type: "textarea", placeholder: "Describe your ideal outcome...", required: true, services: ["*"] },
  { id: "anything_else", label: "Anything else we should know?", type: "textarea", placeholder: "Special requirements, past experiences, concerns...", services: ["*"] },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = services, 1 = questions, 2 = review, 3 = submitted
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const activeQuestions = QUESTIONS.filter(
    (q) => q.services.includes("*") || q.services.some((s) => selectedServices.includes(s))
  );

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    const supabase = createClient();

    // Create lead from intake
    const { data: lead } = await supabase.from("leads").insert({
      organization_id: "00000000-0000-0000-0000-000000000001",
      name: answers.contact_name || "New Intake",
      email: answers.contact_email || null,
      phone: answers.contact_phone || null,
      company: answers.company_name || null,
      source: "intake_form",
      stage: "new",
      score: selectedServices.length >= 3 ? 80 : selectedServices.length >= 2 ? 60 : 40,
      metadata: {
        intake_form: true,
        services_requested: selectedServices,
        website_url: answers.website_url,
        industry: answers.industry,
        budget_range: answers.budget_range,
        timeline: answers.timeline,
        answers,
        submitted_at: new Date().toISOString(),
      },
    }).select().single();

    // Also create contact
    if (answers.contact_email) {
      await supabase.from("contacts").insert({
        organization_id: "00000000-0000-0000-0000-000000000001",
        name: answers.contact_name || null,
        email: answers.contact_email,
        phone: answers.contact_phone || null,
        company: answers.company_name || null,
        source: "intake_form",
      });
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      organization_id: "00000000-0000-0000-0000-000000000001",
      actor_type: "system",
      actor_id: "intake-form",
      action: "create",
      resource_type: "lead",
      resource_id: lead?.id || "unknown",
      changes: { services: selectedServices, budget: answers.budget_range },
    });

    setStep(3);
    setSubmitting(false);
  }

  // ─── Step 0: Service selection ────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Customer Intake</h1>
          <p className="mt-2 text-sm text-[#888]">Select the services you're interested in. We'll tailor our questions accordingly.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SERVICES.map((svc) => {
            const selected = selectedServices.includes(svc.id);
            return (
              <button
                key={svc.id}
                onClick={() => toggleService(svc.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-[#3b82f6] bg-[#3b82f6]/10"
                    : "border-[#222] bg-[#0a0a0a] hover:border-[#333]"
                }`}
              >
                <span className="text-2xl">{svc.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${selected ? "text-white" : "text-[#ccc]"}`}>{svc.label}</p>
                </div>
                {selected && <CheckCircle2 className="h-5 w-5 text-[#3b82f6]" />}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-between">
          <p className="text-sm text-[#888]">
            {selectedServices.length} service{selectedServices.length !== 1 ? "s" : ""} selected &middot; {activeQuestions.length} questions
          </p>
          <button
            onClick={() => setStep(1)}
            disabled={selectedServices.length === 0}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 1: Questions ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-[#888] hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to services
          </button>
          <span className="text-xs text-[#666]">{activeQuestions.length} questions</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Tell Us About Your Business</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedServices.map((s) => {
              const svc = SERVICES.find((sv) => sv.id === s);
              return (
                <span key={s} className="rounded-full bg-[#3b82f6]/20 px-2.5 py-0.5 text-xs text-[#3b82f6]">
                  {svc?.icon} {svc?.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 h-1 rounded-full bg-[#222]">
          <div
            className="h-1 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] transition-all"
            style={{ width: `${(Object.keys(answers).length / activeQuestions.length) * 100}%` }}
          />
        </div>

        <div className="space-y-5">
          {activeQuestions.map((q) => (
            <div key={q.id}>
              <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-[#ccc]">
                {q.label}
                {q.required && <span className="text-[#ef4444]">*</span>}
              </label>
              {q.type === "textarea" ? (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder={q.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#3b82f6] focus:outline-none"
                />
              ) : q.type === "select" ? (
                <select
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
                >
                  <option value="" className="bg-[#0a0a0a] text-[#555]">Select...</option>
                  {q.options?.map((o) => (
                    <option key={o} value={o} className="bg-[#0a0a0a]">{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={q.type}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder={q.placeholder}
                  className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#3b82f6] focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep(0)} className="px-4 py-2 text-sm text-[#888] hover:text-white">Back</button>
          <button
            onClick={() => setStep(2)}
            disabled={!answers.company_name || !answers.contact_name || !answers.contact_email || !answers.budget_range}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Review <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 2: Review ───────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Review Your Submission</h1>
          <p className="mt-1 text-sm text-[#888]">Confirm everything looks good before submitting.</p>
        </div>

        <div className="space-y-4">
          {/* Services */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <h3 className="mb-2 text-xs font-medium text-[#888]">Services Requested</h3>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map((s) => {
                const svc = SERVICES.find((sv) => sv.id === s);
                return (
                  <span key={s} className="rounded-full bg-[#3b82f6]/20 px-3 py-1 text-xs text-[#3b82f6]">
                    {svc?.icon} {svc?.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Answers */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
            <h3 className="mb-3 text-xs font-medium text-[#888]">Your Answers</h3>
            <div className="space-y-2">
              {activeQuestions.filter((q) => answers[q.id]).map((q) => (
                <div key={q.id} className="flex gap-3 text-sm">
                  <span className="w-48 shrink-0 text-[#888]">{q.label}</span>
                  <span className="text-white">{answers[q.id]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-[#888] hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Edit Answers
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#10b981] to-[#059669] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Intake Form"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step 3: Success ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#10b981]/20">
        <CheckCircle2 className="h-10 w-10 text-[#10b981]" />
      </div>
      <h1 className="text-2xl font-bold text-white">Intake Submitted</h1>
      <p className="mt-2 text-sm text-[#888]">
        Thank you! Your information has been received. Our team is reviewing your needs
        and will reach out within 24 hours with a tailored proposal.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => router.push("/leads")}
          className="rounded-lg border border-[#333] bg-[#1a1a1a] px-4 py-2 text-sm text-[#ccc] hover:bg-[#222]"
        >
          View in Leads
        </button>
        <button
          onClick={() => { setStep(0); setSelectedServices([]); setAnswers({}); }}
          className="rounded-lg bg-[#3b82f6] px-4 py-2 text-sm text-white"
        >
          New Intake
        </button>
      </div>
    </div>
  );
}
