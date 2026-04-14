"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { BookOpen, Plus, Pencil, Trash2, ArrowLeft, Eye, Code2, Save, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";
import { InlineReportPreview } from "@/components/InlineReportPreview";

/* ── Types ──────────────────────────────────────────────────────── */

type Playbook = {
  id: string;
  name: string;
  category: string;
  content: string;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type Mode = "list" | "edit" | "create";

const CATEGORIES = [
  "sales",
  "delivery",
  "operations",
  "finance",
  "onboarding",
  "compliance",
  "general",
] as const;

const PAGE_SIZE = 25;

/* ── Markdown Renderer ──────────────────────────────────────────── */

function renderMarkdown(raw: string): string {
  let html = raw
    // escape html entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre class="rounded-lg bg-[#0a0a0a] border border-[#333] p-4 overflow-x-auto my-3"><code class="text-sm text-[#e2e8f0]">${code.trim()}</code></pre>`;
  });

  // inline code
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-[#222] px-1.5 py-0.5 text-sm text-[#4FC3F7]">$1</code>');

  // headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-5 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-[#4FC3F7] mt-6 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-6 mb-3">$1</h1>');

  // horizontal rule
  html = html.replace(/^---$/gm, '<hr class="border-[#333] my-4" />');

  // blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-[#4FC3F7] pl-4 my-2 text-[#aaa] italic">$1</blockquote>');

  // bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="text-white"><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em class="text-[#ccc]">$1</em>');

  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-[#4FC3F7] underline hover:text-white">$1</a>');

  // unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 text-[#ccc] list-disc list-inside">$1</li>');

  // ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-[#ccc] list-decimal list-inside">$1</li>');

  // wrap consecutive li elements in ul/ol (simplified)
  html = html.replace(/((?:<li class="ml-4 text-\[#ccc\] list-disc list-inside">.*<\/li>\n?)+)/g, '<ul class="my-2">$1</ul>');
  html = html.replace(/((?:<li class="ml-4 text-\[#ccc\] list-decimal list-inside">.*<\/li>\n?)+)/g, '<ol class="my-2">$1</ol>');

  // paragraphs — lines that aren't already wrapped in tags
  html = html
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<code") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("</")
      ) {
        return line;
      }
      return `<p class="text-[#aaa] my-1 leading-relaxed">${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function PlaybooksPage() {
  const orgId = useOrgId();

  // List state
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Editor state
  const [mode, setMode] = useState<Mode>("list");
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewActive, setPreviewActive] = useState(true);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiImproving, setAiImproving] = useState(false);

  /* ── Data Loading ───────────────────────────────────────────── */

  const loadPlaybooks = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("playbooks")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("category")
      .order("name");

    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const { data, count } = await query.range(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE - 1
    );
    setPlaybooks(data || []);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [orgId, page, categoryFilter, search]);

  useEffect(() => {
    if (mode === "list") loadPlaybooks();
  }, [loadPlaybooks, mode]);

  /* ── Editor Helpers ─────────────────────────────────────────── */

  const openCreate = () => {
    setEditingPlaybook(null);
    setTitle("");
    setCategory("general");
    setContent("");
    setMode("create");
  };

  const openEdit = (pb: Playbook) => {
    setEditingPlaybook(pb);
    setTitle(pb.name);
    setCategory(pb.category);
    setContent(pb.content);
    setMode("edit");
  };

  const backToList = () => {
    setMode("list");
    setEditingPlaybook(null);
  };

  /* ── Save ───────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (mode === "create") {
      const { error } = await supabase.from("playbooks").insert({
        organization_id: orgId,
        name: title.trim(),
        category,
        content: content.trim(),
        version: 1,
        metadata: {},
        created_by: user?.id ?? null,
      });
      if (error) {
        toast.error("Failed to create playbook");
        console.error(error);
      } else {
        toast.success("Playbook created");
        backToList();
      }
    } else if (mode === "edit" && editingPlaybook) {
      const { error } = await supabase
        .from("playbooks")
        .update({
          name: title.trim(),
          category,
          content: content.trim(),
          version: (editingPlaybook.version || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPlaybook.id);
      if (error) {
        toast.error("Failed to update playbook");
        console.error(error);
      } else {
        toast.success("Playbook updated");
        backToList();
      }
    }
    setSaving(false);
  };

  /* ── Delete ─────────────────────────────────────────────────── */

  const handleDelete = async (id: string) => {
    if (deleting === id) {
      // Second click = confirm
      const supabase = createClient();
      const { error } = await supabase.from("playbooks").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete playbook");
      } else {
        toast.success("Playbook deleted");
        loadPlaybooks();
      }
      setDeleting(null);
    } else {
      setDeleting(id);
      // Auto-cancel after 3s
      setTimeout(() => setDeleting((cur) => (cur === id ? null : cur)), 3000);
    }
  };

  /* ── AI Improve ─────────────────────────────────────────────── */

  const handleAiImprove = async () => {
    if (!title.trim() && !content.trim()) return;
    setAiImproving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const { data: job } = await supabase.from("audit_jobs").insert({
        organization_id: orgId,
        job_type: "custom",
        status: "queued",
        input_payload: { title, category, content },
        target_entity_type: "playbook",
        target_entity_id: editingPlaybook?.id || null,
        external_system: "openclaw",
        started_at: new Date().toISOString(),
      }).select("id").single();

      if (job?.id) {
        setAiJobId(job.id);
        fetch("/api/openclaw/trigger", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            agent_id: "main",
            message: `Improve this SOP playbook. Title: ${title || "Untitled"}. Category: ${category}. Content:\n${content}\n\nEnhance clarity, completeness, and formatting. Return improved markdown with better structure, actionable steps, and best practices.`,
            job_id: job.id,
          }),
        }).catch(() => {});
      }
    } catch {}
    setAiImproving(false);
  };

  /* ── Derived ────────────────────────────────────────────────── */

  const categories = useMemo(
    () => [...new Set(playbooks.map((p) => p.category))],
    [playbooks]
  );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  /* ── Rendered markdown ──────────────────────────────────────── */

  const renderedPreview = useMemo(() => renderMarkdown(content), [content]);

  /* ── Editor View ────────────────────────────────────────────── */

  if (mode === "edit" || mode === "create") {
    return (
      <div className="flex h-[calc(100vh-120px)] flex-col">
        {/* Editor Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={backToList}
              className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-[#888] transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </button>
            <h1 className="text-xl font-bold text-white">
              {mode === "create" ? "New Playbook" : "Edit Playbook"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle preview */}
            <button
              onClick={() => setPreviewActive(!previewActive)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                previewActive
                  ? "border-[#4FC3F7]/30 bg-[#4FC3F7]/10 text-[#4FC3F7]"
                  : "border-[#333] bg-[#0a0a0a] text-[#888] hover:text-white"
              }`}
            >
              {previewActive ? <Eye className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
              {previewActive ? "Preview" : "Editor Only"}
            </button>
            <button
              onClick={handleAiImprove}
              disabled={aiImproving}
              className="flex items-center gap-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-[#F5C542] transition-colors hover:bg-[#111] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {aiImproving ? "Improving..." : "AI Improve"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#4FC3F7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3aa8d8] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Title + Category Row */}
        <div className="mb-4 flex gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playbook title..."
            className="flex-1 rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Version info */}
        {mode === "edit" && editingPlaybook && (
          <div className="mb-3 flex items-center gap-4 text-xs text-[#666]">
            <span>Version {editingPlaybook.version}</span>
            {editingPlaybook.updated_at && (
              <span>
                Last updated:{" "}
                {new Date(editingPlaybook.updated_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {editingPlaybook.created_by && (
              <span>Author: {editingPlaybook.created_by.slice(0, 8)}...</span>
            )}
          </div>
        )}

        {/* Split Editor */}
        <div className={`flex flex-1 gap-4 min-h-0 ${!previewActive ? "" : ""}`}>
          {/* Left: Textarea */}
          <div className={`flex flex-col ${previewActive ? "w-1/2" : "w-full"}`}>
            <div className="mb-1 flex items-center gap-2 text-xs text-[#666]">
              <Code2 className="h-3 w-3" />
              <span>Markdown</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your playbook content in markdown..."
              className="flex-1 resize-none rounded-lg border border-[#333] bg-[#0a0a0a] p-4 font-mono text-sm leading-relaxed text-[#ccc] placeholder:text-[#444] focus:border-[#4FC3F7] focus:outline-none"
              spellCheck={false}
            />
          </div>

          {/* Right: Preview */}
          {previewActive && (
            <div className="flex w-1/2 flex-col">
              <div className="mb-1 flex items-center gap-2 text-xs text-[#666]">
                <Eye className="h-3 w-3" />
                <span>Preview</span>
              </div>
              <div
                className="flex-1 overflow-y-auto rounded-lg border border-[#333] bg-[#0a0a0a] p-4"
                dangerouslySetInnerHTML={{ __html: renderedPreview }}
              />
            </div>
          )}
        </div>

        {/* AI Report Preview */}
        {aiJobId && (
          <div className="mt-4">
            <InlineReportPreview jobId={aiJobId} autoExpand showStatusBar />
          </div>
        )}
      </div>
    );
  }

  /* ── List View ──────────────────────────────────────────────── */

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Playbooks & SOPs</h1>
          <p className="mt-1 text-sm text-[#888]">
            {totalCount} standard operating procedure{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#4FC3F7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3aa8d8]"
        >
          <Plus className="h-4 w-4" />
          New Playbook
        </button>
      </div>

      {/* Search + Category Filter */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search playbooks..."
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] py-2 pl-10 pr-4 text-sm text-white placeholder:text-[#666] focus:border-[#4FC3F7] focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-[#222] bg-[#0a0a0a]"
            />
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <BookOpen className="mb-3 h-10 w-10 text-[#333]" />
          <p className="text-sm text-[#666]">No playbooks found</p>
          <button
            onClick={openCreate}
            className="mt-4 flex items-center gap-2 text-sm text-[#4FC3F7] hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Create your first playbook
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const catPlaybooks = playbooks.filter((p) => p.category === cat);
            if (catPlaybooks.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#888]">
                  {cat}
                </h2>
                <div className="space-y-2">
                  {catPlaybooks.map((pb) => (
                    <div
                      key={pb.id}
                      className="group flex items-center justify-between rounded-xl border border-[#222] bg-[#0a0a0a] px-5 py-3 transition hover:border-[#333]"
                    >
                      <button
                        onClick={() => openEdit(pb)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-[#4FC3F7]" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-white">{pb.name}</span>
                          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-[#666]">
                            <span className="rounded-full bg-[#222] px-2 py-0.5">
                              v{pb.version}
                            </span>
                            {pb.updated_at && (
                              <span>
                                Updated{" "}
                                {new Date(pb.updated_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(pb)}
                          className="rounded-lg p-2 text-[#888] transition hover:bg-[#222] hover:text-white"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(pb.id);
                          }}
                          className={`rounded-lg p-2 transition ${
                            deleting === pb.id
                              ? "bg-[#ef4444]/10 text-[#ef4444]"
                              : "text-[#888] hover:bg-[#222] hover:text-[#ef4444]"
                          }`}
                          title={deleting === pb.id ? "Click again to confirm" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
