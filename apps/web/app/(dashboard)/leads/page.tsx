"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Building2, DollarSign, Clock } from "lucide-react";

type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

interface Lead {
  id: string;
  company: string;
  contact: string;
  value: string;
  stage: LeadStage;
  daysInStage: number;
  tags: string[];
}

const columns: { key: LeadStage; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#3b82f6" },
  { key: "contacted", label: "Contacted", color: "#8b5cf6" },
  { key: "qualified", label: "Qualified", color: "#22c55e" },
  { key: "proposal", label: "Proposal", color: "#eab308" },
  { key: "negotiation", label: "Negotiation", color: "#f97316" },
  { key: "won", label: "Won", color: "#22c55e" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

const initialLeads: Lead[] = [
  {
    id: "1",
    company: "TechFlow Inc.",
    contact: "Sarah Chen",
    value: "$45,000",
    stage: "new",
    daysInStage: 1,
    tags: ["Enterprise", "AI"],
  },
  {
    id: "2",
    company: "Meridian Health",
    contact: "Dr. James Wilson",
    value: "$120,000",
    stage: "new",
    daysInStage: 3,
    tags: ["Healthcare", "Web"],
  },
  {
    id: "3",
    company: "GreenLeaf Co.",
    contact: "Emily Santos",
    value: "$28,000",
    stage: "contacted",
    daysInStage: 5,
    tags: ["SMB", "SEO"],
  },
  {
    id: "4",
    company: "Atlas Robotics",
    contact: "Mike Torres",
    value: "$200,000",
    stage: "contacted",
    daysInStage: 2,
    tags: ["Enterprise", "Integration"],
  },
  {
    id: "5",
    company: "Vertex Solutions",
    contact: "Rachel Park",
    value: "$85,000",
    stage: "qualified",
    daysInStage: 7,
    tags: ["Mid-Market", "AI"],
  },
  {
    id: "6",
    company: "CloudSync Ltd.",
    contact: "David Kim",
    value: "$150,000",
    stage: "proposal",
    daysInStage: 4,
    tags: ["Enterprise", "SaaS"],
  },
  {
    id: "7",
    company: "NovaPay",
    contact: "Lisa Morgan",
    value: "$95,000",
    stage: "proposal",
    daysInStage: 6,
    tags: ["FinTech", "Integration"],
  },
  {
    id: "8",
    company: "Pinnacle Media",
    contact: "Alex Rivera",
    value: "$60,000",
    stage: "negotiation",
    daysInStage: 3,
    tags: ["Media", "Web"],
  },
  {
    id: "9",
    company: "BrightPath Education",
    contact: "Karen Wu",
    value: "$35,000",
    stage: "won",
    daysInStage: 0,
    tags: ["Education", "SEO"],
  },
  {
    id: "10",
    company: "Ironclad Security",
    contact: "Tom Bradley",
    value: "$75,000",
    stage: "lost",
    daysInStage: 0,
    tags: ["Security", "Enterprise"],
  },
];

export default function LeadsPage() {
  const [leads] = useState<Lead[]>(initialLeads);
  const [showAddModal, setShowAddModal] = useState(false);

  const getLeadsForStage = (stage: LeadStage) =>
    leads.filter((l) => l.stage === stage);

  const totalPipelineValue = leads
    .filter((l) => l.stage !== "lost")
    .reduce(
      (sum, l) => sum + parseInt(l.value.replace(/[$,]/g, "")),
      0
    );

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
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => {
          const columnLeads = getLeadsForStage(column.key);
          return (
            <div
              key={column.key}
              className="w-[280px] shrink-0 rounded-xl border border-[#222] bg-[#0a0a0a]"
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
              <div className="space-y-3 p-3">
                {columnLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="group rounded-lg border border-[#222] bg-[#111] p-3.5 transition-all hover:border-[#333]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#666]" />
                        <span className="text-sm font-medium text-white">
                          {lead.company}
                        </span>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4 text-[#666]" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-[#888]">
                      {lead.contact}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-[#22c55e]" />
                        <span className="text-sm font-medium text-[#22c55e]">
                          {lead.value}
                        </span>
                      </div>
                      {lead.daysInStage > 0 && (
                        <div className="flex items-center gap-1 text-[#666]">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">{lead.daysInStage}d</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {lead.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-[#888]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
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
