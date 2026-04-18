"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Send,
  Pause,
  Play,
  XCircle,
  Users,
  Mail,
  MousePointerClick,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
  UserCheck,
  UserX,
  Sparkles,
} from "lucide-react";
import { InlineReportPreview } from "@/components/InlineReportPreview";
import { pauseCampaign, resumeCampaign } from "../../../actions";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignDetail {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  template: Record<string, unknown>;
  schedule: Record<string, unknown>;
  stats: {
    contacts?: number;
    sent?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
    replied?: number;
  };
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ConsentRow {
  contact_id: string;
  channel: string;
  status: string;
}

interface OutreachRow {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  content: string | null;
  created_at: string;
}

// ─── Supabase ───────────────────────────────────────────────────────────────

function getClientDb() {
  return createClient();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusColors: Record<string, { text: string; bg: string }> = {
  draft: { text: "#888", bg: "#88888815" },
  active: { text: "#22c55e", bg: "#22c55e15" },
  paused: { text: "#eab308", bg: "#eab30815" },
  completed: { text: "#4FC3F7", bg: "#4FC3F715" },
  cancelled: { text: "#ef4444", bg: "#ef444415" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const orgId = useOrgId();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [events, setEvents] = useState<OutreachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const db = getClientDb();

    const [campaignResult, eventsResult] = await Promise.all([
      db
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .eq("organization_id", orgId)
        .single(),
      db
        .from("outreach_events")
        .select("id, contact_id, channel, status, content, created_at")
        .eq("organization_id", orgId)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (campaignResult.data) {
      setCampaign(campaignResult.data as CampaignDetail);
    }

    const eventsData = (eventsResult.data ?? []) as OutreachRow[];
    setEvents(eventsData);

    // Fetch contacts and consent for those contacts
    const contactIds = [...new Set(eventsData.map((e) => e.contact_id).filter(Boolean))];
    if (contactIds.length > 0) {
      const [contactsResult, consentsResult] = await Promise.all([
        db
          .from("contacts")
          .select("id, first_name, last_name, email")
          .in("id", contactIds),
        db
          .from("consent_records")
          .select("contact_id, channel, status")
          .in("contact_id", contactIds),
      ]);
      setContacts((contactsResult.data ?? []) as ContactRow[]);
      setConsents((consentsResult.data ?? []) as ConsentRow[]);
    }

    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePause = async () => {
    setActing(true);
    const result = await pauseCampaign(campaignId);
    setActing(false);
    if (result.success) {
      toast.success("Campaign paused");
      fetchData();
    } else {
      toast.error(`Error: ${result.error}`);
    }
  };

  const handleResume = async () => {
    setActing(true);
    const result = await resumeCampaign(campaignId);
    setActing(false);
    if (result.success) {
      toast.success("Campaign resumed");
      fetchData();
    } else {
      toast.error(`Error: ${result.error}`);
    }
  };

  const handleCancel = async () => {
    setActing(true);
    const db = getClientDb();
    await db
      .from("campaigns")
      .update({ status: "cancelled" })
      .eq("id", campaignId)
      .eq("organization_id", orgId);
    setActing(false);
    toast.success("Campaign cancelled");
    fetchData();
  };

  const handleAiWrite = async () => {
    if (!campaign) return;
    setAiLoading(true);
    try {
      const db = getClientDb();
      const { data: job } = await db.from("audit_jobs").insert({
        organization_id: orgId,
        job_type: "custom",
        status: "queued",
        input_payload: {
          message: `Write an email for campaign ${campaign.name}, type ${campaign.campaign_type}. Generate: subject line variants, email body, and CTA suggestions.`,
          campaign_id: campaign.id,
        },
        target_entity_id: campaign.id,
        target_entity_type: "campaign",
        external_system: "openclaw",
        started_at: new Date().toISOString(),
      }).select("id").single();

      if (job?.id) {
        setAiJobId(job.id);
        fetch("/api/openclaw/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer vos-hooks-token-2026" },
          body: JSON.stringify({
            agent_id: "main",
            message: `Write an email for campaign ${campaign.name}, type ${campaign.campaign_type}. Generate: subject line variants, email body, and CTA suggestions.`,
            organization_id: orgId,
            job_id: job.id,
            context: { source: "campaign_detail", campaign_id: campaign.id },
          }),
        });
      }
    } catch (err) {
      console.error("AI Write error:", err);
    }
    setAiLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[#888]">Campaign not found</p>
        <Link
          href="/campaigns"
          className="text-[#4FC3F7] hover:underline text-sm"
        >
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const sc = statusColors[campaign.status] ?? statusColors.draft;
  const stats = campaign.stats ?? {};

  // Consent checks
  const consentMap: Record<string, string> = {};
  for (const c of consents) {
    consentMap[c.contact_id] = c.status;
  }
  const optedIn = Object.values(consentMap).filter(
    (s) => s === "granted" || s === "opted_in"
  ).length;
  const optedOut = Object.values(consentMap).filter(
    (s) => s === "revoked" || s === "opted_out"
  ).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/campaigns"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
              style={{ color: sc.text, backgroundColor: sc.bg }}
            >
              {campaign.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#888]">
            {campaign.campaign_type} campaign &middot; Created{" "}
            {formatDate(campaign.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAiWrite}
            disabled={aiLoading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {aiLoading ? "Generating..." : "AI Write"}
          </button>
          {campaign.status === "active" && (
            <button
              onClick={handlePause}
              disabled={acting}
              className="flex items-center gap-2 rounded-lg border border-[#eab308] px-4 py-2.5 text-sm font-medium text-[#eab308] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={handleResume}
              disabled={acting}
              className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}
          {(campaign.status === "active" || campaign.status === "paused") && (
            <button
              onClick={handleCancel}
              disabled={acting}
              className="flex items-center gap-2 rounded-lg border border-[#ef4444] px-4 py-2.5 text-sm font-medium text-[#ef4444] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* AI Report Preview */}
      {aiJobId && <InlineReportPreview jobId={aiJobId} autoExpand showStatusBar />}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Sent", value: stats.sent ?? 0, icon: Mail, color: "#4FC3F7" },
          { label: "Opened", value: stats.opened ?? 0, icon: Mail, color: "#22c55e" },
          { label: "Clicked", value: stats.clicked ?? 0, icon: MousePointerClick, color: "#F5C542" },
          { label: "Replied", value: stats.replied ?? 0, icon: Send, color: "#eab308" },
          { label: "Bounced", value: stats.bounced ?? 0, icon: AlertTriangle, color: "#ef4444" },
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact List */}
        <div className="lg:col-span-2 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Contacts</h3>
            <span className="rounded-full bg-[#1a1a1a] px-2.5 py-0.5 text-xs text-[#888]">
              {contacts.length}
            </span>
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm text-[#666]">No contacts in this campaign.</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => {
                const consent = consentMap[c.id];
                const isOptedIn =
                  consent === "granted" || consent === "opted_in";
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]">
                        <Users className="h-3.5 w-3.5 text-[#666]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {c.first_name} {c.last_name}
                        </p>
                        <p className="text-xs text-[#888]">{c.email}</p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{
                        color: isOptedIn ? "#22c55e" : "#ef4444",
                        backgroundColor: isOptedIn ? "#22c55e15" : "#ef444415",
                      }}
                    >
                      {isOptedIn ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <UserX className="h-3 w-3" />
                      )}
                      {isOptedIn ? "Opted In" : "Opted Out"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Compliance + Campaign Info */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-[#666]">Type</p>
                <p className="text-white capitalize">{campaign.campaign_type}</p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Template</p>
                <p className="text-[#888]">
                  {(campaign.template as { subject?: string })?.subject ?? "Default template"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Schedule</p>
                <p className="text-[#888]">
                  {(campaign.schedule as { frequency?: string })?.frequency ?? "Manual"}
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Summary */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-5 w-5 text-[#22c55e]" />
              <h3 className="text-lg font-semibold text-white">Compliance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3">
                <span className="text-sm text-[#888]">Consent checks passed</span>
                <span className="text-sm font-medium text-[#22c55e]">
                  {optedIn}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3">
                <span className="text-sm text-[#888]">Suppression list hits</span>
                <span className="text-sm font-medium text-[#ef4444]">
                  {optedOut}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3">
                <span className="text-sm text-[#888]">Quiet hour delays</span>
                <span className="text-sm font-medium text-[#eab308]">
                  {(campaign.metadata as { quiet_hour_delays?: number })?.quiet_hour_delays ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outreach Events Timeline */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <h3 className="text-lg font-semibold text-white mb-4">
          Outreach Timeline
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-[#666]">No outreach events yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const contact = contacts.find((c) => c.id === ev.contact_id);
              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg bg-[#111] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]">
                      <Mail className="h-3.5 w-3.5 text-[#666]" />
                    </div>
                    <div>
                      <p className="text-sm text-white">
                        <span className="capitalize font-medium">
                          {ev.status}
                        </span>{" "}
                        via{" "}
                        <span className="text-[#888]">{ev.channel}</span>
                      </p>
                      <p className="text-xs text-[#666]">
                        {contact
                          ? `${contact.first_name} ${contact.last_name}`
                          : "Unknown contact"}{" "}
                        &middot; {formatDateTime(ev.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
