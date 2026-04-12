export const dynamic = 'force-dynamic';

import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Database,
  Cpu,
  Globe,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ───────────────────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const ORG_ID =
  process.env.DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getBillingData() {
  const db = getDb();

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    subscriptionsResult,
    invoicesResult,
    paidInvoicesResult,
    outstandingResult,
    usageResult,
  ] = await Promise.all([
    // Active subscriptions count
    db
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", ORG_ID)
      .in("status", ["active", "trialing"]),
    // Recent invoices
    db
      .from("invoices")
      .select("id, number, status, amount_due, amount_paid, currency, due_date, paid_at, created_at")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(10),
    // Monthly revenue (paid invoices this month)
    db
      .from("invoices")
      .select("amount_paid")
      .eq("organization_id", ORG_ID)
      .eq("status", "paid")
      .gte("paid_at", monthStart),
    // Outstanding invoices
    db
      .from("invoices")
      .select("amount_due")
      .eq("organization_id", ORG_ID)
      .in("status", ["open", "draft"]),
    // Usage meters for current period
    db
      .from("usage_meters")
      .select("meter_name, value, period_start, period_end, metadata")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const monthlyRevenue = (paidInvoicesResult.data ?? []).reduce(
    (sum: number, inv: { amount_paid: number }) => sum + (inv.amount_paid ?? 0),
    0,
  );

  const totalOutstanding = (outstandingResult.data ?? []).reduce(
    (sum: number, inv: { amount_due: number }) => sum + (inv.amount_due ?? 0),
    0,
  );

  const activeSubscriptions = subscriptionsResult.count ?? 0;

  // Avg revenue per client
  const avgRevenue = activeSubscriptions > 0
    ? Math.round(monthlyRevenue / activeSubscriptions)
    : 0;

  return {
    monthlyRevenue,
    activeSubscriptions,
    totalOutstanding,
    avgRevenue,
    invoices: (invoicesResult.data ?? []) as Array<{
      id: string;
      number: string;
      status: string;
      amount_due: number;
      amount_paid: number;
      currency: string;
      due_date: string | null;
      paid_at: string | null;
      created_at: string;
    }>,
    usageMeters: (usageResult.data ?? []) as Array<{
      meter_name: string;
      value: number;
      period_start: string;
      period_end: string;
      metadata: Record<string, unknown>;
    }>,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusColors: Record<string, { text: string; bg: string }> = {
  paid: { text: "#22c55e", bg: "#22c55e15" },
  open: { text: "#eab308", bg: "#eab30815" },
  draft: { text: "#888", bg: "#88888815" },
  void: { text: "#ef4444", bg: "#ef444415" },
  uncollectible: { text: "#ef4444", bg: "#ef444415" },
};

const meterConfig: Record<string, { icon: typeof Zap; color: string; limit: number; unit: string }> = {
  agent_tokens: { icon: Zap, color: "#4FC3F7", limit: 1000000, unit: "tokens" },
  api_calls: { icon: Zap, color: "#4FC3F7", limit: 100000, unit: "calls" },
  crawl_pages: { icon: Globe, color: "#eab308", limit: 5000, unit: "pages" },
  storage_gb: { icon: Database, color: "#F5C542", limit: 100, unit: "GB" },
  compute_hours: { icon: Cpu, color: "#22c55e", limit: 500, unit: "hrs" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default async function BillingPage() {
  const data = await getBillingData();

  const revenueStats = [
    {
      label: "Monthly Recurring Revenue",
      value: formatCurrency(data.monthlyRevenue),
      icon: DollarSign,
    },
    {
      label: "Active Subscriptions",
      value: data.activeSubscriptions.toString(),
      icon: CreditCard,
    },
    {
      label: "Outstanding Invoices",
      value: formatCurrency(data.totalOutstanding),
      icon: FileText,
    },
    {
      label: "Avg Revenue Per Client",
      value: formatCurrency(data.avgRevenue),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing Dashboard</h1>
        <p className="mt-1 text-sm text-[#888]">
          Revenue tracking, invoicing, and usage monitoring
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {revenueStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#888]">{stat.label}</p>
                <Icon className="h-4 w-4 text-[#666]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Invoices */}
        <div className="lg:col-span-2 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
          <div className="mt-4 overflow-x-auto">
            {data.invoices.length === 0 ? (
              <p className="text-sm text-[#666]">No invoices yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="pb-3 text-left text-xs font-medium text-[#888]">Invoice</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#888]">Amount</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#888]">Date</th>
                    <th className="pb-3 text-left text-xs font-medium text-[#888]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => {
                    const sc = statusColors[inv.status] ?? statusColors.draft;
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                      >
                        <td className="py-3.5 text-sm font-mono text-[#888]">{inv.number}</td>
                        <td className="py-3.5 text-sm font-medium text-white">
                          ${inv.amount_due.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-sm text-[#888]">
                          {formatDate(inv.created_at)}
                        </td>
                        <td className="py-3.5">
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize"
                            style={{ color: sc.text, backgroundColor: sc.bg }}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Usage Meters */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">Usage</h2>
          <p className="text-xs text-[#888]">Current billing cycle</p>
          <div className="mt-5 space-y-5">
            {data.usageMeters.length === 0 ? (
              <p className="text-sm text-[#666]">No usage data yet.</p>
            ) : (
              data.usageMeters.map((meter) => {
                const cfg = meterConfig[meter.meter_name] ?? {
                  icon: Zap,
                  color: "#888",
                  limit: meter.value * 2,
                  unit: "",
                };
                const Icon = cfg.icon;
                const pct = cfg.limit > 0 ? (meter.value / cfg.limit) * 100 : 0;
                const displayUsed =
                  meter.value >= 1000000
                    ? `${(meter.value / 1000000).toFixed(1)}M`
                    : meter.value >= 1000
                      ? `${(meter.value / 1000).toFixed(0)}k`
                      : meter.value.toString();

                return (
                  <div key={meter.meter_name}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                        <span className="text-sm text-white">
                          {meter.meter_name.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-xs text-[#888]">
                        {displayUsed} {cfg.unit}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor:
                            pct > 90 ? "#ef4444" : pct > 70 ? "#eab308" : cfg.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
