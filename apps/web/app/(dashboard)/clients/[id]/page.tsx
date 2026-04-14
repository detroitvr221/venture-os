"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TableSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import CallModal from "@/components/CallModal";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  FolderKanban,
  FileText,
  Activity,
  Shield,
  PhoneCall,
  Globe,
  Plus,
  Send,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  DollarSign,
  AlertCircle,
  ChevronRight,
  Link2,
  Copy,
  Check,
  X as XIcon,
  Sparkles,
} from "lucide-react";
import { InlineReportPreview } from "@/components/InlineReportPreview";

// ─── Types ──────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string | null;
  amount: number;
  status: string;
  due_date: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  actor_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  resource_type: string | null;
};

type EmailRecord = {
  id: string;
  subject: string | null;
  from_address: string;
  to_addresses: string[];
  direction: string;
  received_at: string;
};

type WebsiteAudit = {
  id: string;
  url: string | null;
  score: number | null;
  findings_count: number | null;
  created_at: string;
  websites?: { url: string } | null;
};

type CallLog = {
  id: string;
  phone_number: string;
  direction: string;
  duration: number | null;
  status: string;
  transcript: string | null;
  created_at: string;
};

type TabKey = "activity" | "projects" | "invoices" | "emails" | "audits" | "calls";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const statusColors: Record<string, string> = {
  active: "bg-[#10b981]/20 text-[#10b981]",
  inactive: "bg-[#666]/20 text-[#666]",
  lead: "bg-[#f59e0b]/20 text-[#f59e0b]",
  churned: "bg-[#ef4444]/20 text-[#ef4444]",
  planning: "bg-[#f59e0b]/20 text-[#f59e0b]",
  on_hold: "bg-[#888]/20 text-[#888]",
  completed: "bg-[#10b981]/20 text-[#10b981]",
  cancelled: "bg-[#ef4444]/20 text-[#ef4444]",
  paid: "bg-[#10b981]/20 text-[#10b981]",
  sent: "bg-[#4FC3F7]/20 text-[#4FC3F7]",
  overdue: "bg-[#ef4444]/20 text-[#ef4444]",
  draft: "bg-[#666]/20 text-[#666]",
};

