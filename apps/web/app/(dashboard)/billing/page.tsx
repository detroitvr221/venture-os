import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Database,
  Cpu,
  Globe,
} from "lucide-react";

const revenueStats = [
  {
    label: "Monthly Recurring Revenue",
    value: "$84,230",
    change: "+18.3%",
    trend: "up",
    icon: DollarSign,
  },
  {
    label: "Active Subscriptions",
    value: "38",
    change: "+4",
    trend: "up",
    icon: CreditCard,
  },
  {
    label: "Outstanding Invoices",
    value: "$12,450",
    change: "-$3,200",
    trend: "down",
    icon: FileText,
  },
  {
    label: "Avg Revenue Per Client",
    value: "$2,217",
    change: "+8.1%",
    trend: "up",
    icon: TrendingUp,
  },
];

const invoices = [
  {
    id: "INV-2024-089",
    client: "Vertex Solutions",
    amount: "$12,500",
    status: "paid",
    date: "Apr 1, 2026",
  },
  {
    id: "INV-2024-090",
    client: "Atlas Robotics",
    amount: "$8,750",
    status: "paid",
    date: "Apr 3, 2026",
  },
  {
    id: "INV-2024-091",
    client: "CloudSync Ltd.",
    amount: "$5,200",
    status: "pending",
    date: "Apr 5, 2026",
  },
  {
    id: "INV-2024-092",
    client: "NovaPay",
    amount: "$3,800",
    status: "pending",
    date: "Apr 7, 2026",
  },
  {
    id: "INV-2024-093",
    client: "BrightPath Education",
    amount: "$2,950",
    status: "overdue",
    date: "Mar 28, 2026",
  },
  {
    id: "INV-2024-094",
    client: "Meridian Health",
    amount: "$15,000",
    status: "draft",
    date: "Apr 10, 2026",
  },
];

const usageMeters = [
  {
    label: "API Calls",
    used: 847000,
    limit: 1000000,
    unit: "calls",
    icon: Zap,
    color: "#3b82f6",
  },
  {
    label: "Storage",
    used: 42,
    limit: 100,
    unit: "GB",
    icon: Database,
    color: "#8b5cf6",
  },
  {
    label: "Compute Hours",
    used: 312,
    limit: 500,
    unit: "hrs",
    icon: Cpu,
    color: "#22c55e",
  },
  {
    label: "Bandwidth",
    used: 1.2,
    limit: 5,
    unit: "TB",
    icon: Globe,
    color: "#eab308",
  },
];

const revenueByMonth = [
  { month: "Nov", revenue: 52000 },
  { month: "Dec", revenue: 58000 },
  { month: "Jan", revenue: 61000 },
  { month: "Feb", revenue: 67000 },
  { month: "Mar", revenue: 71200 },
  { month: "Apr", revenue: 84230 },
];

const maxRevenue = Math.max(...revenueByMonth.map((m) => m.revenue));

const statusColors: Record<string, { text: string; bg: string }> = {
  paid: { text: "#22c55e", bg: "#22c55e15" },
  pending: { text: "#eab308", bg: "#eab30815" },
  overdue: { text: "#ef4444", bg: "#ef444415" },
  draft: { text: "#888", bg: "#88888815" },
};

export default function BillingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing Dashboard</h1>
        <p className="mt-1 text-sm text-[#888]">
          Revenue tracking, invoicing, and usage monitoring
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {revenueStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#888]">{stat.label}</p>
                <Icon className="h-4 w-4 text-[#666]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">
                {stat.value}
              </p>
              <div className="mt-2 flex items-center gap-1">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#22c55e]" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-[#22c55e]" />
                )}
                <span className="text-xs font-medium text-[#22c55e]">
                  {stat.change}
                </span>
                <span className="text-xs text-[#666]">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
          <p className="text-xs text-[#888]">Last 6 months</p>
          <div className="mt-6 flex items-end gap-3 h-[200px]">
            {revenueByMonth.map((month) => {
              const height = (month.revenue / maxRevenue) * 100;
              return (
                <div
                  key={month.month}
                  className="group flex flex-1 flex-col items-center gap-2"
                >
                  <div className="relative w-full">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1a1a] px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      ${(month.revenue / 1000).toFixed(0)}k
                    </div>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-[#3b82f6] to-[#8b5cf6] transition-all group-hover:opacity-80"
                      style={{ height: `${height * 2}px` }}
                    />
                  </div>
                  <span className="text-xs text-[#888]">{month.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage Meters */}
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">Usage</h2>
          <p className="text-xs text-[#888]">Current billing cycle</p>
          <div className="mt-5 space-y-5">
            {usageMeters.map((meter) => {
              const Icon = meter.icon;
              const pct = (meter.used / meter.limit) * 100;
              const displayUsed =
                meter.used >= 1000
                  ? `${(meter.used / 1000).toFixed(0)}k`
                  : meter.used.toString();
              const displayLimit =
                meter.limit >= 1000000
                  ? `${(meter.limit / 1000000).toFixed(0)}M`
                  : meter.limit >= 1000
                    ? `${(meter.limit / 1000).toFixed(0)}k`
                    : meter.limit.toString();
              return (
                <div key={meter.label}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4"
                        style={{ color: meter.color }}
                      />
                      <span className="text-sm text-white">{meter.label}</span>
                    </div>
                    <span className="text-xs text-[#888]">
                      {displayUsed} / {displayLimit} {meter.unit}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor:
                          pct > 90 ? "#ef4444" : pct > 70 ? "#eab308" : meter.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
          <button className="text-sm text-[#3b82f6] hover:text-[#60a5fa] transition-colors">
            View All
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="pb-3 text-left text-xs font-medium text-[#888]">
                  Invoice
                </th>
                <th className="pb-3 text-left text-xs font-medium text-[#888]">
                  Client
                </th>
                <th className="pb-3 text-left text-xs font-medium text-[#888]">
                  Amount
                </th>
                <th className="pb-3 text-left text-xs font-medium text-[#888]">
                  Date
                </th>
                <th className="pb-3 text-left text-xs font-medium text-[#888]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#111]"
                >
                  <td className="py-3.5 text-sm font-mono text-[#888]">
                    {inv.id}
                  </td>
                  <td className="py-3.5 text-sm text-white">{inv.client}</td>
                  <td className="py-3.5 text-sm font-medium text-white">
                    {inv.amount}
                  </td>
                  <td className="py-3.5 text-sm text-[#888]">{inv.date}</td>
                  <td className="py-3.5">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize"
                      style={{
                        color: statusColors[inv.status].text,
                        backgroundColor: statusColors[inv.status].bg,
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
