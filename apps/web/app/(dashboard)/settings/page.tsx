"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useOrgId } from "@/lib/useOrgId";
import {
  Settings,
  Globe,
  Shield,
  LogOut,
  User,
  Building2,
  Plug,
  Database,
  Mail,
  Phone,
  Bot,
  MessageSquare,
  Github,
  Calendar,
  Cpu,
  Server,
  Zap,
  Pencil,
  Check,
  X,
} from "lucide-react";

type IntegrationStatus = "connected" | "configured" | "not_connected";

interface Integration {
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: React.ReactNode;
}

function StatusDot({ status }: { status: IntegrationStatus }) {
  const color =
    status === "connected"
      ? "bg-[#10b981]"
      : status === "configured"
        ? "bg-[#f59e0b]"
        : "bg-[#ef4444]";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const styles =
    status === "connected"
      ? "bg-[#10b981]/15 text-[#10b981]"
      : status === "configured"
        ? "bg-[#f59e0b]/15 text-[#f59e0b]"
        : "bg-[#ef4444]/15 text-[#ef4444]";
  const label =
    status === "connected"
      ? "Connected"
      : status === "configured"
        ? "Configured"
        : "Not Connected";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles}`}
    >
      <StatusDot status={status} />
      {label}
    </span>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const orgId = useOrgId();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("member");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [savingOrgName, setSavingOrgName] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");

        // Get role from organization_members
        const { data: member } = await supabase
          .from("organization_members")
          .select("role")
          .eq("user_id", user.id)
          .single();
        if (member?.role) setUserRole(member.role);
      }

      // Get org name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();
      if (org?.name) setOrgName(org.name);

      // Build integrations list with live status checks
      const integrationsList: Integration[] = [];

      // OpenClaw VPS
      let openclawStatus: IntegrationStatus = "not_connected";
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(4000) });
        if (res.ok) openclawStatus = "connected";
        else openclawStatus = "configured";
      } catch {
        openclawStatus = "configured";
      }
      integrationsList.push({
        name: "OpenClaw",
        description: "VPS orchestration and agent runtime",
        status: openclawStatus,
        icon: <Server className="h-4 w-4" />,
      });

      // Supabase — always connected
      integrationsList.push({
        name: "Supabase",
        description: "Database, auth, and realtime backend",
        status: "connected",
        icon: <Database className="h-4 w-4" />,
      });

      // Resend
      integrationsList.push({
        name: "Resend (Email)",
        description: "Transactional and marketing email delivery",
        status: "connected",
        icon: <Mail className="h-4 w-4" />,
      });

      // Cal.com
      let calStatus: IntegrationStatus = "not_connected";
      try {
        const res = await fetch("/api/cal", { method: "GET", signal: AbortSignal.timeout(4000) });
        if (res.ok) calStatus = "connected";
        else calStatus = "configured";
      } catch {
        calStatus = "configured";
      }
      integrationsList.push({
        name: "Cal.com",
        description: "Scheduling and calendar booking",
        status: calStatus,
        icon: <Calendar className="h-4 w-4" />,
      });

      // Vapi
      integrationsList.push({
        name: "Vapi (Voice AI)",
        description: "AI-powered phone calls and voice agents",
        status: "configured",
        icon: <Phone className="h-4 w-4" />,
      });

      // Trigger.dev
      integrationsList.push({
        name: "Trigger.dev",
        description: "Background jobs and workflow orchestration",
        status: "configured",
        icon: <Zap className="h-4 w-4" />,
      });

      // Slack
      integrationsList.push({
        name: "Slack",
        description: "Team notifications via OpenClaw",
        status: "connected",
        icon: <MessageSquare className="h-4 w-4" />,
      });

      // MoChat
      integrationsList.push({
        name: "MoChat",
        description: "Client-facing chat widget",
        status: "connected",
        icon: <Bot className="h-4 w-4" />,
      });

      // GitHub
      integrationsList.push({
        name: "GitHub",
        description: "Repository and deployment management",
        status: "connected",
        icon: <Github className="h-4 w-4" />,
      });

      setIntegrations(integrationsList);
      setLoading(false);
    }

    if (orgId) load();
  }, [orgId]);

  const handleSaveOrgName = async () => {
    if (!orgNameDraft.trim()) {
      toast.error("Organization name cannot be empty");
      return;
    }
    setSavingOrgName(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({ name: orgNameDraft.trim() })
      .eq("id", orgId);
    setSavingOrgName(false);
    if (error) {
      toast.error("Failed to update organization name");
      return;
    }
    setOrgName(orgNameDraft.trim());
    setEditingOrgName(false);
    toast.success("Organization name updated");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-[#888]">
            Platform configuration and integrations
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-[#222] bg-[#0a0a0a]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-[#888]">
          Platform configuration and integrations
        </p>
      </div>

      {/* Profile Section */}
      <section className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[#4FC3F7]" />
          <h2 className="text-lg font-medium text-white">Profile</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#888]">Email</label>
            <div className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#ccc]">
              {userEmail || "---"}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#888]">Role</label>
            <div className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm capitalize text-[#ccc]">
              {userRole}
            </div>
          </div>
        </div>
      </section>

      {/* Organization Section */}
      <section className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#4FC3F7]" />
          <h2 className="text-lg font-medium text-white">Organization</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[#888]">
              Organization Name
            </label>
            {editingOrgName ? (
              <div className="flex items-center gap-2">
                <input
                  value={orgNameDraft}
                  onChange={(e) => setOrgNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveOrgName();
                    if (e.key === "Escape") setEditingOrgName(false);
                  }}
                  autoFocus
                  className="flex-1 rounded-lg border border-[#4FC3F7] bg-[#111] px-3 py-2 text-sm text-white focus:outline-none"
                />
                <button
                  onClick={handleSaveOrgName}
                  disabled={savingOrgName}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4FC3F7] text-white transition hover:bg-[#38B2D8] disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingOrgName(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#333] text-[#888] transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#ccc]">
                  {orgName || "---"}
                </div>
                <button
                  onClick={() => {
                    setOrgNameDraft(orgName);
                    setEditingOrgName(true);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#333] text-[#888] transition hover:border-[#4FC3F7] hover:text-[#4FC3F7]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#888]">
              Organization ID
            </label>
            <div className="rounded-lg border border-[#333] bg-[#111] px-3 py-2 font-mono text-xs text-[#666]">
              {orgId}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Plug className="h-5 w-5 text-[#4FC3F7]" />
          <h2 className="text-lg font-medium text-white">Integrations</h2>
        </div>
        <div className="space-y-2">
          {integrations.map((int) => (
            <div
              key={int.name}
              className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] px-4 py-3 transition hover:border-[#333]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a2a] text-[#4FC3F7]">
                  {int.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{int.name}</p>
                  <p className="text-xs text-[#666]">{int.description}</p>
                </div>
              </div>
              <StatusBadge status={int.status} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#555]">
          Integration management is handled through the OpenClaw gateway. Contact admin to modify connections.
        </p>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-[#ef4444]/30 bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#ef4444]" />
          <h2 className="text-lg font-medium text-[#ef4444]">Danger Zone</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Sign out of your account</p>
            <p className="text-xs text-[#666]">
              You will be redirected to the login page.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-2 text-sm font-medium text-[#ef4444] transition hover:bg-[#ef4444]/20 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </section>
    </div>
  );
}
