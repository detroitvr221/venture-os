"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Users,
  DollarSign,
  Globe,
  ArrowUpRight,
  Crown,
  MoreHorizontal,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
  clientCount: number;
  monthlyRevenue: number;
  status: "active" | "setup" | "paused";
  isMaster: boolean;
  website?: string;
  agentCount: number;
}

const companies: Company[] = [
  {
    id: "1",
    name: "NorthBridge Digital",
    industry: "AI Services & Consulting",
    description:
      "The master holding company. Full-service AI consulting, development, and managed services for enterprises.",
    clientCount: 24,
    monthlyRevenue: 52000,
    status: "active",
    isMaster: true,
    website: "northbridgedigital.com",
    agentCount: 11,
  },
  {
    id: "2",
    name: "CloudSync Solutions",
    industry: "SaaS / Cloud Infrastructure",
    description:
      "Real-time data synchronization platform for distributed teams. Enterprise-grade sync engine with 99.99% uptime.",
    clientCount: 8,
    monthlyRevenue: 18500,
    status: "active",
    isMaster: false,
    website: "cloudsync.io",
    agentCount: 3,
  },
  {
    id: "3",
    name: "AeroVista Labs",
    industry: "AI / Drone Analytics",
    description:
      "AI-powered drone analytics for agriculture, surveying, and environmental monitoring. Currently in pre-launch.",
    clientCount: 0,
    monthlyRevenue: 0,
    status: "setup",
    isMaster: false,
    agentCount: 2,
  },
];

export default function CompaniesPage() {
  const [showCreate, setShowCreate] = useState(false);

  const totalRevenue = companies.reduce((s, c) => s + c.monthlyRevenue, 0);
  const totalClients = companies.reduce((s, c) => s + c.clientCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Company Portfolio
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            {companies.length} companies &middot; {totalClients} total clients
            &middot; ${totalRevenue.toLocaleString()}/mo revenue
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Company
        </button>
      </div>

      {/* Company Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <div
            key={company.id}
            className={`group relative rounded-xl border bg-[#0a0a0a] p-6 transition-all hover:border-[#333] ${
              company.isMaster
                ? "border-[#3b82f640]"
                : "border-[#222]"
            }`}
          >
            {/* Master badge */}
            {company.isMaster && (
              <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] px-2.5 py-0.5">
                <Crown className="h-3 w-3 text-white" />
                <span className="text-[10px] font-semibold text-white">
                  MASTER
                </span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                    company.isMaster
                      ? "bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]"
                      : "bg-[#1a1a1a]"
                  }`}
                >
                  <Building2
                    className={`h-5 w-5 ${
                      company.isMaster ? "text-white" : "text-[#888]"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {company.name}
                  </h3>
                  <p className="text-xs text-[#888]">{company.industry}</p>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4 text-[#666]" />
              </button>
            </div>

            {/* Description */}
            <p className="mt-3 text-xs leading-relaxed text-[#888]">
              {company.description}
            </p>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <Users className="mx-auto h-4 w-4 text-[#666]" />
                <p className="mt-1.5 text-lg font-bold text-white">
                  {company.clientCount}
                </p>
                <p className="text-[10px] text-[#666]">Clients</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <DollarSign className="mx-auto h-4 w-4 text-[#666]" />
                <p className="mt-1.5 text-lg font-bold text-white">
                  {company.monthlyRevenue > 0
                    ? `$${(company.monthlyRevenue / 1000).toFixed(0)}k`
                    : "$0"}
                </p>
                <p className="text-[10px] text-[#666]">MRR</p>
              </div>
              <div className="rounded-lg bg-[#111] p-3 text-center">
                <Building2 className="mx-auto h-4 w-4 text-[#666]" />
                <p className="mt-1.5 text-lg font-bold text-white">
                  {company.agentCount}
                </p>
                <p className="text-[10px] text-[#666]">Agents</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-[#1a1a1a] pt-4">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                  company.status === "active"
                    ? "bg-[#22c55e15] text-[#22c55e]"
                    : company.status === "setup"
                      ? "bg-[#eab30815] text-[#eab308]"
                      : "bg-[#88888815] text-[#888]"
                }`}
              >
                {company.status === "setup" ? "Setting Up" : company.status}
              </span>
              {company.website && (
                <a
                  href={`https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  {company.website}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Add Company Card */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#333] bg-[#0a0a0a] transition-all hover:border-[#3b82f6] hover:bg-[#111]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a1a]">
            <Plus className="h-6 w-6 text-[#666]" />
          </div>
          <p className="mt-3 text-sm font-medium text-[#888]">
            Create New Company
          </p>
          <p className="mt-1 text-xs text-[#666]">
            Launch a new venture or subsidiary
          </p>
        </button>
      </div>
    </div>
  );
}
