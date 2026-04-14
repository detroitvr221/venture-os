"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, ArrowLeft, Save, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { InlineReportPreview } from "@/components/InlineReportPreview";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeadOption {
  id: string;
  contact_name: string;
}

const SERVICES = [
  "Web Design",
  "SEO Optimization",
  "Content Marketing",
  "Social Media Management",
  "Email Marketing",
  "PPC Advertising",
  "Brand Strategy",
  "Analytics & Reporting",
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function NewProposalPage() {
  const router = useRouter();
  const orgId = useOrgId();

  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ── Load leads ────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    const db = createClient();
    const { data } = await db
      .from("leads")
      .select("id, contact_name")
      .eq("organization_id", orgId)
      .order("contact_name");
    setLeads((data ?? []) as LeadOption[]);
    setLoadingLeads(false);
  }, [orgId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ── Toggle service ────────────────────────────────────────────────────

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSubmitting(true);
    const db = createClient();

    const { data, error } = await db
      .from("proposals")
      .insert({
        organization_id: orgId,
        title: title.trim(),
        lead_id: leadId || null,
        amount: amount ? parseFloat(amount) : null,
        services: selectedServices.length > 0 ? selectedServices : null,
        timeline: timeline.trim() || null,
        notes: notes.trim() || null,
        status: "draft",
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error) {
      toast.error("Failed to create proposal");
      return;
    }

    toast.success("Proposal created");
    router.push(`/proposals/${data.id}`);
  }

  // ── AI Draft ──────────────────────────────────────────────────

  const handleAiDraft = async () => {
    setAiLoading(true);
    try {
      const db = createClient();
      const { data: { session } } = await db.auth.getSession();
      const selectedLead = leads.find((l) => l.id === leadId);

      const { data: job } = await db.from("audit_jobs").insert({
        organization_id: orgId,
        job_type: "proposal_generation",
        status: "queued",
        input_payload: {
          title,
          lead_id: leadId || null,
          lead_name: selectedLead?.contact_name || null,
          services: selectedServices,
          amount,
          timeline,
          notes,
        },
        target_entity_type: "proposal",
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
            message: `Generate a professional proposal draft. Title: ${title || "New Proposal"}. Lead: ${selectedLead?.contact_name || "N/A"}. Services: ${selectedServices.join(", ") || "N/A"}. Amount: $${amount || "TBD"}. Timeline: ${timeline || "TBD"}. Notes: ${notes || "None"}. Create a compelling, detailed proposal with scope, deliverables, timeline, and pricing sections.`,
            job_id: job.id,
          }),
        }).catch(() => {});
      }
    } catch {}
    setAiLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/proposals"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Proposals
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-[#4FC3F7]" />
        <h1 className="text-2xl font-bold text-white">New Proposal</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="mb-1 block text-xs text-[#888]">
              Title *
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Website Redesign for Acme Corp"
              className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
            />
          </div>

          {/* Lead + Amount row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="lead" className="mb-1 block text-xs text-[#888]">
                Lead
              </label>
              <select
                id="lead"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                disabled={loadingLeads}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none disabled:opacity-50"
              >
                <option value="">No lead selected</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.contact_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-xs text-[#888]"
              >
                Amount ($)
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
              />
            </div>
          </div>

          {/* Services */}
          <div>
            <label className="mb-2 block text-xs text-[#888]">Services</label>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map((service) => {
                const checked = selectedServices.includes(service);
                return (
                  <label
                    key={service}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-[#4FC3F7] bg-[#4FC3F7]/10 text-[#4FC3F7]"
                        : "border-[#333] bg-[#111] text-[#888] hover:border-[#555] hover:text-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(service)}
                      className="sr-only"
                    />
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        checked
                          ? "border-[#4FC3F7] bg-[#4FC3F7]"
                          : "border-[#555] bg-transparent"
                      }`}
                    >
                      {checked && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    {service}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label
              htmlFor="timeline"
              className="mb-1 block text-xs text-[#888]"
            >
              Timeline
            </label>
            <input
              id="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g. 4-6 weeks"
              className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs text-[#888]">
              Custom Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details, scope, deliverables..."
              rows={4}
              className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {submitting ? "Creating..." : "Create Proposal"}
          </button>
          <button
            type="button"
            onClick={handleAiDraft}
            disabled={aiLoading}
            className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-[#F5C542] transition-colors hover:bg-[#111] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {aiLoading ? "Drafting..." : "AI Draft"}
          </button>
          <Link
            href="/proposals"
            className="rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#888] transition hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* AI Report Preview */}
      {aiJobId && (
        <InlineReportPreview jobId={aiJobId} autoExpand showStatusBar />
      )}
    </div>
  );
}
