"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Send,
  CheckCircle2,
  DollarSign,
  Clock,
  Building2,
  Calendar,
  Hash,
} from "lucide-react";
import { updateInvoiceStatus } from "../../../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  client_id: string | null;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  line_items: LineItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientInfo {
  name: string;
  email: string | null;
  company_name: string | null;
}

// ─── Supabase ───────────────────────────────────────────────────────────────

function getClientDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const ORG_ID =
  process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ??
  "00000000-0000-0000-0000-000000000001";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statusColors: Record<string, { text: string; bg: string }> = {
  draft: { text: "#888", bg: "#88888815" },
  sent: { text: "#4FC3F7", bg: "#4FC3F715" },
  paid: { text: "#22c55e", bg: "#22c55e15" },
  overdue: { text: "#ef4444", bg: "#ef444415" },
  void: { text: "#888", bg: "#88888815" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const db = getClientDb();

    const { data: invoiceData } = await db
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("organization_id", ORG_ID)
      .single();

    if (invoiceData) {
      const inv = invoiceData as InvoiceDetail;
      // Ensure line_items is an array
      if (!Array.isArray(inv.line_items)) {
        inv.line_items = [];
      }
      setInvoice(inv);

      // Fetch client info
      if (inv.client_id) {
        const { data: clientData } = await db
          .from("clients")
          .select("name, email, company_name")
          .eq("id", inv.client_id)
          .single();
        if (clientData) {
          setClientInfo(clientData as ClientInfo);
        }
      }
    }

    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleMarkSent = async () => {
    setActing(true);
    const result = await updateInvoiceStatus(invoiceId, "sent");
    setActing(false);
    if (result.success) {
      showMessage("Invoice marked as sent");
      fetchData();
    } else {
      showMessage(`Error: ${result.error}`);
    }
  };

  const handleMarkPaid = async () => {
    setActing(true);
    const result = await updateInvoiceStatus(invoiceId, "paid");
    setActing(false);
    if (result.success) {
      showMessage("Invoice marked as paid");
      fetchData();
    } else {
      showMessage(`Error: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-[#888]">Invoice not found</p>
        <Link
          href="/billing/invoices"
          className="text-[#4FC3F7] hover:underline text-sm"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  const sc = statusColors[invoice.status] ?? statusColors.draft;
  const lineItems = invoice.line_items ?? [];
  const grandTotal = lineItems.reduce((sum, item) => sum + (item.total ?? item.quantity * item.unit_price), 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {message && (
        <div className="fixed top-4 right-4 z-50 rounded-lg border border-[#222] bg-[#0a0a0a] px-4 py-3 text-sm text-white shadow-lg">
          {message}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#888]">
        <Link
          href="/billing/invoices"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white">{invoice.invoice_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">
              {invoice.invoice_number}
            </h1>
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
              style={{ color: sc.text, backgroundColor: sc.bg }}
            >
              {invoice.status}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-[#888]">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-[#22c55e]" />
              <span className="text-white font-medium">
                {formatCurrency(invoice.amount)}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Created {formatDate(invoice.created_at)}
            </span>
            {invoice.due_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Due {formatDate(invoice.due_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {invoice.status === "draft" && (
            <button
              onClick={handleMarkSent}
              disabled={acting}
              className="flex items-center gap-2 rounded-lg bg-[#4FC3F7] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {acting ? "Updating..." : "Mark as Sent"}
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button
              onClick={handleMarkPaid}
              disabled={acting}
              className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {acting ? "Updating..." : "Mark as Paid"}
            </button>
          )}
        </div>
      </div>

      {/* Invoice Document */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        {/* Invoice Header - From / To */}
        <div className="grid grid-cols-2 gap-8 border-b border-[#1a1a1a] pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#666] mb-2">
              From
            </p>
            <p className="text-sm font-semibold text-white">North Bridge Digital</p>
            <p className="text-sm text-[#888]">North Bridge Digital Platform</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#666] mb-2">
              To
            </p>
            {clientInfo ? (
              <>
                <p className="text-sm font-semibold text-white">{clientInfo.name}</p>
                {clientInfo.company_name && (
                  <p className="text-sm text-[#888]">{clientInfo.company_name}</p>
                )}
                {clientInfo.email && (
                  <p className="text-sm text-[#888]">{clientInfo.email}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#666]">No client associated</p>
            )}
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="grid grid-cols-4 gap-4 border-b border-[#1a1a1a] py-5">
          <div>
            <p className="text-xs text-[#666]">Invoice Number</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-mono text-white">
              <Hash className="h-3.5 w-3.5 text-[#666]" />
              {invoice.invoice_number}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#666]">Issue Date</p>
            <p className="mt-1 text-sm text-white">{formatDate(invoice.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-[#666]">Due Date</p>
            <p className="mt-1 text-sm text-white">{formatDate(invoice.due_date)}</p>
          </div>
          <div>
            <p className="text-xs text-[#666]">Paid At</p>
            <p className="mt-1 text-sm text-white">{formatDate(invoice.paid_at)}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-5">
          <h3 className="text-sm font-semibold text-white mb-4">Line Items</h3>
          {lineItems.length === 0 ? (
            <div className="flex items-center justify-center py-8 rounded-lg border border-dashed border-[#222]">
              <div className="text-center">
                <FileText className="mx-auto h-6 w-6 text-[#333]" />
                <p className="mt-2 text-sm text-[#666]">No line items</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="pb-3 text-left text-xs font-medium text-[#888]">
                    Description
                  </th>
                  <th className="pb-3 text-right text-xs font-medium text-[#888]">
                    Qty
                  </th>
                  <th className="pb-3 text-right text-xs font-medium text-[#888]">
                    Unit Price
                  </th>
                  <th className="pb-3 text-right text-xs font-medium text-[#888]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[#1a1a1a] last:border-0"
                  >
                    <td className="py-3 text-sm text-white">
                      {item.description}
                    </td>
                    <td className="py-3 text-right text-sm text-[#888]">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-sm text-[#888]">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-white">
                      {formatCurrency(item.total ?? item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Grand Total */}
        <div className="border-t border-[#1a1a1a] pt-4 flex justify-end">
          <div className="text-right">
            <p className="text-xs text-[#888]">Grand Total</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatCurrency(grandTotal || invoice.amount)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6 border-t border-[#1a1a1a] pt-4">
            <p className="text-xs text-[#666] mb-1">Notes</p>
            <p className="text-sm text-[#888] whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
