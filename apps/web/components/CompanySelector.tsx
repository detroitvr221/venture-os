"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { useCompany } from "@/lib/company-context";

const DOT_COLORS = [
  "#4FC3F7", "#F5C542", "#66BB6A", "#EF5350", "#AB47BC",
  "#FF7043", "#26C6DA", "#EC407A", "#8D6E63", "#78909C",
];

function getDotColor(index: number) {
  return DOT_COLORS[index % DOT_COLORS.length];
}

export default function CompanySelector() {
  const { companyId, companyName, setCompanyId, companies } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (companies.length === 0) return null;

  return (
    <div ref={ref} className="relative px-2 py-2 border-b border-[#222]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-[#1a1a1a]"
      >
        <Building2 className="h-4 w-4 shrink-0 text-[#4FC3F7]" />
        <span className="flex-1 truncate text-[#ccc]">{companyName}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[#666] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-lg border border-[#222] bg-[#111] shadow-xl">
          {/* All Companies option */}
          <button
            onClick={() => {
              setCompanyId(null);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[#1a1a1a] rounded-t-lg ${
              companyId === null ? "text-[#4FC3F7]" : "text-[#999]"
            }`}
          >
            <div className="flex h-2 w-2 shrink-0 items-center justify-center">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    companyId === null
                      ? "linear-gradient(135deg, #4FC3F7, #F5C542)"
                      : "#444",
                }}
              />
            </div>
            <span>All Companies</span>
          </button>

          <div className="mx-3 border-t border-[#222]" />

          {/* Company list */}
          {companies.map((company, i) => (
            <button
              key={company.id}
              onClick={() => {
                setCompanyId(company.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[#1a1a1a] ${
                i === companies.length - 1 ? "rounded-b-lg" : ""
              } ${
                companyId === company.id ? "text-[#4FC3F7]" : "text-[#999]"
              }`}
            >
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    companyId === company.id
                      ? "#4FC3F7"
                      : getDotColor(i),
                }}
              />
              <span className="truncate">{company.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
