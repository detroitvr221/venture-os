"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Users, Activity, FileText, ArrowLeft } from "lucide-react";

const adminNav = [
  { name: "Overview", href: "/admin", icon: ShieldCheck },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Sessions", href: "/admin/sessions", icon: Activity },
  { name: "Audit Log", href: "/admin/audit", icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: member } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!member || !["owner", "admin"].includes(member.role)) {
        router.push("/overview");
        return;
      }
      setAuthorized(true);
      setLoading(false);
    }
    checkRole();
  }, [router]);

  if (loading) return <div className="flex items-center justify-center py-32"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4FC3F7] border-t-transparent" /></div>;
  if (!authorized) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/overview" className="flex items-center gap-1 text-xs text-[#888] hover:text-white">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
          <div className="h-4 w-px bg-[#333]" />
          <h1 className="text-lg font-bold text-white">Admin Panel</h1>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isActive ? "bg-[#4FC3F7] text-white" : "bg-[#1a1a1a] text-[#888] hover:text-white"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {item.name}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
