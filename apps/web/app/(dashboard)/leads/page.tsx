"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, DollarSign, Clock, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { createLead, updateLeadStage } from "../../actions";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { useCompany } from "@/lib/company-context";
import Pagination from "@/components/Pagination";

// ─── Types ──────────────────────────────────────────────────────────────────

type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

interface LeadRow {
  id: string;
  contact_name: string;
  contact_email: string;
  source: string | null;
  stage: LeadStage;
  score: number;
  assigned_agent: string | null;
  expected_value: number | null;
  notes: string | null;
  created_at: string;
}

const columns: { key: LeadStage; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#4FC3F7" },
  { key: "contacted", label: "Contacted", color: "#F5C542" },
  { key: "qualified", label: "Qualified", color: "#22c55e" },
  { key: "proposal", label: "Proposal", color: "#eab308" },
  { key: "negotiation", label: "Negotiation", color: "#f97316" },
  { key: "won", label: "Won", color: "#22c55e" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const router = useRouter();
  const orgId = useOrgId();
  const { companyId } = useCompany();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  const fetchLeads = useCallback(async () => {
    const db = createClient();
    let query = db
      .from("leads")
      .select("id, contact_name, contact_email, source, stage, score, assigned_agent, expected_value, notes, created_at", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (companyId) query = query.eq("company_id", companyId);
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data, error, count } = await query;

    if (!error && data) {
      setLeads(data as LeadRow[]);
    }
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [orgId, companyId, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getLeadsForStage = (stage: LeadStage) =>
    leads.filter((l) => l.stage === stage);

  const totalPipelineValue = leads
    .filter((l) => l.stage !== "lost")
    .reduce((sum, l) => sum + (l.expected_value ?? 0), 0);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l)),
    );

    const result = await updateLeadStage(leadId, targetStage);
    if (result.success) {
      toast.success(`Lead moved to ${targetStage}`);

      // Auto-create draft proposal when lead moves to proposal stage
      if (targetStage === "proposal" && lead) {
        const db = createClient();
        const { data: proposal } = await db.from("proposals").insert({
          organization_id: orgId,
          lead_id: lead.id,
          title: `Proposal for ${lead.contact_name || "Client"}`,
          status: "draft",
          content: {
            auto_generated: true,
            lead_score: lead.score,
            source: lead.source,
            services_requested: [],
            note: "Auto-generated when lead moved to proposal stage. Review and customize before sending.",
          },
        }).select("id").single();

        if (proposal) {
          toast.success("Draft proposal created", {
            description: lead.contact_name || "Client",
            action: {
              label: "View",
              onClick: () => router.push(`/proposals/${proposal.id}`),
            },
          });
        }
      }
    } else {
      toast.error("Failed to update lead stage");
      // Revert on failure
      fetchLeads();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCreateLead = async (formData: FormData) => {
    setFormError(null);
    const result = await createLead(formData);
    if (result.success) {
      toast.success("Lead created");
      setShowAddModal(false);
      fetchLeads();
    } else {
      toast.error(result.error || "Failed to create lead");
      setFormError(result.error);
    }
  };

  function daysSinceCreated(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading leads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads Pipeline</h1>
          <p className="mt-1 text-sm text-[#888]">
            {leads.length} leads &middot; Pipeline value:{" "}
            <span className="text-[#22c55e]">
              ${totalPipelineValue.toLocaleString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(!showAddModal)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">New Lead</h3>
          <form action={handleCreateLead} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="organization_id" value={orgId} />
            <input type="hidden" name="company_id" value={orgId} />
            <div>
              <label className="text-xs text-[#888] block mb-1">Contact Name *</label>
              <input name="contact_name" required className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Email *</label>
              <input name="contact_email" type="email" required className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none" placeholder="jane@company.com" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Phone</label>
              <input name="contact_phone" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none" placeholder="+1234567890" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Source</label>
              <select name="source" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none">
                <option value="">Select source</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="cold_outreach">Cold Outreach</option>
                <option value="conference">Conference</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Expected Value ($)</label>
              <input name="expected_value" type="number" min="0" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none" placeholder="10000" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Notes</label>
              <input name="notes" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none" placeholder="Interested in AI integration..." />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="submit" className="rounded-lg bg-[#4FC3F7] px-4 py-2 text-sm font-medium text-white hover:bg-[#38B2D8]">
                Create Lead
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#888] hover:text-white">
                Cancel
              </button>
              {formError && <p className="text-sm text-[#ef4444]">{formError}</p>}
            </div>
          </form>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        onPageChange={setPage}
      />

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnLeads = getLeadsForStage(column.key);
          return (
            <div
              key={column.key}
              className="w-[280px] shrink-0 rounded-xl border border-[#222] bg-[#0a0a0a]"
              onDrop={(e) => handleDrop(e, column.key)}
              onDragOver={handleDragOver}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-[#222] p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <span className="text-sm font-semibold text-white">
                    {column.label}
                  </span>
                  <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#888]">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3 p-3" role="list" aria-label={`${column.label} - ${columnLeads.length} leads`}>
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${lead.contact_name}${lead.expected_value ? `, $${lead.expected_value.toLocaleString()}` : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        router.push(`/leads/${lead.id}`);
                      } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                        next?.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = e.currentTarget.previousElementSibling as HTMLElement | null;
                        prev?.focus();
                      }
                    }}
                    className="group cursor-grab rounded-lg border border-[#222] bg-[#111] p-3.5 transition-all hover:border-[#333] active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-[#4FC3F7]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#666]" />
                        <span className="text-sm font-medium text-white">
                          {lead.contact_name}
                        </span>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4 text-[#666]" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-[#888]">
                      {lead.contact_email}
                    </p>
                    {lead.score > 0 && (
                      <p className="mt-1 text-xs text-[#888]">
                        Score: <span className={lead.score > 70 ? "text-[#22c55e]" : lead.score > 50 ? "text-[#eab308]" : "text-[#888]"}>{lead.score}</span>
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      {lead.expected_value && lead.expected_value > 0 ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-[#22c55e]" />
                          <span className="text-sm font-medium text-[#22c55e]">
                            ${lead.expected_value.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-1 text-[#666]">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{daysSinceCreated(lead.created_at)}d</span>
                      </div>
                    </div>
                    {lead.source && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-[#888]">
                          {lead.source}
                        </span>
                        {lead.assigned_agent && (
                          <span className="rounded-md bg-[#4FC3F715] px-2 py-0.5 text-[10px] font-medium text-[#4FC3F7]">
                            {lead.assigned_agent}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {columnLeads.length === 0 && (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-[#222] py-8">
                    <p className="text-xs text-[#666]">No leads</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