// ─── Tab definitions ────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "activity", label: "Activity", icon: Activity },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "audits", label: "Audits", icon: Shield },
  { key: "calls", label: "Calls", icon: PhoneCall },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("activity");
  const [tabLoading, setTabLoading] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showPortalLink, setShowPortalLink] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Tab data
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [websiteAudits, setWebsiteAudits] = useState<WebsiteAudit[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  // ── Load client ────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadClient() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();
      setClient(data);
      setLoading(false);
    }
    loadClient();
  }, [clientId]);

  // ── Tab data loaders ───────────────────────────────────────────────────

  const loadActivity = useCallback(async () => {
    setTabLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, actor_email, details, created_at, resource_type")
      .or(`resource_id.eq.${clientId},resource_type.eq.client`)
      .order("created_at", { ascending: false })
      .limit(50);
    setAuditLogs(data || []);
    setTabLoading(false);
  }, [clientId]);

  const loadProjects = useCallback(async () => {
    setTabLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, name, status, budget, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setProjects(data || []);
    setTabLoading(false);
  }, [clientId]);

  const loadInvoices = useCallback(async () => {
    setTabLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, amount, status, due_date")
      .eq("client_id", clientId)
      .order("due_date", { ascending: false });
    setInvoices(data || []);
    setTabLoading(false);
  }, [clientId]);

  const loadEmails = useCallback(async () => {
    setTabLoading(true);
    const supabase = createClient();

    // First get this client's contact emails
    const contactEmails: string[] = [];
    if (client?.email) contactEmails.push(client.email);

    const { data: contacts } = await supabase
      .from("contacts")
      .select("email")
      .eq("client_id", clientId);

    if (contacts) {
      for (const c of contacts) {
        if (c.email && !contactEmails.includes(c.email)) {
          contactEmails.push(c.email);
        }
      }
    }

    if (contactEmails.length === 0) {
      setEmails([]);
      setTabLoading(false);
      return;
    }

    // Match emails where from or to includes any contact email
    const orFilters = contactEmails
      .map((e) => `from_address.eq.${e}`)
      .join(",");

    const { data } = await supabase
      .from("emails")
      .select("id, subject, from_address, to_addresses, direction, received_at")
      .or(orFilters)
      .order("received_at", { ascending: false })
      .limit(50);

    // Also check to_addresses (array column) client-side
    let results = data || [];
    if (data) {
      const { data: toData } = await supabase
        .from("emails")
        .select("id, subject, from_address, to_addresses, direction, received_at")
        .order("received_at", { ascending: false })
        .limit(200);

      if (toData) {
        const existingIds = new Set(results.map((e) => e.id));
        const additional = toData.filter(
          (e) =>
            !existingIds.has(e.id) &&
            e.to_addresses?.some((addr: string) =>
              contactEmails.some((ce) => addr.toLowerCase().includes(ce.toLowerCase()))
            )
        );
        results = [...results, ...additional]
          .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
          .slice(0, 50);
      }
    }

    setEmails(results);
    setTabLoading(false);
  }, [clientId, client?.email]);

  const loadAudits = useCallback(async () => {
    setTabLoading(true);
    const supabase = createClient();

    // Get websites for this client, then join audits
    const { data: websites } = await supabase
      .from("websites")
      .select("id, url")
      .eq("client_id", clientId);

    if (!websites || websites.length === 0) {
      setWebsiteAudits([]);
      setTabLoading(false);
      return;
    }

    const websiteIds = websites.map((w) => w.id);
    const { data } = await supabase
      .from("website_audits")
      .select("id, url, score, findings_count, created_at, website_id")
      .in("website_id", websiteIds)
      .order("created_at", { ascending: false });

    const enriched = (data || []).map((audit) => ({
      ...audit,
      websites: websites.find((w) => w.id === audit.website_id) || null,
    }));

    setWebsiteAudits(enriched);
    setTabLoading(false);
  }, [clientId]);

  const loadCalls = useCallback(async () => {
    setTabLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("call_logs")
      .select("id, phone_number, direction, duration, status, transcript, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setCallLogs(data || []);
    setTabLoading(false);
  }, [clientId]);

  // ── AI Health Check ────────────────────────────────────────────────────

  const handleAiHealthCheck = async () => {
    if (!client) return;
    setAiLoading(true);
    try {
      const supabase = createClient();
      const orgRes = await supabase.from("organization_members").select("organization_id").limit(1).single();
      const orgId = orgRes.data?.organization_id || "00000000-0000-0000-0000-000000000001";

      const { data: job } = await supabase.from("audit_jobs").insert({
        organization_id: orgId,
        job_type: "custom",
        status: "queued",
        input_payload: {
          message: `Analyze client health for ${client.name}. Check engagement, project activity, payment status. Score 0-100 with risk factors and recommendations.`,
          client_id: client.id,
        },
        target_entity_id: client.id,
        target_entity_type: "client",
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
            message: `Analyze client health for ${client.name}. Check engagement, project activity, payment status. Score 0-100 with risk factors and recommendations.`,
            organization_id: orgId,
            job_id: job.id,
            context: { source: "client_detail", client_id: client.id },
          }),
        });
      }
    } catch (err) {
      console.error("AI Health Check error:", err);
    }
    setAiLoading(false);
  };

  // ── Generate Portal Link ───────────────────────────────────────────────

  const generatePortalLink = useCallback(async () => {
    setPortalLoading(true);
    const supabase = createClient();

    // Generate a secure random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Set expiry to 90 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const { error } = await supabase.from("portal_tokens").insert({
      client_id: clientId,
      token,
      active: true,
      expires_at: expiresAt.toISOString(),
    });

    if (!error) {
      const url = `https://www.thenorthbridgemi.com/portal/${token}`;
      setPortalUrl(url);
      setShowPortalLink(true);
    }
    setPortalLoading(false);
  }, [clientId]);

  const copyPortalLink = useCallback(() => {
    if (portalUrl) {
      navigator.clipboard.writeText(portalUrl);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2000);
    }
  }, [portalUrl]);

  // ── Load tab data on tab change ────────────────────────────────────────

  useEffect(() => {
    if (!client) return;
    switch (activeTab) {
      case "activity":
        loadActivity();
        break;
      case "projects":
        loadProjects();
        break;
      case "invoices":
        loadInvoices();
        break;
      case "emails":
        loadEmails();
        break;
      case "audits":
        loadAudits();
        break;
      case "calls":
        loadCalls();
        break;
    }
  }, [activeTab, client, loadActivity, loadProjects, loadInvoices, loadEmails, loadAudits, loadCalls]);

  // ── Loading / Not Found ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <TableSkeleton />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-16 text-center">
        <p className="text-[#666]">Client not found</p>
        <Link href="/clients" className="mt-2 inline-block text-sm text-[#4FC3F7]">
          Back to clients
        </Link>
      </div>
    );
  }

  // ── Invoice stats ──────────────────────────────────────────────────────

  const totalOutstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back button */}
      <Link
        href="/clients"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[#888] transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: name + info */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#4FC3F7]/20">
              <Building2 className="h-7 w-7 text-[#4FC3F7]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                    statusColors[client.status] || "bg-[#666]/20 text-[#666]"
                  }`}
                >
                  {client.status}
                </span>
              </div>
              {(client.company || client.industry) && (
                <p className="mt-0.5 text-sm text-[#888]">
                  {client.company}
                  {client.company && client.industry && " -- "}
                  {client.industry}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#888]">
                {client.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#666]" />
                    {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#666]" />
                    {client.phone}
                  </span>
                )}
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#4FC3F7] hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {client.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right: quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAiHealthCheck}
              disabled={aiLoading}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? "Checking..." : "AI Health Check"}
            </button>
            <button
              onClick={generatePortalLink}
              disabled={portalLoading}
              className="flex items-center gap-2 rounded-lg border border-[#4FC3F7]/30 bg-[#4FC3F7]/10 px-3 py-2 text-sm text-[#4FC3F7] transition hover:bg-[#4FC3F7]/20 disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              {portalLoading ? "Generating..." : "Portal Link"}
            </button>
            <Link
              href={`/email/compose?to=${client.email || ""}`}
              className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222] hover:text-white"
            >
              <Send className="h-3.5 w-3.5" /> Send Email
            </Link>
            <button
              onClick={() => setShowCallModal(true)}
              className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] transition hover:bg-[#222] hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" /> Make Call
            </button>
            <Link
              href={`/projects?client=${clientId}`}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Create Project
            </Link>
          </div>
        </div>
      </div>

      {/* ── Portal Link Banner ─────────────────────────────────────────── */}
      {showPortalLink && portalUrl && (
        <div className="mb-6 rounded-xl border border-[#4FC3F7]/30 bg-[#4FC3F7]/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4FC3F7]/20">
                <Link2 className="h-4 w-4 text-[#4FC3F7]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Client Portal Link Generated</p>
                <p className="mt-1 text-xs text-[#888]">Share this link with {client.name}. Expires in 90 days.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="block truncate rounded bg-[#0a0a0a] px-3 py-1.5 text-xs text-[#4FC3F7] max-w-[400px]">
                    {portalUrl}
                  </code>
                  <button
                    onClick={copyPortalLink}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#ccc] transition hover:bg-[#222] hover:text-white"
                  >
                    {portalCopied ? (
                      <>
                        <Check className="h-3 w-3 text-[#10b981]" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPortalLink(false)}
              className="shrink-0 rounded p-1 text-[#666] transition hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── AI Health Check Preview ─────────────────────────────────────── */}
      {aiJobId && (
        <div className="mb-6">
          <InlineReportPreview jobId={aiJobId} autoExpand showStatusBar />
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-[#222] pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-[#4FC3F7] text-[#4FC3F7]"
                  : "border-transparent text-[#888] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="min-h-[400px]">
        {tabLoading ? (
          <TableSkeleton />
        ) : (
          <>
            {/* ── Activity Tab ──────────────────────────────────────────── */}
            {activeTab === "activity" && (
              <>
                {auditLogs.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No activity yet"
                    description="Actions related to this client will appear here."
                  />
                ) : (
                  <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
                    <div className="divide-y divide-[#1a1a1a]">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-4 px-5 py-4">
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4FC3F7]/10">
                            <Activity className="h-3.5 w-3.5 text-[#4FC3F7]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {log.action}
                              </span>
                              {log.resource_type && (
                                <span className="rounded-full bg-[#222] px-2 py-0.5 text-[10px] text-[#666]">
                                  {log.resource_type}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-[#888]">
                              {log.actor_email || "System"}
                              {log.details && typeof log.details === "object" && (
                                <span className="ml-2 text-[#666]">
                                  {JSON.stringify(log.details).slice(0, 100)}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#666]">
                            {timeAgo(log.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Projects Tab ──────────────────────────────────────────── */}
            {activeTab === "projects" && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-[#888]">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
                  <Link
                    href={`/projects?client=${clientId}`}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    <Plus className="h-3 w-3" /> New Project
                  </Link>
                </div>
                {projects.length === 0 ? (
                  <EmptyState
                    icon={FolderKanban}
                    title="No projects yet"
                    description="Create a project to get started with this client."
                  />
                ) : (
                  <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a1a]">
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Name</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Status</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Budget</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Created</th>
                          <th className="px-5 py-3.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => (
                          <tr
                            key={project.id}
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="cursor-pointer border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                          >
                            <td className="px-5 py-4 text-sm font-medium text-white">
                              {project.name}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                  statusColors[project.status] || "bg-[#666]/20 text-[#666]"
                                }`}
                              >
                                {project.status.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-[#888]">
                              {project.budget ? formatCurrency(project.budget) : "--"}
                            </td>
                            <td className="px-5 py-4 text-sm text-[#888]">
                              {new Date(project.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <ChevronRight className="h-4 w-4 text-[#444]" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Invoices Tab ─────────────────────────────────────────── */}
            {activeTab === "invoices" && (
              <>
                {totalOutstanding > 0 && (
                  <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3">
                    <DollarSign className="h-5 w-5 text-[#f59e0b]" />
                    <div>
                      <p className="text-sm font-medium text-[#f59e0b]">
                        {formatCurrency(totalOutstanding)} outstanding
                      </p>
                      <p className="text-xs text-[#f59e0b]/70">
                        {invoices.filter((i) => i.status === "sent" || i.status === "overdue").length} unpaid invoice{invoices.filter((i) => i.status === "sent" || i.status === "overdue").length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}
                {invoices.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No invoices yet"
                    description="Invoices for this client will appear here."
                  />
                ) : (
                  <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a1a]">
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Invoice #</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Amount</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Status</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr
                            key={inv.id}
                            onClick={() => router.push(`/billing/invoices/${inv.id}`)}
                            className="cursor-pointer border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                          >
                            <td className="px-5 py-4 text-sm font-medium text-white">
                              {inv.invoice_number || `INV-${inv.id.slice(0, 6)}`}
                            </td>
                            <td className="px-5 py-4 text-sm text-white font-mono">
                              {formatCurrency(inv.amount)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                  statusColors[inv.status] || "bg-[#666]/20 text-[#666]"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-[#888]">
                              {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Emails Tab ───────────────────────────────────────────── */}
            {activeTab === "emails" && (
              <>
                {emails.length === 0 ? (
                  <EmptyState
                    icon={Mail}
                    title="No emails found"
                    description="Emails to and from this client's contacts will appear here."
                  />
                ) : (
                  <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a1a]">
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Date</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Subject</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">From</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Direction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emails.map((email) => (
                          <tr
                            key={email.id}
                            onClick={() => router.push(`/email/${email.id}`)}
                            className="cursor-pointer border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                          >
                            <td className="px-5 py-4 text-sm text-[#888]">
                              {timeAgo(email.received_at)}
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-white max-w-[300px] truncate">
                              {email.subject || "(No Subject)"}
                            </td>
                            <td className="px-5 py-4 text-sm text-[#888] max-w-[200px] truncate">
                              {email.from_address}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                  email.direction === "inbound"
                                    ? "bg-[#22c55e]/15 text-[#22c55e]"
                                    : "bg-[#4FC3F7]/15 text-[#4FC3F7]"
                                }`}
                              >
                                {email.direction === "inbound" ? (
                                  <PhoneIncoming className="h-3 w-3" />
                                ) : (
                                  <PhoneOutgoing className="h-3 w-3" />
                                )}
                                {email.direction}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Audits Tab ───────────────────────────────────────────── */}
            {activeTab === "audits" && (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-[#888]">{websiteAudits.length} audit{websiteAudits.length !== 1 ? "s" : ""}</p>
                  <Link
                    href="/seo"
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    <Plus className="h-3 w-3" /> Run New Audit
                  </Link>
                </div>
                {websiteAudits.length === 0 ? (
                  <EmptyState
                    icon={Shield}
                    title="No website audits"
                    description="Run an SEO audit on a client website to see results here."
                    actionLabel="Go to SEO"
                    onAction={() => router.push("/seo")}
                  />
                ) : (
                  <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a1a]">
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Date</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">URL</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Score</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Findings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {websiteAudits.map((audit) => {
                          const scoreColor =
                            (audit.score || 0) >= 80
                              ? "text-[#10b981]"
                              : (audit.score || 0) >= 50
                              ? "text-[#f59e0b]"
                              : "text-[#ef4444]";
                          return (
                            <tr
                              key={audit.id}
                              className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                            >
                              <td className="px-5 py-4 text-sm text-[#888]">
                                {new Date(audit.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-5 py-4 text-sm text-white max-w-[250px] truncate">
                                {audit.url || audit.websites?.url || "--"}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`text-sm font-bold ${scoreColor}`}>
                                  {audit.score ?? "--"}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-[#888]">
                                {audit.findings_count ?? 0} findings
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── Calls Tab ────────────────────────────────────────────── */}
            {activeTab === "calls" && (
              <>
                {callLogs.length === 0 ? (
                  <EmptyState
                    icon={PhoneCall}
                    title="No calls yet"
                    description="Call logs for this client will appear here."
                    actionLabel="Make a Call"
                    onAction={() => setShowCallModal(true)}
                  />
                ) : (
                  <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1a1a1a]">
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Date</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Phone</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Direction</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Duration</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Status</th>
                          <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">Transcript</th>
                        </tr>
                      </thead>
                      <tbody>
                        {callLogs.map((call) => (
                          <tr
                            key={call.id}
                            onClick={() => router.push(`/calls/${call.id}`)}
                            className="cursor-pointer border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                          >
                            <td className="px-5 py-4 text-sm text-[#888]">
                              {timeAgo(call.created_at)}
                            </td>
                            <td className="px-5 py-4 text-sm text-white">
                              {call.phone_number}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                                  call.direction === "inbound"
                                    ? "bg-[#22c55e]/15 text-[#22c55e]"
                                    : "bg-[#4FC3F7]/15 text-[#4FC3F7]"
                                }`}
                              >
                                {call.direction === "inbound" ? (
                                  <PhoneIncoming className="h-3 w-3" />
                                ) : (
                                  <PhoneOutgoing className="h-3 w-3" />
                                )}
                                {call.direction}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-[#888] font-mono">
                              {formatDuration(call.duration)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                  call.status === "completed"
                                    ? "bg-[#10b981]/20 text-[#10b981]"
                                    : call.status === "failed"
                                    ? "bg-[#ef4444]/20 text-[#ef4444]"
                                    : "bg-[#4FC3F7]/20 text-[#4FC3F7]"
                                }`}
                              >
                                {call.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-[#666] max-w-[200px] truncate">
                              {call.transcript
                                ? call.transcript.slice(0, 80) + (call.transcript.length > 80 ? "..." : "")
                                : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Call Modal ─────────────────────────────────────────────────────── */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        prefillPhone={client.phone || ""}
        prefillName={client.name}
        prefillCompany={client.company || ""}
        clientId={clientId}
      />
    </div>
  );
}
