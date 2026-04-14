"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Palette,
  BarChart3,
  GitBranch,
  CheckCircle2,
  Loader2,
  Globe,
  FileText,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InlineReportPreview } from "@/components/InlineReportPreview";
import { createSubCompany } from "../../../actions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  slug: string;
  industry: string;
  website: string;
  description: string;
  primaryColor: string;
  voiceGuidelines: string;
}

const ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    industry: "",
    website: "",
    description: "",
    primaryColor: "#4FC3F7",
    voiceGuidelines: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiResearching, setAiResearching] = useState(false);

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setForm((prev) => ({ ...prev, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Company name is required");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required");
      return;
    }

    setError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("organization_id", ORG_ID);
    formData.set("name", form.name.trim());
    formData.set("slug", form.slug.trim());
    formData.set("industry", form.industry.trim());
    formData.set("website", form.website.trim());

    const result = await createSubCompany(formData);
    setSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      // Redirect after a short delay to show success
      setTimeout(() => router.push("/companies"), 2000);
    } else {
      setError(result.error);
    }
  };

  const handleResearchMarket = async () => {
    setAiResearching(true);
    try {
      const db = createClient();
      const { data: { session } } = await db.auth.getSession();

      const { data: job } = await db.from("audit_jobs").insert({
        organization_id: ORG_ID,
        job_type: "competitor_research",
        status: "queued",
        input_payload: {
          company_name: form.name,
          industry: form.industry,
          website: form.website,
        },
        target_entity_type: "company",
        external_system: "openclaw",
        started_at: new Date().toISOString(),
      }).select("id").single();

      if (job?.id) {
        setAiJobId(job.id);
        fetch("/api/openclaw/trigger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            agent_id: "main",
            message: `Research the market for a new company. Name: ${form.name || "New Company"}. Industry: ${form.industry || "unspecified"}. Website: ${form.website || "none yet"}. Analyze competitors, market size, trends, opportunities, potential differentiators, and recommend positioning strategy.`,
            job_id: job.id,
          }),
        }).catch(() => {});
      }
    } catch {}
    setAiResearching(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e15]">
          <CheckCircle2 className="h-8 w-8 text-[#22c55e]" />
        </div>
        <h2 className="text-xl font-bold text-white">Company Created!</h2>
        <p className="text-sm text-[#888]">
          Your new company is pending approval. Redirecting...
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#eab30815] px-4 py-2 text-xs font-semibold text-[#eab308]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Pending Approval
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/companies"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Companies
        </Link>
        <span className="text-[#333]">/</span>
        <span className="text-white">New Company</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Launch New Sub-Company
        </h1>
        <p className="mt-1 text-sm text-[#888]">
          Create a new venture or subsidiary under your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="h-5 w-5 text-[#4FC3F7]" />
              <h3 className="text-lg font-semibold text-white">
                Company Details
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[#888] block mb-1">
                  Company Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
                  placeholder="AeroVista Labs"
                />
              </div>
              <div>
                <label className="text-xs text-[#888] block mb-1">
                  Slug *
                </label>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  required
                  pattern="[a-z0-9-]+"
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none font-mono"
                  placeholder="aerovista-labs"
                />
              </div>
              <div>
                <label className="text-xs text-[#888] block mb-1">
                  Industry
                </label>
                <input
                  value={form.industry}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, industry: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
                  placeholder="AI / Drone Analytics"
                />
              </div>
              <div>
                <label className="text-xs text-[#888] block mb-1">
                  Website
                </label>
                <input
                  value={form.website}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, website: e.target.value }))
                  }
                  type="url"
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
                  placeholder="https://aerovista.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-[#888] block mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none resize-none"
                  placeholder="Brief description of this company..."
                />
              </div>
            </div>
          </div>

          {/* Brand Settings */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Palette className="h-5 w-5 text-[#F5C542]" />
              <h3 className="text-lg font-semibold text-white">
                Brand Settings
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[#888] block mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="h-10 w-10 cursor-pointer rounded-lg border border-[#333] bg-[#111]"
                  />
                  <input
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    className="flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white font-mono focus:border-[#4FC3F7] focus:outline-none"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 col-span-1">
                <label className="text-xs text-[#888] block mb-1">
                  Voice Guidelines
                </label>
                <textarea
                  value={form.voiceGuidelines}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      voiceGuidelines: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none resize-none"
                  placeholder="Professional, innovative, and results-driven..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          {error && (
            <div className="rounded-lg border border-[#ef4444] bg-[#ef444415] px-4 py-3 text-sm text-[#ef4444]">
              {error}
            </div>
          )}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Launch Company
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleResearchMarket}
              disabled={aiResearching}
              className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-[#F5C542] transition-colors hover:bg-[#111] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {aiResearching ? "Researching..." : "Research Market"}
            </button>
            <Link
              href="/companies"
              className="rounded-lg border border-[#333] px-6 py-3 text-sm text-[#888] hover:text-white transition-colors"
            >
              Cancel
            </Link>
          </div>

          {/* AI Market Research Preview */}
          {aiJobId && (
            <InlineReportPreview jobId={aiJobId} autoExpand showStatusBar />
          )}
        </form>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h3 className="text-sm font-medium text-[#888] mb-4">
              What will be created
            </h3>
            <div className="space-y-3">
              {[
                {
                  icon: Building2,
                  label: "Company",
                  detail: form.name || "Company name",
                  color: "#4FC3F7",
                },
                {
                  icon: Palette,
                  label: "Brand",
                  detail: "Logo, colors, voice",
                  color: "#F5C542",
                },
                {
                  icon: BarChart3,
                  label: "5 KPIs",
                  detail: "Revenue, leads, conversion, MRR, churn",
                  color: "#22c55e",
                },
                {
                  icon: GitBranch,
                  label: "3 Workflows",
                  detail: "Lead intake, SEO audit, follow-up",
                  color: "#eab308",
                },
                {
                  icon: Globe,
                  label: "Website Record",
                  detail: form.website || "Will be added later",
                  color: "#f97316",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg bg-[#111] px-4 py-3"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${item.color}15` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: item.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-[#666]">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slug Preview */}
          {form.slug && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <h3 className="text-sm font-medium text-[#888] mb-2">
                Company Slug
              </h3>
              <p className="font-mono text-sm text-[#4FC3F7]">
                /{form.slug}
              </p>
            </div>
          )}

          {/* Color Preview */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h3 className="text-sm font-medium text-[#888] mb-3">
              Brand Preview
            </h3>
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-lg"
                style={{ backgroundColor: form.primaryColor }}
              />
              <div>
                <p className="text-sm font-medium text-white">
                  {form.name || "Company"}
                </p>
                <p className="text-xs font-mono text-[#666]">
                  {form.primaryColor}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
