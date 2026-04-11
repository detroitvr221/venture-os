"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Filter,
  Users,
  FolderKanban,
  Bot,
  GitBranch,
  Brain,
  CheckCircle2,
  CreditCard,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  Send,
  LogOut,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Filter },
  { name: "Proposals", href: "/proposals", icon: FileText },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "SEO Audits", href: "/seo", icon: Search },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Workflows", href: "/workflows", icon: GitBranch },
  { name: "Memory", href: "/memory", icon: Brain },
  { name: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { name: "Email", href: "/email", icon: Mail },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-[#222] bg-[#0a0a0a] transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[#222] px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
            <span className="text-sm font-bold text-white">NB</span>
          </div>
          {!collapsed && (
            <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-lg font-bold text-transparent">
              NB Digital
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/overview" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#888] hover:bg-[#111] hover:text-[#ccc]"
                    }`}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        isActive
                          ? "text-[#3b82f6]"
                          : "text-[#666] group-hover:text-[#999]"
                      }`}
                    />
                    {!collapsed && <span>{item.name}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
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
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[#666] transition-colors hover:bg-[#111] hover:text-[#999]"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#111]">
        <div className="mx-auto max-w-[1400px] p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
