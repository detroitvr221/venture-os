"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  X,
  Users,
  FolderKanban,
  Mail,
  FileText,
  CheckSquare,
  BarChart3,
  Filter,
} from "lucide-react";

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: string;
  icon: React.ReactNode;
};

type CategoryResults = {
  category: string;
  icon: React.ReactNode;
  results: SearchResult[];
};

const MAX_PER_CATEGORY = 5;

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CategoryResults[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    const supabase = createClient();
    const pattern = `%${q}%`;

    try {
      const [leads, clients, projects, emails, tasks, proposals, reports] =
        await Promise.all([
          supabase
            .from("leads")
            .select("id, contact_name, company_name, email")
            .or(
              `contact_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern}`
            )
            .limit(MAX_PER_CATEGORY),
          supabase
            .from("clients")
            .select("id, name, company, industry")
            .or(
              `name.ilike.${pattern},company.ilike.${pattern},industry.ilike.${pattern}`
            )
            .limit(MAX_PER_CATEGORY),
          supabase
            .from("projects")
            .select("id, name, description")
            .or(`name.ilike.${pattern},description.ilike.${pattern}`)
            .limit(MAX_PER_CATEGORY),
          supabase
            .from("emails")
            .select("id, subject, from_address")
            .or(`subject.ilike.${pattern},from_address.ilike.${pattern}`)
            .limit(MAX_PER_CATEGORY),
          supabase
            .from("tasks")
            .select("id, title")
            .ilike("title", pattern)
            .limit(MAX_PER_CATEGORY),
          supabase
            .from("proposals")
            .select("id, title")
            .ilike("title", pattern)
            .limit(MAX_PER_CATEGORY),
          supabase
            .from("reports")
            .select("id, title, target_url")
            .or(`title.ilike.${pattern},target_url.ilike.${pattern}`)
            .limit(MAX_PER_CATEGORY),
        ]);

      const categories: CategoryResults[] = [];

      if (leads.data?.length) {
        categories.push({
          category: "Leads",
          icon: <Filter className="h-4 w-4" />,
          results: leads.data.map((l) => ({
            id: l.id,
            title: l.contact_name || l.company_name || "Unnamed Lead",
            subtitle: l.company_name || l.email || undefined,
            href: `/leads?id=${l.id}`,
            category: "Leads",
            icon: <Filter className="h-4 w-4 text-[#4FC3F7]" />,
          })),
        });
      }

      if (clients.data?.length) {
        categories.push({
          category: "Clients",
          icon: <Users className="h-4 w-4" />,
          results: clients.data.map((c) => ({
            id: c.id,
            title: c.name || c.company || "Unnamed Client",
            subtitle: c.company || c.industry || undefined,
            href: `/clients/${c.id}`,
            category: "Clients",
            icon: <Users className="h-4 w-4 text-[#8B5CF6]" />,
          })),
        });
      }

      if (projects.data?.length) {
        categories.push({
          category: "Projects",
          icon: <FolderKanban className="h-4 w-4" />,
          results: projects.data.map((p) => ({
            id: p.id,
            title: p.name || "Unnamed Project",
            subtitle: p.description?.slice(0, 60) || undefined,
            href: `/projects/${p.id}`,
            category: "Projects",
            icon: <FolderKanban className="h-4 w-4 text-[#F5C542]" />,
          })),
        });
      }

      if (emails.data?.length) {
        categories.push({
          category: "Emails",
          icon: <Mail className="h-4 w-4" />,
          results: emails.data.map((e) => ({
            id: e.id,
            title: e.subject || "No Subject",
            subtitle: e.from_address || undefined,
            href: `/email?id=${e.id}`,
            category: "Emails",
            icon: <Mail className="h-4 w-4 text-[#22D3EE]" />,
          })),
        });
      }

      if (tasks.data?.length) {
        categories.push({
          category: "Tasks",
          icon: <CheckSquare className="h-4 w-4" />,
          results: tasks.data.map((t) => ({
            id: t.id,
            title: t.title || "Untitled Task",
            href: `/tasks?id=${t.id}`,
            category: "Tasks",
            icon: <CheckSquare className="h-4 w-4 text-[#10B981]" />,
          })),
        });
      }

      if (proposals.data?.length) {
        categories.push({
          category: "Proposals",
          icon: <FileText className="h-4 w-4" />,
          results: proposals.data.map((p) => ({
            id: p.id,
            title: p.title || "Untitled Proposal",
            href: `/proposals/${p.id}`,
            category: "Proposals",
            icon: <FileText className="h-4 w-4 text-[#F472B6]" />,
          })),
        });
      }

      if (reports.data?.length) {
        categories.push({
          category: "Reports",
          icon: <BarChart3 className="h-4 w-4" />,
          results: reports.data.map((r) => ({
            id: r.id,
            title: r.title || r.target_url || "Untitled Report",
            subtitle: r.target_url || undefined,
            href: `/reports/${r.id}`,
            category: "Reports",
            icon: <BarChart3 className="h-4 w-4 text-[#FB923C]" />,
          })),
        });
      }

      setResults(categories);
      setActiveIndex(-1);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Flatten for keyboard nav
  const flatResults = results.flatMap((c) => c.results);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < flatResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : flatResults.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0 && flatResults[activeIndex]) {
      e.preventDefault();
      navigateTo(flatResults[activeIndex].href);
    }
  };

  const navigateTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-[640px] overflow-hidden rounded-xl border border-[#222] bg-[#111] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#222] px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-[#555]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search leads, clients, projects, emails..."
            className="flex-1 bg-transparent text-base text-white placeholder-[#555] outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="rounded p-0.5 text-[#555] hover:text-[#999]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[#333] bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#333] border-t-[#4FC3F7]" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-[#555]">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {!loading &&
            results.map((group) => (
              <div key={group.category}>
                <div className="sticky top-0 bg-[#111] px-4 py-2">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
                    {group.icon}
                    {group.category}
                    <span className="text-[#444]">({group.results.length})</span>
                  </p>
                </div>
                <ul>
                  {group.results.map((result) => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <li key={`${result.category}-${result.id}`}>
                        <button
                          onClick={() => navigateTo(result.href)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            activeIndex === idx
                              ? "bg-[#1a1a2a]"
                              : "hover:bg-[#1a1a1a]"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a]">
                            {result.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="truncate text-xs text-[#666]">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] text-[#444]">
                            {result.category}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>

        {/* Footer hint */}
        {!loading && results.length > 0 && (
          <div className="flex items-center gap-4 border-t border-[#222] px-4 py-2">
            <span className="flex items-center gap-1 text-[10px] text-[#444]">
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-[9px]">
                &uarr;&darr;
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[#444]">
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-[9px]">
                &crarr;
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[#444]">
              <kbd className="rounded border border-[#333] bg-[#1a1a1a] px-1 py-0.5 text-[9px]">
                esc
              </kbd>
              close
            </span>
          </div>
        )}

        {/* Empty state prompt */}
        {!loading && !query && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#555]">
              Start typing to search across your workspace
            </p>
            <p className="mt-1 text-xs text-[#444]">
              Leads, clients, projects, emails, tasks, proposals, reports
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
