"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Building2, Mail, Phone, ExternalLink, FolderKanban, FileText, Clock } from "lucide-react";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string; status: string }[]>([]);
  const [proposals, setProposals] = useState<{ id: string; title: string; status: string; total_value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    const supabase = createClient();
    const [c, p, pr] = await Promise.all([
      supabase.from("clients").select("*").eq("id", params.id).single(),
      supabase.from("projects").select("id, name, status").eq("client_id", params.id).order("created_at", { ascending: false }),
      supabase.from("proposals").select("id, title, status, total_value").eq("client_id", params.id).order("created_at", { ascending: false }),
    ]);
    setClient(c.data);
    setProjects(p.data || []);
    setProposals(pr.data || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-32"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" /></div>;
  if (!client) return <div className="py-16 text-center"><p className="text-[#666]">Client not found</p><Link href="/clients" className="mt-2 text-sm text-[#3b82f6]">Back to clients</Link></div>;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/clients" className="mb-6 flex items-center gap-2 text-sm text-[#888] hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#3b82f6]/20">
          <Building2 className="h-7 w-7 text-[#3b82f6]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{client.name}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-[#888]">
            {client.industry && <span>{client.industry}</span>}
            <span className={`rounded-full px-2 py-0.5 text-xs ${client.status === "active" ? "bg-[#10b981]/20 text-[#10b981]" : "bg-[#666]/20 text-[#666]"}`}>{client.status}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Since {new Date(client.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 text-sm font-medium text-[#888]">Contact Information</h2>
            <div className="space-y-2">
              {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-[#666]" /><span className="text-white">{client.email}</span></div>}
              {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-[#666]" /><span className="text-white">{client.phone}</span></div>}
              {client.website && <div className="flex items-center gap-2 text-sm"><ExternalLink className="h-4 w-4 text-[#666]" /><a href={client.website} target="_blank" className="text-[#3b82f6] hover:underline">{client.website}</a></div>}
            </div>
          </div>

          {/* Projects */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]"><FolderKanban className="h-4 w-4" /> Projects ({projects.length})</h2>
            {projects.length === 0 ? <p className="text-xs text-[#555]">No projects yet</p> : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] p-3 hover:border-[#333]">
                    <span className="text-sm text-white">{p.name}</span>
                    <span className="rounded-full bg-[#3b82f6]/20 px-2 py-0.5 text-[10px] text-[#3b82f6]">{p.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Proposals */}
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-[#888]"><FileText className="h-4 w-4" /> Proposals ({proposals.length})</h2>
            {proposals.length === 0 ? <p className="text-xs text-[#555]">No proposals yet</p> : (
              <div className="space-y-2">
                {proposals.map((p) => (
                  <Link key={p.id} href={`/proposals/${p.id}`} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] p-3 hover:border-[#333]">
                    <span className="text-sm text-white">{p.title}</span>
                    <div className="flex items-center gap-2">
                      {p.total_value && <span className="text-xs text-[#888]">${p.total_value.toLocaleString()}</span>}
                      <span className="rounded-full bg-[#8b5cf6]/20 px-2 py-0.5 text-[10px] text-[#8b5cf6]">{p.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
            <h2 className="mb-3 text-sm font-medium text-[#888]">Quick Actions</h2>
            <div className="space-y-2">
              <Link href={`/email/compose?to=${client.email || ""}`} className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] hover:bg-[#222]">
                <Mail className="h-4 w-4" /> Send Email
              </Link>
              <Link href={`/proposals?client=${params.id}`} className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] px-3 py-2 text-sm text-[#ccc] hover:bg-[#222]">
                <FileText className="h-4 w-4" /> New Proposal
              </Link>
            </div>
          </div>
          {client.notes && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
              <h2 className="mb-2 text-sm font-medium text-[#888]">Notes</h2>
              <p className="text-sm text-[#ccc]">{client.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
