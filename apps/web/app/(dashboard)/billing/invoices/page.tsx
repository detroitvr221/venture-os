export const dynamic = 'force-dynamic';

import Link from "next/link";
import {
  FileText,
  ChevronRight,
  Plus,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Send,
  Filter,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ───────────────────────────────────────────────────────────────

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const ORG_ID =
  process.env.DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string;
  invoice_number: string;
  client_id: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

interface ClientMap {
  [id: string]: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

const statusConfig: Record<
  InvoiceStatus,
  { text: string; bg: string; icon: typeof FileText; strikethrough?: boolean }
> = {
  draft: { text: "#888", bg: "#88888815", icon: FileText },
  sent: { text: "#3b82f6", bg: "#3b82f615", icon: Send },
  paid: { text: "#22c55e", bg: "#22c55e15", icon: CheckCircle2 },
  overdue: { text: "#ef4444", bg: "#ef444415", icon: AlertTriangle },
  void: { text: "#888", bg: "#88888815", icon: Ban, strikethrough: true },
};

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getInvoicesData(statusFilter?: string) {
  const db = getDb();

  let query = db
    .from("invoices")
    .select("id, invoice_number, client_id, amount, status, due_date, paid_at, created_at")
    .eq("organization_id", ORG_ID)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: invoicesData } = await query;
  const invoices = (invoicesData ?? []) as InvoiceRow[];

  // Fetch client names
  const clientIds = [...new Set(invoices.filter((i) => i.client_id).map((i) => i.client_id!))];
  const clientNames: ClientMap = {};

  if (clientIds.length > 0) {
    const { data: clientsData } = await db
      .from("clients")
      .select("id, name")
      .in("id", clientIds);
    for (const c of (clientsData ?? []) as { id: string; name: string }[]) {
      clientNames[c.id] = c.name;
    }
  }

  // Compute stats
  const allInvoices = invoicesData ? (invoicesData as InvoiceRow[]) : [];
  const stats = {
    total: allInvoices.length,
    draft: allInvoices.filter((i) => i.status === "draft").length,
    sent: allInvoices.filter((i) => i.status === "sent").length,
    paid: allInvoices.filter((i) => i.status === "paid").length,
    overdue: allInvoices.filter((i) => i.status === "overdue").length,
    totalAmount: allInvoices.reduce((s, i) => s + (i.amount ?? 0), 0),
    paidAmount: allInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + (i.amount ?? 0), 0),
  };

  return { invoices, clientNames, stats };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";
  const { invoices, clientNames, stats } = await getInvoicesData(statusFilter);

  const filters: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "sent", label: "Sent" },
    { key: "paid", label: "Paid" },
    { key: "overdue", label: "Overdue" },
    { key: "void", label: "Void" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="mt-1 text-sm text-[#888]">
            {stats.total} invoices &middot; Collected:{" "}
            <span className="text-[#22c55e]">
              {formatCurrency(stats.paidAmount)}
            </span>{" "}
            &middot; Total:{" "}
            <span className="text-white">
              {formatCurrency(stats.totalAmount)}
            </span>
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white opacity-60 cursor-not-allowed"
          title="Coming soon"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          { label: "Draft", count: stats.draft, color: "#888" },
          { label: "Sent", count: stats.sent, color: "#3b82f6" },
          { label: "Paid", count: stats.paid, color: "#22c55e" },
          { label: "Overdue", count: stats.overdue, color: "#ef4444" },
        ] as const).map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4"
          >
            <p className="text-xs text-[#888]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: s.color }}>
              {s.count}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#666]" />
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/billing/invoices" : `/billing/invoices?status=${f.key}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === f.key
                ? "bg-[#1a1a1a] text-white"
                : "text-[#666] hover:text-[#999]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a]">
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <FileText className="mx-auto h-8 w-8 text-[#333]" />
              <p className="mt-3 text-sm text-[#666]">No invoices found</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Invoice
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Client
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Due Date
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium text-[#888]">
                  Paid At
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const status = inv.status as InvoiceStatus;
                const cfg = statusConfig[status] ?? statusConfig.draft;
                const Icon = cfg.icon;
                const clientName = inv.client_id ? clientNames[inv.client_id] : null;

                return (
                  <tr
                    key={inv.id}
                    className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/billing/invoices/${inv.id}`}
                        className={`text-sm font-mono font-medium transition-colors hover:text-[#3b82f6] ${
                          cfg.strikethrough ? "line-through text-[#666]" : "text-white"
                        }`}
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {clientName ?? "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        cfg.strikethrough ? "line-through text-[#666]" : "text-white"
                      }`}>
                        <DollarSign className="h-3.5 w-3.5 text-[#22c55e]" />
                        {inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                          cfg.strikethrough ? "line-through" : ""
                        }`}
                        style={{ color: cfg.text, backgroundColor: cfg.bg }}
                      >
                        <Icon className="h-3 w-3" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#888]">
                      {formatDate(inv.paid_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/billing/invoices/${inv.id}`}>
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
