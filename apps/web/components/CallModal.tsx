"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillPhone?: string;
  prefillName?: string;
  prefillCompany?: string;
  contactId?: string;
  leadId?: string;
  clientId?: string;
}

interface CallTemplate {
  id: string;
  name: string;
  script: string;
}

type CallState = "idle" | "loading" | "success" | "error";

// ─── Component ──────────────────────────────────────────────────────────────

export default function CallModal({
  isOpen,
  onClose,
  prefillPhone = "",
  prefillName = "",
  prefillCompany = "",
  contactId,
  leadId,
  clientId,
}: CallModalProps) {
  const [phone, setPhone] = useState(prefillPhone);
  const [contactName, setContactName] = useState(prefillName);
  const [templates, setTemplates] = useState<CallTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [script, setScript] = useState("");
  const [callState, setCallState] = useState<CallState>("idle");
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // ── Resolve org_id ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    async function resolveOrg() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (membership) {
        setOrgId(membership.organization_id);
      }
    }
    resolveOrg();
  }, [isOpen]);

  // ── Fetch templates ─────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/vapi/call", {
        headers: { Authorization: "Bearer vos-hooks-token-2026" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.templates)) {
          setTemplates(data.templates);
        }
      }
    } catch {
      // Templates are optional; fail silently
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setPhone(prefillPhone);
      setContactName(prefillName);
      setCallState("idle");
      setCallLogId(null);
      setErrorMessage(null);
      setSelectedTemplate("");
      setScript("");
    }
  }, [isOpen, prefillPhone, prefillName, fetchTemplates]);

  // ── Escape key + backdrop close ─────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // ── Template selection ──────────────────────────────────────────────────

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setScript(tpl.script);
    }
  }

  // ── Place call ──────────────────────────────────────────────────────────

  async function handlePlaceCall() {
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setCallState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/vapi/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer vos-hooks-token-2026",
        },
        body: JSON.stringify({
          phone_number: phone.trim(),
          contact_name: contactName.trim() || undefined,
          company: prefillCompany || undefined,
          template_id: selectedTemplate || undefined,
          script: script.trim() || undefined,
          contact_id: contactId || undefined,
          lead_id: leadId || undefined,
          client_id: clientId || undefined,
          org_id: orgId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Call failed" }));
        throw new Error(err.error || `Call failed (${res.status})`);
      }

      const data = await res.json();
      setCallLogId(data.call_log_id || data.id || null);
      setCallState("success");
      toast.success(`Call initiated to ${contactName || phone}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to place call";
      setErrorMessage(message);
      setCallState("error");
      toast.error(message);
    }
  }

  // ── Retry ───────────────────────────────────────────────────────────────

  function handleRetry() {
    setCallState("idle");
    setErrorMessage(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#222] bg-[#0a0a0a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4FC3F7]/20">
              <Phone className="h-4 w-4 text-[#4FC3F7]" />
            </div>
            <h3
              id="call-modal-title"
              className="text-lg font-semibold text-white"
            >
              New Call
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition hover:bg-[#1a1a1a] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success State */}
        {callState === "success" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#22c55e]/30 bg-[#22c55e]/10 p-4 text-center">
              <Phone className="mx-auto h-8 w-8 text-[#22c55e] mb-2" />
              <p className="text-sm font-medium text-[#22c55e]">
                Call initiated — ringing {contactName || phone}
              </p>
              {callLogId && (
                <a
                  href={`/calls/${callLogId}`}
                  className="mt-2 inline-block text-xs text-[#4FC3F7] hover:underline"
                >
                  View call details
                </a>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#888] transition hover:text-white"
            >
              Close
            </button>
          </div>
        )}

        {/* Error State */}
        {callState === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 text-center">
              <p className="text-sm font-medium text-[#ef4444]">
                {errorMessage || "Failed to place call"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 rounded-lg bg-[#4FC3F7] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#38B2D8]"
              >
                Retry
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#888] transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Form (idle / loading) */}
        {(callState === "idle" || callState === "loading") && (
          <div className="space-y-4">
            {/* Phone Number */}
            <div>
              <label className="text-xs text-[#888] block mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
                disabled={callState === "loading"}
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="text-xs text-[#888] block mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none"
                disabled={callState === "loading"}
              />
            </div>

            {/* Template Selector */}
            {templates.length > 0 && (
              <div>
                <label className="text-xs text-[#888] block mb-1">
                  Call Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
                  disabled={callState === "loading"}
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Script */}
            <div>
              <label className="text-xs text-[#888] block mb-1">
                Call Script
              </label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Enter a custom script or select a template above..."
                rows={4}
                className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#666] focus:border-[#4FC3F7] focus:outline-none resize-none"
                disabled={callState === "loading"}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handlePlaceCall}
                disabled={callState === "loading" || !phone.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {callState === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Place Call
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={callState === "loading"}
                className="rounded-lg border border-[#333] px-4 py-2.5 text-sm text-[#888] transition hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
