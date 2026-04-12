"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Filter, Users, FolderKanban, Bot, GitBranch, Brain,
  CheckCircle2, CreditCard, Building2, Settings, ChevronLeft, ChevronRight,
  FileText, Search, Send, LogOut, Mail, ClipboardList, MessageSquare,
  ShieldCheck, UserPlus, BookOpen, Menu, X, Calendar, Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navGroups = [
  {
    label: null, // No label for top items
    items: [
      { name: "Chat", href: "/chat", icon: MessageSquare },
      { name: "Overview", href: "/overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Leads", href: "/leads", icon: Filter },
      { name: "Proposals", href: "/proposals", icon: FileText },
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Intake", href: "/intake", icon: ClipboardList },
    ],
  },
  {
    label: "Delivery",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Onboarding", href: "/onboarding", icon: UserPlus },
      { name: "SEO Audits", href: "/seo", icon: Search },
      { name: "Campaigns", href: "/campaigns", icon: Send },
      { name: "Calendar", href: "/calendar", icon: Calendar },
      { name: "Email", href: "/email", icon: Mail },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Systems", href: "/agents", icon: Bot },
      { name: "Workflows", href: "/workflows", icon: GitBranch },
      { name: "Knowledge", href: "/memory", icon: Brain },
      { name: "Approvals", href: "/approvals", icon: CheckCircle2 },
      { name: "Playbooks", href: "/playbooks", icon: BookOpen },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "Billing", href: "/billing", icon: CreditCard },
      { name: "Companies", href: "/companies", icon: Building2 },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Admin", href: "/admin", icon: ShieldCheck, adminOnly: true as const },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      if (user) {
        const { data: member } = await supabase
          .from("organization_members")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setUserRole(member?.role ?? null);
      }
    });
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isAdmin = userRole === "owner" || userRole === "admin";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-[#222] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
            <span className="text-sm font-bold text-white">NB</span>
          </div>
          {!collapsed && (
            <span className="bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] bg-clip-text text-lg font-bold text-transparent">
              Northbridge
            </span>
          )}
        </div>
        {/* Mobile close button */}
        <button onClick={() => setMobileOpen(false)} className="md:hidden rounded p-1 text-[#888] hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group, gi) => {
          const groupItems = group.items.filter((item) =>
            "adminOnly" in item && item.adminOnly ? isAdmin : true
          );
          if (groupItems.length === 0) return null;
          return (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && !collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#555]">{group.label}</p>
              )}
              {collapsed && gi > 0 && <div className="mx-3 mb-2 border-t border-[#222]" />}
              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          isActive ? "bg-[#1a1a2a] text-white" : "text-[#888] hover:bg-[#111] hover:text-[#ccc]"
                        }`}
                        title={collapsed ? item.name : undefined}
                      >
                        <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#4FC3F7]" : "text-[#666] group-hover:text-[#999]"}`} />
                        {!collapsed && <span>{item.name}</span>}
                        {isActive && !collapsed && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#4FC3F7]" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User + Sign Out + Collapse */}
      <div className="border-t border-[#222] p-2 space-y-1">
        {userEmail && !collapsed && (
          <div className="px-3 py-2">
            <p className="truncate text-xs text-[#888]">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#888] transition-colors hover:bg-[#1a1a1a] hover:text-[#ef4444]"
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[#666] transition-colors hover:bg-[#111] hover:text-[#999]"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop */}
      <aside className={`hidden md:flex flex-col border-r border-[#222] bg-[#0a0a0a] transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}>
        {sidebarContent}
      </aside>

      {/* Sidebar — mobile (slide-in) */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#0a0a0a] transition-transform duration-300 md:hidden ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#111]">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#222] bg-[#0a0a0a] px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded p-1.5 text-[#888] hover:text-white" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#4FC3F7] to-[#F5C542]">
            <span className="text-[10px] font-bold text-white">NB</span>
          </div>
          <span className="flex-1 text-sm font-medium text-white">Northbridge</span>
          <button className="relative rounded p-1.5 text-[#888] hover:text-white" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4FC3F7] text-[8px] font-bold text-white">3</span>
          </button>
        </div>
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
