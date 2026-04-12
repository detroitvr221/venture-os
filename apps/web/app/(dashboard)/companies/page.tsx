"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Users,
  Hash,
  Globe,
  ArrowUpRight,
  Crown,
  MoreHorizontal,
} from "lucide-react";
import { createSubCompany } from "../../actions";
import { createClient } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  website: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

interface BrandRow {
  company_id: string;
  name: string;
  colors: Record<string, string>;
}

// ─── Supabase ───────────────────────────────────────────────────────────────

function getClientDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

// ─── Component ──────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<(CompanyRow & { clientCount: number; brand: BrandRow | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    const db = getClientDb();

    const { data: companiesData, error } = await db
      .from("sub_companies")
      .select("*")
      .eq("organization_id", ORG_ID)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch companies:", error.message);
      setLoading(false);
      return;
    }

    const companyIds = (companiesData ?? []).map((c: CompanyRow) => c.id);

    // Fetch brands and client counts
    const [brandsResult, clientsResult] = await Promise.all([
      companyIds.length > 0
        ? db.from("brands").select("company_id, name, colors").eq("organization_id", ORG_ID).in("company_id", companyIds)
        : { data: [] },
      companyIds.length > 0
        ? db.from("clients").select("company_id").eq("organization_id", ORG_ID).eq("status", "active").in("company_id", companyIds)
        : { data: [] },
    ]);

    const brandsByCompany: Record<string, BrandRow> = {};
    for (const brand of (brandsResult.data ?? []) as BrandRow[]) {
      brandsByCompany[brand.company_id] = brand;
    }

    const clientCountByCompany: Record<string, number> = {};
    for (const client of (clientsResult.data ?? []) as { company_id: string }[]) {
      clientCountByCompany[client.company_id] = (clientCountByCompany[client.company_id] ?? 0) + 1;
    }

    const enriched = (companiesData ?? []).map((c: CompanyRow) => ({
      ...c,
      clientCount: clientCountByCompany[c.id] ?? 0,
      brand: brandsByCompany[c.id] ?? null,
    }));

    setCompanies(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreateCompany = async (formData: FormData) => {
    setFormError(null);
    const result = await createSubCompany(formData);
    if (result.success) {
      setShowCreate(false);
      fetchCompanies();
    } else {
      setFormError(result.error);
    }
  };

  const totalClients = companies.reduce((s, c) => s + c.clientCount, 0);
  const isMaster = (company: CompanyRow, index: number) => index === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[#888]">Loading companies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Company Portfolio
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            {companies.length} companies &middot; {totalClients} total clients
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Company
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">New Sub-Company</h3>
          <form action={handleCreateCompany} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="organization_id" value={ORG_ID} />
            <div>
              <label className="text-xs text-[#888] block mb-1">Company Name *</label>
              <input name="name" required className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#3b82f6] focus:outline-none" placeholder="AeroVista Labs" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Slug *</label>
              <input name="slug" required pattern="[a-z0-9-]+" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#3b82f6] focus:outline-none" placeholder="aerovista-labs" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Industry</label>
              <input name="industry" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#3b82f6] focus:outline-none" placeholder="AI / Drone Analytics" />
            </div>
            <div>
              <label className="text-xs text-[#888] block mb-1">Website</label>
              <input name="website" type="url" className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder-[#666] focus:border-[#3b82f6] focus:outline-none" placeholder="https://aerovista.com" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="submit" className="rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb]">
                Create Company
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#888] hover:text-white">
                Cancel
              </button>
              {formError && <p className="text-sm text-[#ef4444]">{formError}</p>}
            </div>
          </form>
        </div>
      )}

      {/* Company Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {companies.map((company, index) => {
          const master = isMaster(company, index);
          return (
            <div
              key={company.id}
              className={`group relative rounded-xl border bg-[#0a0a0a] p-6 transition-all hover:border-[#333] ${
                master ? "border-[#3b82f640]" : "border-[#222]"
              }`}
            >
              {/* Master badge */}
              {master && (
                <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-2.5 py-0.5">
                  <Crown className="h-3 w-3 text-white" />
                  <span className="text-[10px] font-semibold text-white">
                    MASTER
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                      master
                        ? "bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]"
                        : "bg-[#1a1a1a]"
                    }`}
                  >
                    <Building2
                      className={`h-5 w-5 ${master ? "text-white" : "text-[#888]"}`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {company.name}
                    </h3>
                    <p className="text-xs text-[#888]">{company.industry ?? "General"}</p>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4 text-[#666]" />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#111] p-3 text-center">
                  <Users className="mx-auto h-4 w-4 text-[#666]" />
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {company.clientCount}
                  </p>
                  <p className="text-[10px] text-[#666]">Clients</p>
                </div>
                <div className="rounded-lg bg-[#111] p-3 text-center">
                  <Hash className="mx-auto h-4 w-4 text-[#666]" />
                  <p className="mt-1.5 text-lg font-bold text-white">
                    {company.slug}
                  </p>
                  <p className="text-[10px] text-[#666]">Slug</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-[#1a1a1a] pt-4">
                <span className="rounded-full bg-[#22c55e15] px-2.5 py-1 text-[10px] font-semibold text-[#22c55e]">
                  active
                </span>
                {company.website && (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    {company.website.replace(/^https?:\/\//, "")}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Company Card */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-[#333] bg-[#0a0a0a] transition-all hover:border-[#3b82f6] hover:bg-[#111]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a]">
            <Plus className="h-6 w-6 text-[#666]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#888]">
            Create New Company
          </p>
          <p className="mt-1 text-xs text-[#666]">
            Launch a new venture or subsidiary
          </p>
        </button>
      </div>
    </div>
  );
}
