"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/PageSkeleton";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import {
  Users,
  Search,
  Grid3X3,
  List,
  Pencil,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  X,
  Plus,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type EmployeeProfile = {
  id: string;
  user_id: string;
  display_name: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  bio: string | null;
  timezone: string | null;
  skills: string[];
  status: "active" | "away" | "busy" | "offline";
  email: string | null;
  start_date: string | null;
  created_at: string;
  role?: string | null;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  "Sales",
  "Delivery",
  "Operations",
  "Finance",
  "Engineering",
  "Marketing",
  "Executive",
];

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  active: { color: "bg-[#10b981]", bg: "bg-[#10b981]/20", label: "Active" },
  away: { color: "bg-[#f59e0b]", bg: "bg-[#f59e0b]/20", label: "Away" },
  busy: { color: "bg-[#ef4444]", bg: "bg-[#ef4444]/20", label: "Busy" },
  offline: { color: "bg-[#666]", bg: "bg-[#666]/20", label: "Offline" },
};

const AVATAR_GRADIENTS = [
  "from-[#4FC3F7] to-[#F5C542]",
  "from-[#10b981] to-[#4FC3F7]",
  "from-[#f59e0b] to-[#ef4444]",
  "from-[#8b5cf6] to-[#ec4899]",
  "from-[#06b6d4] to-[#3b82f6]",
  "from-[#f97316] to-[#eab308]",
  "from-[#14b8a6] to-[#a855f7]",
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const orgId = useOrgId();
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Profile editor
  const [showEditor, setShowEditor] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    title: "",
    department: "",
    phone: "",
    bio: "",
    timezone: "",
    skills: "" as string,
    status: "active" as string,
  });
  const [saving, setSaving] = useState(false);

  // ── Get user ──────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
      }
    });
  }, []);

  // ── Load profiles ─────────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const supabase = createClient();

    // Get org members with roles
    const { data: members, count } = await supabase
      .from("organization_members")
      .select("user_id, role", { count: "exact" })
      .eq("organization_id", orgId)
      .range((page - 1) * 25, page * 25 - 1);

    setTotalCount(count || 0);

    if (!members || members.length === 0) {
      setLoading(false);
      return;
    }

    const memberUserIds = members.map((m) => m.user_id);
    const roleMap: Record<string, string> = {};
    members.forEach((m) => (roleMap[m.user_id] = m.role));

    // Get profiles
    const { data: profileData } = await supabase
      .from("employee_profiles")
      .select("*")
      .in("user_id", memberUserIds);

    // Build profiles list, filling in missing ones with placeholder data
    const profileMap: Record<string, EmployeeProfile> = {};
    (profileData || []).forEach((p) => {
      profileMap[p.user_id] = {
        ...p,
        skills: p.skills || [],
        status: p.status || "active",
        role: roleMap[p.user_id] || null,
      };
    });

    // For members without profiles, create placeholder entries
    const allProfiles: EmployeeProfile[] = memberUserIds.map((uid) => {
      if (profileMap[uid]) return profileMap[uid];
      return {
        id: uid,
        user_id: uid,
        display_name: "",
        title: null,
        department: null,
        phone: null,
        bio: null,
        timezone: null,
        skills: [],
        status: "offline" as const,
        email: null,
        start_date: null,
        created_at: "",
        role: roleMap[uid] || null,
      };
    });

    setProfiles(allProfiles);
    setLoading(false);
  }, [orgId, page]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // ── Open editor with current profile ──────────────────────────────────

  function openEditor() {
    const myProfile = profiles.find((p) => p.user_id === userId);
    if (myProfile && myProfile.display_name) {
      setProfileForm({
        display_name: myProfile.display_name,
        title: myProfile.title || "",
        department: myProfile.department || "",
        phone: myProfile.phone || "",
        bio: myProfile.bio || "",
        timezone: myProfile.timezone || "",
        skills: (myProfile.skills || []).join(", "),
        status: myProfile.status || "active",
      });
    } else {
      setProfileForm({
        display_name: userEmail?.split("@")[0] || "",
        title: "",
        department: "",
        phone: "",
        bio: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        skills: "",
        status: "active",
      });
    }
    setShowEditor(true);
  }

  // ── Save profile ──────────────────────────────────────────────────────

  async function handleSaveProfile() {
    if (!userId || !profileForm.display_name.trim()) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const skillsArray = profileForm.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from("employee_profiles").upsert(
      {
        user_id: userId,
        display_name: profileForm.display_name.trim(),
        title: profileForm.title || null,
        department: profileForm.department || null,
        phone: profileForm.phone || null,
        bio: profileForm.bio || null,
        timezone: profileForm.timezone || null,
        skills: skillsArray,
        status: profileForm.status,
        email: userEmail,
        org_id: orgId,
      },
      { onConflict: "user_id" }
    );

    setSaving(false);
    if (error) {
      toast.error("Failed to save profile");
      return;
    }

    toast.success("Profile updated");
    setShowEditor(false);
    loadProfiles();
  }

  // ── Filter profiles ───────────────────────────────────────────────────

  const filtered = profiles.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.display_name || "").toLowerCase().includes(q) ||
      (p.title || "").toLowerCase().includes(q) ||
      (p.department || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-[#4FC3F7]" />
            People
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            {profiles.length} team member{profiles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openEditor}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Pencil className="h-4 w-4" />
          Edit My Profile
        </button>
      </div>

      {/* Search + View Toggle */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#333] bg-[#0a0a0a] p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "grid"
                ? "bg-[#1a1a2a] text-white"
                : "text-[#888] hover:text-white"
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "list"
                ? "bg-[#1a1a2a] text-white"
                : "text-[#888] hover:text-white"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Profile Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-xl border border-[#222] bg-[#0a0a0a] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Edit My Profile
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-[#666] transition hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-[#888]">
                  Display Name *
                </label>
                <input
                  value={profileForm.display_name}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      display_name: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-[#888]">
                    Title
                  </label>
                  <input
                    value={profileForm.title}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, title: e.target.value })
                    }
                    placeholder="e.g. Senior Developer"
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#888]">
                    Department
                  </label>
                  <select
                    value={profileForm.department}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        department: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white focus:border-[#4FC3F7] focus:outline-none"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-[#888]">
                    Phone
                  </label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#888]">
                    Timezone
                  </label>
                  <input
                    value={profileForm.timezone}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        timezone: e.target.value,
                      })
                    }
                    placeholder="America/Detroit"
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888]">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, bio: e.target.value })
                  }
                  rows={3}
                  placeholder="Tell your team about yourself..."
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888]">
                  Skills (comma separated)
                </label>
                <input
                  value={profileForm.skills}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, skills: e.target.value })
                  }
                  placeholder="React, TypeScript, SEO, Design..."
                  className="w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder:text-[#555] focus:border-[#4FC3F7] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#888]">
                  Status
                </label>
                <div className="flex gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setProfileForm({ ...profileForm, status: key })
                      }
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        profileForm.status === key
                          ? "border-[#4FC3F7]/50 bg-[#4FC3F7]/10 text-white"
                          : "border-[#333] bg-[#111] text-[#888] hover:text-white"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${config.color}`} />
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-sm text-[#888] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="rounded-lg bg-[#4FC3F7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#38B2D8] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? "No people match your search" : "No team members yet"}
          description={searchQuery ? "Try a different search term" : "Invite team members to get started"}
          actionLabel={searchQuery ? undefined : "Edit My Profile"}
          onAction={searchQuery ? undefined : openEditor}
        />
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((person) => {
            const name = person.display_name || person.email || "Unknown";
            const status =
              STATUS_CONFIG[person.status] || STATUS_CONFIG.offline;
            const isExpanded = expandedId === person.id;

            return (
              <div
                key={person.id}
                onClick={() =>
                  setExpandedId(isExpanded ? null : person.id)
                }
                className={`cursor-pointer rounded-xl border bg-[#0a0a0a] p-5 transition hover:border-[#333] ${
                  isExpanded ? "border-[#4FC3F7]/50" : "border-[#222]"
                }`}
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${getGradient(
                        name
                      )}`}
                    >
                      <span className="text-sm font-bold text-white">
                        {getInitials(name)}
                      </span>
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a] ${status.color}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {name}
                    </p>
                    {person.title && (
                      <p className="truncate text-xs text-[#888]">
                        {person.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Department badge */}
                {person.department && (
                  <div className="mt-3">
                    <span className="rounded-full bg-[#4FC3F7]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#4FC3F7]">
                      {person.department}
                    </span>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 space-y-2.5 border-t border-[#222] pt-4">
                    {person.email && (
                      <div className="flex items-center gap-2 text-xs text-[#888]">
                        <Mail className="h-3.5 w-3.5 text-[#666]" />
                        <span className="truncate">{person.email}</span>
                      </div>
                    )}
                    {person.phone && (
                      <div className="flex items-center gap-2 text-xs text-[#888]">
                        <Phone className="h-3.5 w-3.5 text-[#666]" />
                        {person.phone}
                      </div>
                    )}
                    {person.timezone && (
                      <div className="flex items-center gap-2 text-xs text-[#888]">
                        <Clock className="h-3.5 w-3.5 text-[#666]" />
                        {person.timezone}
                      </div>
                    )}
                    {person.bio && (
                      <p className="text-xs text-[#888] leading-relaxed">
                        {person.bio}
                      </p>
                    )}
                    {person.skills && person.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {person.skills.map((skill) => (
                          <span
                            key={skill}
                            className="flex items-center gap-1 rounded-full bg-[#1a1a2a] px-2 py-0.5 text-[10px] text-[#ccc]"
                          >
                            <Star className="h-2.5 w-2.5 text-[#F5C542]" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {person.role && (
                      <div className="mt-1">
                        <span className="rounded-full bg-[#F5C542]/10 px-2 py-0.5 text-[10px] font-medium text-[#F5C542] capitalize">
                          {person.role}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border border-[#222] bg-[#0a0a0a] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-7 gap-4 border-b border-[#222] px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
            <span className="col-span-2">Name</span>
            <span>Title</span>
            <span>Department</span>
            <span>Email</span>
            <span>Status</span>
            <span>Start Date</span>
          </div>
          {/* Table rows */}
          {filtered.map((person) => {
            const name = person.display_name || person.email || "Unknown";
            const status =
              STATUS_CONFIG[person.status] || STATUS_CONFIG.offline;

            return (
              <div
                key={person.id}
                className="grid grid-cols-7 gap-4 border-b border-[#111] px-5 py-3.5 text-sm transition last:border-b-0 hover:bg-[#111]"
              >
                <div className="col-span-2 flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${getGradient(
                        name
                      )}`}
                    >
                      <span className="text-[10px] font-bold text-white">
                        {getInitials(name)}
                      </span>
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a] ${status.color}`}
                    />
                  </div>
                  <span className="truncate font-medium text-white">
                    {name}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="truncate text-xs text-[#888]">
                    {person.title || "--"}
                  </span>
                </div>
                <div className="flex items-center">
                  {person.department ? (
                    <span className="rounded-full bg-[#4FC3F7]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#4FC3F7]">
                      {person.department}
                    </span>
                  ) : (
                    <span className="text-xs text-[#555]">--</span>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="truncate text-xs text-[#888]">
                    {person.email || "--"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className={`flex items-center gap-1.5 rounded-full ${status.bg} px-2 py-0.5 text-[10px] font-medium`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
                    {status.label}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-[#888]">
                    {person.start_date
                      ? new Date(person.start_date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )
                      : "--"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={Math.ceil(totalCount / 25)} onPageChange={setPage} />
    </div>
  );
}
