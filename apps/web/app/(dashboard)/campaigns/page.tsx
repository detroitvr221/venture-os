"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  Plus,
  Filter,
  ChevronRight,
  Users,
  Mail,
  BarChart3,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  MessageSquare,
} from "lucide-react";
import { createCampaign } from "../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignRow {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  stats: {
    contacts?: number;
    sent?: number;
    opened?: number;
    replied?: number;
    bounced?: number;
  };
  created_at: string;
}

type StatusFilter = "all" | "draft" | "active" | "paused" | "completed";

// ─── Supabase ───────────────────────────────────────────────────────────────

function getClientDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusConfig: Record<string, { text: string; bg: string; icon: typeof Clock }> = {
  draft: { text: "#888", bg: "#88888815", icon: Clock },
  active: { text: "#22c55e", bg: "#22c55e15", icon: Play },
  paused: { text: "#eab308", bg: "#eab30815", icon: Pause },
  completed: { text: "#3b82f6", bg: "#3b82f615", icon: CheckCircle2 },
  cancelled: { text: "#ef4444", bg: "#ef444415", icon: CheckCircle2 },
};

const typeLabels: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  call: "Call",
  multi_channel: "Multi-channel",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("email");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    const db = getClientDb();
    const { data } = await db
      .from("campaigns")
      .select("id, name, campaign_type, status, stats, created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false });
    setCampaigns((data ?? []) as CampaignRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!formName.trim()) {
      setFormError("Campaign name is required");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("name", formName.trim());
    formData.set("campaign_type", formType);

    const result = await createCampaign(formData);
    setSubmitting(false);

    if (result.success) {
      setShowCreate(false);
      setFormName("");
      setFormType("email");
      fetchData();
    } else {
      setFormError(result.error);
    }
  };

  const filtered =
    filter === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filter);

  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "active").length,
    totalContacts: campaigns.reduce(
      (s, c) => s + (c.stats?.contacts ?? 0),
      0
    ),
    totalSent: campaigns.reduce((s, c) => s + (c.stats?.sent ?? 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-[#888]">
            {stats.total} campaigns &middot; {stats.active} active &middot;{" "}
            {stats.totalSent} emails sent
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Campaigns", value: stats.total, icon: Send, color: "#3b82f6" },
          { label: "Active", value: stats.active, icon: Play, color: "#22c55e" },
          { label: "Total Contacts", value: stats.totalContacts, icon: Users, color: "#8b5cf6" },
          { label: "Emails Sent", value: stats.totalSent, icon: Mail, color: "#eab308" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#888]">{s.label}</p>
                <Icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Create Campaign Form */}
      {showCreate && (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">
            New Campaign
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#888] block mb-1">
                Campaign Name *
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#3b82f6] focus:outline-none"
                placeholder="Q2 Re-engagement Campaign"
              />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#3b82f6] focus:outline-none"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="call">Call</option>
                <option value="multi_channel">Multi-channel</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2563eb] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Campaign"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setFormError(null);
              }}
              className="rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#888] hover:text-white"
            >
              Cancel
            </button>
            {formError && (
              <p className="text-sm text-[#ef4444]">{formError}</p>
            )}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#666]" />
        {(
          ["all", "draft", "active", "paused", "completed"] as StatusFilter[]
        ).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? "bg-[#1a1a1a] text-white"
                : "text-[#666] hover:text-[#999]"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Send className="mx-auto h-8 w-8 text-[#333]" />
              <p className="mt-3 text-sm text-[#666]">No campaigns found</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Campaign
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Contacts
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Sent / Opened / Replied
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Created
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const sc = statusConfig[c.status] ?? statusConfig.draft;
                const Icon = sc.icon;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-sm font-medium text-white hover:text-[#3b82f6] transition-colors"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {typeLabels[c.campaign_type] ?? c.campaign_type}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize"
                        style={{ color: sc.text, backgroundColor: sc.bg }}
                      >
                        <Icon className="h-3 w-3" />
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {c.stats?.contacts ?? 0}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      <span className="text-white">
                        {c.stats?.sent ?? 0}
                      </span>{" "}
                      /{" "}
                      <span className="text-[#22c55e]">
                        {c.stats?.opened ?? 0}
                      </span>{" "}
                      /{" "}
                      <span className="text-[#3b82f6]">
                        {c.stats?.replied ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/campaigns/${c.id}`}>
                        <ChevronRight className="h-4 w-4 text-[#666] hover:text-white transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
