import {
  Bot,
  Cpu,
  Database,
  Wrench,
  Activity,
  Zap,
} from "lucide-react";

interface Agent {
  name: string;
  role: string;
  model: string;
  status: "online" | "offline" | "busy";
  tools: number;
  memoryScope: string;
  tasksToday: number;
  description: string;
}

const agents: Agent[] = [
  {
    name: "CEO Agent",
    role: "Chief Executive Officer",
    model: "Claude Opus",
    status: "online",
    tools: 15,
    memoryScope: "Global",
    tasksToday: 23,
    description:
      "Orchestrates all agent activities. Handles strategic decisions, approvals, and cross-company coordination.",
  },
  {
    name: "Sales Agent",
    role: "Sales & Business Development",
    model: "Claude Sonnet",
    status: "online",
    tools: 12,
    memoryScope: "CRM + Leads",
    tasksToday: 42,
    description:
      "Manages lead qualification, outreach sequences, proposal generation, and pipeline management.",
  },
  {
    name: "SEO Agent",
    role: "Search Engine Optimization",
    model: "Claude Sonnet",
    status: "online",
    tools: 8,
    memoryScope: "Content + Analytics",
    tasksToday: 31,
    description:
      "Runs site audits, keyword research, content optimization, and backlink analysis for all properties.",
  },
  {
    name: "Web Presence Agent",
    role: "Web Design & Development",
    model: "Claude Sonnet",
    status: "busy",
    tools: 10,
    memoryScope: "Projects",
    tasksToday: 18,
    description:
      "Builds and maintains web properties. Handles design systems, performance, and deployment pipelines.",
  },
  {
    name: "AI Integration Agent",
    role: "AI Solutions Architect",
    model: "Claude Opus",
    status: "online",
    tools: 14,
    memoryScope: "Technical + Clients",
    tasksToday: 15,
    description:
      "Designs and implements AI solutions for clients. Manages model selection, fine-tuning, and integration.",
  },
  {
    name: "Venture Builder Agent",
    role: "Company Builder & Strategist",
    model: "Claude Opus",
    status: "online",
    tools: 11,
    memoryScope: "Companies + Market",
    tasksToday: 8,
    description:
      "Identifies new ventures, performs market analysis, and scaffolds new sub-companies.",
  },
  {
    name: "Developer Agent",
    role: "Full-Stack Development",
    model: "Claude Sonnet",
    status: "online",
    tools: 18,
    memoryScope: "Codebase + Docs",
    tasksToday: 56,
    description:
      "Writes, reviews, and deploys code across all projects. Manages CI/CD, testing, and code quality.",
  },
  {
    name: "Ops Agent",
    role: "Operations & Infrastructure",
    model: "Claude Haiku",
    status: "online",
    tools: 9,
    memoryScope: "Infra + Logs",
    tasksToday: 34,
    description:
      "Manages servers, monitors uptime, handles deployments, and responds to incidents across all ventures.",
  },
  {
    name: "Finance Agent",
    role: "Financial Controller",
    model: "Claude Sonnet",
    status: "offline",
    tools: 7,
    memoryScope: "Billing + Revenue",
    tasksToday: 12,
    description:
      "Tracks revenue, manages invoicing, reconciles accounts, and generates financial reports.",
  },
  {
    name: "Research Agent",
    role: "Market & Technology Research",
    model: "Claude Opus",
    status: "busy",
    tools: 6,
    memoryScope: "Market Intel",
    tasksToday: 9,
    description:
      "Conducts competitive analysis, market research, technology trends, and opportunity identification.",
  },
  {
    name: "Compliance Agent",
    role: "Legal & Compliance",
    model: "Claude Sonnet",
    status: "online",
    tools: 5,
    memoryScope: "Legal + Policies",
    tasksToday: 7,
    description:
      "Reviews contracts, ensures regulatory compliance, manages risk assessment, and maintains policies.",
  },
];

export default function AgentsPage() {
  const onlineCount = agents.filter((a) => a.status === "online").length;
  const totalTasksToday = agents.reduce((sum, a) => sum + a.tasksToday, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Roster</h1>
          <p className="mt-1 text-sm text-[#888]">
            {agents.length} agents &middot; {onlineCount} online &middot;{" "}
            {totalTasksToday} tasks today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] border border-[#222] px-3 py-2">
            <Activity className="h-4 w-4 text-[#22c55e]" />
            <span className="text-sm text-[#888]">System Healthy</span>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className="group rounded-xl border border-[#222] bg-[#0a0a0a] p-5 transition-all hover:border-[#333]"
          >
            {/* Agent header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6]">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-[#888]">{agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${
                    agent.status === "online"
                      ? "bg-[#22c55e]"
                      : agent.status === "busy"
                        ? "bg-[#eab308]"
                        : "bg-[#666]"
                  }`}
                />
                <span
                  className={`text-xs font-medium capitalize ${
                    agent.status === "online"
                      ? "text-[#22c55e]"
                      : agent.status === "busy"
                        ? "text-[#eab308]"
                        : "text-[#666]"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="mt-3 text-xs leading-relaxed text-[#888]">
              {agent.description}
            </p>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#111] p-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Cpu className="h-3 w-3 text-[#666]" />
                  <span className="text-[10px] text-[#666]">Model</span>
                </div>
                <p className="mt-1 text-xs font-medium text-white">
                  {agent.model.replace("Claude ", "")}
                </p>
              </div>
              <div className="rounded-lg bg-[#111] p-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Wrench className="h-3 w-3 text-[#666]" />
                  <span className="text-[10px] text-[#666]">Tools</span>
                </div>
                <p className="mt-1 text-xs font-medium text-white">
                  {agent.tools}
                </p>
              </div>
              <div className="rounded-lg bg-[#111] p-2.5 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="h-3 w-3 text-[#666]" />
                  <span className="text-[10px] text-[#666]">Today</span>
                </div>
                <p className="mt-1 text-xs font-medium text-white">
                  {agent.tasksToday}
                </p>
              </div>
            </div>

            {/* Memory scope */}
            <div className="mt-3 flex items-center gap-1.5">
              <Database className="h-3 w-3 text-[#666]" />
              <span className="text-[10px] text-[#666]">Memory:</span>
              <span className="text-[10px] font-medium text-[#888]">
                {agent.memoryScope}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
