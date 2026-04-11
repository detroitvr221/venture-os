import {
  TrendingUp,
  TrendingDown,
  Users,
  FolderKanban,
  CheckCircle2,
  DollarSign,
  Bot,
  Filter,
} from "lucide-react";

const stats = [
  {
    label: "Total Leads",
    value: "247",
    change: "+12.5%",
    trend: "up" as const,
    icon: Filter,
    color: "#3b82f6",
  },
  {
    label: "Active Clients",
    value: "38",
    change: "+4.2%",
    trend: "up" as const,
    icon: Users,
    color: "#8b5cf6",
  },
  {
    label: "Running Projects",
    value: "12",
    change: "+2",
    trend: "up" as const,
    icon: FolderKanban,
    color: "#22c55e",
  },
  {
    label: "Pending Approvals",
    value: "7",
    change: "-3",
    trend: "down" as const,
    icon: CheckCircle2,
    color: "#eab308",
  },
  {
    label: "Monthly Revenue",
    value: "$84,230",
    change: "+18.3%",
    trend: "up" as const,
    icon: DollarSign,
    color: "#22c55e",
  },
  {
    label: "Agent Costs",
    value: "$2,140",
    change: "+6.1%",
    trend: "up" as const,
    icon: Bot,
    color: "#ef4444",
  },
];

const recentActivity = [
  {
    id: 1,
    action: "New lead captured",
    detail: "TechFlow Inc. - Enterprise AI Integration",
    time: "2 minutes ago",
    type: "lead",
  },
  {
    id: 2,
    action: "Agent completed task",
    detail: "SEO Agent optimized 14 pages for meridianhealth.com",
    time: "18 minutes ago",
    type: "agent",
  },
  {
    id: 3,
    action: "Invoice paid",
    detail: "Vertex Solutions - $12,500 monthly retainer",
    time: "1 hour ago",
    type: "billing",
  },
  {
    id: 4,
    action: "Approval required",
    detail: "New sub-company creation: AeroVista Labs",
    time: "2 hours ago",
    type: "approval",
  },
  {
    id: 5,
    action: "Project milestone",
    detail: "CloudSync MVP reached beta status",
    time: "4 hours ago",
    type: "project",
  },
];

const topAgents = [
  { name: "Sales Agent", tasks: 142, status: "online" },
  { name: "SEO Agent", tasks: 98, status: "online" },
  { name: "Developer Agent", tasks: 76, status: "online" },
  { name: "Research Agent", tasks: 64, status: "busy" },
  { name: "Finance Agent", tasks: 51, status: "offline" },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-[#888]">
          Welcome back. Here is what is happening across your ventures.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[#222] bg-[#0a0a0a] p-5 transition-colors hover:border-[#333]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#888]">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {stat.value}
                  </p>
                </div>
                <div
                  className="rounded-lg p-2.5"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: stat.color }}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-[#22c55e]" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-[#ef4444]" />
                )}
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up" ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-[#666]">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <div className="lg:col-span-3 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] p-3.5"
              >
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    item.type === "lead"
                      ? "bg-[#3b82f6]"
                      : item.type === "agent"
                        ? "bg-[#8b5cf6]"
                        : item.type === "billing"
                          ? "bg-[#22c55e]"
                          : item.type === "approval"
                            ? "bg-[#eab308]"
                            : "bg-[#888]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {item.action}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-[#888]">
                    {item.detail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-[#666]">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agents */}
        <div className="lg:col-span-2 rounded-xl border border-[#222] bg-[#0a0a0a] p-5">
          <h2 className="text-lg font-semibold text-white">
            Top Agents This Month
          </h2>
          <div className="mt-4 space-y-3">
            {topAgents.map((agent, i) => (
              <div
                key={agent.name}
                className="flex items-center gap-3 rounded-lg border border-[#1a1a1a] bg-[#111] p-3.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {agent.name}
                  </p>
                  <p className="text-xs text-[#888]">
                    {agent.tasks} tasks completed
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      agent.status === "online"
                        ? "bg-[#22c55e]"
                        : agent.status === "busy"
                          ? "bg-[#eab308]"
                          : "bg-[#666]"
                    }`}
                  />
                  <span className="text-xs capitalize text-[#888]">
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
