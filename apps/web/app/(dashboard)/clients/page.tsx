"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Search, Building2, Mail, Phone, ExternalLink, DollarSign } from "lucide-react";
import { SkeletonGrid } from "@/components/Skeleton";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  company_id: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", website: "", industry: "" });
  const [orgId, setOrgId] = useState("00000000-0000-0000-0000-000000000001");

  useEffect(() => {
    loadClients();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("organization_members").select("organization_id").eq("user_id", user.id).single().then(({ data }) => {
          if (data?.organization_id) setOrgId(data.organization_id);
        });
      }
    });
  }, []);

  async function loadClients() {
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    setClients(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name) return;
    const supabase = createClient();
    const { error } = await supabase.from("clients").insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      industry: form.industry || null,
      organization_id: orgId,
      status: "active",
    });
    if (error) {
      toast.error("Failed to create client");
      return;
    }
    toast.success("Client created");
    setForm({ name: "", email: "", phone: "", website: "", industry: "" });
    setShowAdd(false);
    loadClients();
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="mt-1 text-sm text-[#888]">{clients.length} total clients</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "name", label: "Company Name *", placeholder: "Acme Corp" },
              { key: "email", label: "Email", placeholder: "contact@acme.com" },
              { key: "phone", label: "Phone", placeholder: "+1 555 0123" },
              { key: "website", label: "Website", placeholder: "https://acme.com" },
              { key: "industry", label: "Industry", placeholder: "Technology" },
            ].map((f) => (
              <div key={f.key} className={f.key === "industry" ? "col-span-2" : ""}>
                <label className="mb-1 block text-xs text-[#888]">{f.label}</label>
                <input
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-[#888]">Cancel</button>
            <button onClick={handleAdd} className="rounded-lg bg-[#4FC3F7] px-4 py-1.5 text-xs font-medium text-white">Save Client</button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <SkeletonGrid cards={6} />
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center py-16">
            <Users className="mb-3 h-10 w-10 text-[#333]" />
            <p className="text-sm text-[#666]">No clients yet</p>
          </div>
        ) : (
          filtered.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4 transition hover:border-[#333]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4FC3F7]/20">
                    <Building2 className="h-5 w-5 text-[#4FC3F7]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{client.name}</h3>
                    {client.industry && <p className="text-xs text-[#888]">{client.industry}</p>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  client.status === "active" ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#666]/20 text-[#666]"
                }`}>
                  {client.status}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {client.email && (
                  <div className="flex items-center gap-2 text-xs text-[#888]">
                    <Mail className="h-3 w-3" /> {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-[#888]">
                    <Phone className="h-3 w-3" /> {client.phone}
                  </div>
                )}
                {client.website && (
                  <div className="flex items-center gap-2 text-xs text-[#888]">
                    <ExternalLink className="h-3 w-3" /> {client.website}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
