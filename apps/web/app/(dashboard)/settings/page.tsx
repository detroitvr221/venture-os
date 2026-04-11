"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Key, Globe, Bot, Mail, Bell, Shield, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [orgName, setOrgName] = useState("Northbridge Digital");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || "");
    });
    supabase.from("organizations").select("name").single().then(({ data }) => {
      if (data?.name) setOrgName(data.name);
    });
  }, []);

  const tabs = [
    { key: "general", label: "General", icon: Settings },
    { key: "integrations", label: "Integrations", icon: Key },
    { key: "email", label: "Email", icon: Mail },
    { key: "agents", label: "Agents", icon: Bot },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "security", label: "Security", icon: Shield },
  ];

  const integrations = [
    { name: "Supabase", status: "connected", key: "SUPABASE_URL" },
    { name: "OpenClaw VPS 1", status: "connected", key: "OPENCLAW_GATEWAY_URL" },
    { name: "OpenClaw VPS 2", status: "connected", key: "OPENCLAW_WORKER_URL" },
    { name: "Resend", status: "connected", key: "RESEND_API_KEY" },
    { name: "Stripe", status: "not configured", key: "STRIPE_SECRET_KEY" },
    { name: "Trigger.dev", status: "not configured", key: "TRIGGER_API_KEY" },
    { name: "Firecrawl", status: "not configured", key: "FIRECRAWL_API_KEY" },
    { name: "Mem0", status: "api only", key: "MEM0_API_KEY" },
    { name: "Apollo.io", status: "connected", key: "APOLLO_API_KEY" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-[#888]">Platform configuration and integrations</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  activeTab === t.key ? "bg-[#1a1a2e] text-[#3b82f6]" : "text-[#888] hover:bg-[#1a1a1a] hover:text-[#ccc]"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
                <h2 className="mb-4 text-lg font-medium text-white">Organization</h2>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs text-[#888]">Organization Name</label>
                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)}
                      className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-[#3b82f6] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#888]">Account Email</label>
                    <input value={userEmail} disabled className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#666]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#888]">Domain</label>
                    <input value="thenorthbridgemi.org" disabled className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#666]" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
                <h2 className="mb-4 text-lg font-medium text-white">Deployment</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#888]">VPS 1 (Gateway)</span><span className="text-[#10b981]">145.223.75.46</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">VPS 2 (Workers)</span><span className="text-[#10b981]">187.77.207.22</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Dashboard</span><span className="text-[#10b981]">thenorthbridgemi.com</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">OpenClaw</span><span className="text-[#10b981]">claw.thenorthbridgemi.com</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Mail Server</span><span className="text-[#10b981]">mail.thenorthbridgemi.org</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
              <h2 className="mb-4 text-lg font-medium text-white">Integrations</h2>
              <div className="space-y-3">
                {integrations.map((int) => (
                  <div key={int.name} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] p-3">
                    <div>
                      <p className="text-sm font-medium text-white">{int.name}</p>
                      <p className="text-xs text-[#666]">{int.key}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      int.status === "connected" ? "bg-[#10b981]/20 text-[#10b981]"
                      : int.status === "api only" ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                      : "bg-[#666]/20 text-[#666]"
                    }`}>
                      {int.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
              <h2 className="mb-4 text-lg font-medium text-white">Email Configuration</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-[#888]">Outbound Provider</span><span className="text-white">Resend</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Inbound</span><span className="text-white">SMTP Receiver (port 25)</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Domain</span><span className="text-white">thenorthbridgemi.org</span></div>
                <div className="flex justify-between"><span className="text-[#888]">SPF</span><span className="text-[#10b981]">Configured</span></div>
                <div className="flex justify-between"><span className="text-[#888]">DKIM</span><span className="text-[#10b981]">Configured</span></div>
                <div className="flex justify-between"><span className="text-[#888]">DMARC</span><span className="text-[#10b981]">quarantine policy</span></div>
                <div className="flex justify-between"><span className="text-[#888]">PTR</span><span className="text-[#10b981]">mail.thenorthbridgemi.org</span></div>
              </div>
              <div className="mt-4 border-t border-[#1a1a1a] pt-4">
                <p className="text-xs text-[#888]">Send-from addresses:</p>
                <div className="mt-2 space-y-1">
                  {["atlas@thenorthbridgemi.org", "hello@thenorthbridgemi.org", "support@thenorthbridgemi.org", "noreply@thenorthbridgemi.org"].map((addr) => (
                    <div key={addr} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-[#10b981]" />
                      <span className="text-[#ccc]">{addr}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(activeTab === "agents" || activeTab === "notifications" || activeTab === "security") && (
            <div className="flex flex-col items-center rounded-xl border border-[#222] bg-[#0a0a0a] py-16">
              <Settings className="mb-3 h-10 w-10 text-[#333]" />
              <p className="text-sm text-[#666]">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
