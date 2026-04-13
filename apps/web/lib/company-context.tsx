"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface Company {
  id: string;
  name: string;
  slug: string;
}

interface CompanyContextType {
  companyId: string | null; // null = "All Companies"
  companyName: string;
  setCompanyId: (id: string | null) => void;
  companies: Company[];
}

const CompanyContext = createContext<CompanyContextType>({
  companyId: null,
  companyName: "All Companies",
  setCompanyId: () => {},
  companies: [],
});

const STORAGE_KEY = "northbridge_selected_company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyIdState] = useState<string | null>(null);

  // Load persisted selection from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== "null") {
      setCompanyIdState(stored);
    }
  }, []);

  // Fetch sub_companies from Supabase
  useEffect(() => {
    const supabase = createClient();

    async function loadCompanies() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get the user's org_id
      const { data: member } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!member?.organization_id) return;

      // Fetch sub_companies for this org
      const { data: subs } = await supabase
        .from("sub_companies")
        .select("id, name, slug")
        .eq("org_id", member.organization_id)
        .order("name");

      if (subs) {
        setCompanies(subs);
      }
    }

    loadCompanies();
  }, []);

  const setCompanyId = (id: string | null) => {
    setCompanyIdState(id);
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const companyName =
    companyId === null
      ? "All Companies"
      : companies.find((c) => c.id === companyId)?.name ?? "All Companies";

  return (
    <CompanyContext.Provider
      value={{ companyId, companyName, setCompanyId, companies }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return ctx;
}
