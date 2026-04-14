"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Bell,
  Palette,
  Users,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/lib/useOrgId";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileForm {
  display_name: string;
  title: string;
  department: string;
  phone: string;
  timezone: string;
  bio: string;
}

interface Preferences {
  email_digest: "daily" | "weekly" | "off";
  desktop_notifications: boolean;
  default_view: "my_day" | "team";
  theme: "dark";
}

interface TeamMember {
  user_id: string;
  display_name: string | null;
  title: string | null;
  department: string | null;
}

const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "HR",
  "Support",
  "Executive",
  "Other",
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

const STEPS = [
  { label: "Profile", icon: User },
  { label: "Preferences", icon: Bell },
  { label: "Team", icon: Users },
  { label: "Launch", icon: Rocket },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OnboardingWizardPage() {
  const router = useRouter();
  const orgId = useOrgId();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 state
  const [profile, setProfile] = useState<ProfileForm>({
    display_name: "",
    title: "",
    department: "",
    phone: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    bio: "",
  });

  // Step 2 state
  const [preferences, setPreferences] = useState<Preferences>({
    email_digest: "daily",
    desktop_notifications: true,
    default_view: "my_day",
    theme: "dark",
  });

  // Step 3 state
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Get current user on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        if (user.user_metadata?.full_name) {
          setProfile((p) => ({ ...p, display_name: user.user_metadata.full_name }));
        }
      }
    });
  }, []);

  // Fetch team when reaching step 3
  useEffect(() => {
    if (step !== 2) return;
    setTeamLoading(true);
    const supabase = createClient();
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .then(({ data: members }) => {
        if (!members || members.length === 0) {
          setTeamLoading(false);
          return;
        }
        supabase
          .from("employee_profiles")
          .select("user_id, display_name, title, department")
          .in(
            "user_id",
            members.map((m) => m.user_id),
          )
          .then(({ data: profiles }) => {
            if (profiles) {
              setTeam(
                profiles
                  .filter((p) => p.user_id !== userId)
                  .map((p) => ({
                    user_id: p.user_id,
                    display_name: p.display_name,
                    title: p.title,
                    department: p.department,
                  })),
              );
            }
            setTeamLoading(false);
          });
      });
  }, [step, orgId, userId]);

  // ── Save handlers ──

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("employee_profiles").upsert({
      user_id: userId,
      organization_id: orgId,
      display_name: profile.display_name,
      title: profile.title,
      department: profile.department,
      phone: profile.phone,
      timezone: profile.timezone,
      bio: profile.bio,
    });
    setSaving(false);
  };

  const savePreferences = () => {
    localStorage.setItem("northbridge_preferences", JSON.stringify(preferences));
  };

  const handleNext = async () => {
    if (step === 0) await saveProfile();
    if (step === 1) savePreferences();
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleLaunch = () => router.push("/overview");

  // ── Input helper ──

  const inputClass =
    "w-full rounded-lg border border-[#333] bg-[#111] px-3 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#4FC3F7] focus:outline-none transition";
  const labelClass = "text-xs font-medium text-[#888] block mb-1.5";

  // ── Render steps ──

  const renderStep = () => {
    switch (step) {
      // ────────── Step 1: Profile ──────────
      case 0:
        return (
          <div className="space-y-5">
            {/* Avatar preview */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4FC3F7] to-[#F5C542] text-2xl font-bold text-white">
                {profile.display_name ? getInitials(profile.display_name) : "?"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Display Name *</label>
                <input
                  className={inputClass}
                  placeholder="Jane Smith"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  placeholder="Product Manager"
                  value={profile.title}
                  onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select
                  className={inputClass}
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  className={inputClass}
                  placeholder="+1 (555) 123-4567"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Timezone</label>
                <select
                  className={inputClass}
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Bio</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Tell the team a bit about yourself..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      // ────────── Step 2: Preferences ──────────
      case 1:
        return (
          <div className="space-y-6">
            {/* Email digest */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-[#4FC3F7]" />
                <span className="text-sm font-medium text-white">Email Digest</span>
              </div>
              <div className="flex gap-2">
                {(["daily", "weekly", "off"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setPreferences({ ...preferences, email_digest: opt })}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      preferences.email_digest === opt
                        ? "border-[#4FC3F7] bg-[#4FC3F715] text-[#4FC3F7]"
                        : "border-[#333] bg-[#111] text-[#888] hover:text-white"
                    }`}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop notifications */}
            <div className="flex items-center justify-between rounded-lg border border-[#222] bg-[#111] p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-[#F5C542]" />
                <div>
                  <p className="text-sm font-medium text-white">Desktop Notifications</p>
                  <p className="text-xs text-[#666]">Get notified about updates in real time</p>
                </div>
              </div>
              <button
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    desktop_notifications: !preferences.desktop_notifications,
                  })
                }
                className={`relative h-6 w-11 rounded-full transition ${
                  preferences.desktop_notifications ? "bg-[#4FC3F7]" : "bg-[#333]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    preferences.desktop_notifications ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Default view */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-[#22c55e]" />
                <span className="text-sm font-medium text-white">Default View</span>
              </div>
              <div className="flex gap-2">
                {[
                  { value: "my_day" as const, label: "My Day" },
                  { value: "team" as const, label: "Team View" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPreferences({ ...preferences, default_view: opt.value })}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      preferences.default_view === opt.value
                        ? "border-[#4FC3F7] bg-[#4FC3F715] text-[#4FC3F7]"
                        : "border-[#333] bg-[#111] text-[#888] hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-[#f59e0b]" />
                <span className="text-sm font-medium text-white">Theme</span>
              </div>
              <div className="flex gap-2">
                <button className="rounded-lg border border-[#4FC3F7] bg-[#4FC3F715] px-4 py-2 text-sm font-medium text-[#4FC3F7]">
                  Dark
                </button>
                <button
                  disabled
                  className="rounded-lg border border-[#222] bg-[#111] px-4 py-2 text-sm font-medium text-[#444] cursor-not-allowed"
                >
                  Light (coming soon)
                </button>
              </div>
            </div>
          </div>
        );

      // ────────── Step 3: Meet the Team ──────────
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-[#888]">
              You will be working with these team members.
            </p>
            {teamLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-[#888] text-sm">Loading team...</div>
              </div>
            ) : team.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#333] py-12">
                <Users className="h-10 w-10 text-[#333] mb-3" />
                <p className="text-sm text-[#666]">No team members yet</p>
                <p className="text-xs text-[#444] mt-1">You are the first one here!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {team.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 rounded-xl border border-[#222] bg-[#111] p-4 transition hover:border-[#333]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4FC3F7] to-[#F5C542] text-xs font-bold text-white">
                      {member.display_name ? getInitials(member.display_name) : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {member.display_name || "Team Member"}
                      </p>
                      {member.title && (
                        <p className="truncate text-xs text-[#888]">{member.title}</p>
                      )}
                      {member.department && (
                        <span className="inline-block mt-1 rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-medium text-[#666]">
                          {member.department}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ────────── Step 4: Launch ──────────
      case 3:
        return (
          <div className="space-y-6">
            {/* Success check */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#22c55e20]">
                <Check className="h-10 w-10 text-[#22c55e]" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">You are all set!</h2>
              <p className="mt-2 text-sm text-[#888]">
                Your profile is configured and preferences are saved. Here is what is ready:
              </p>
            </div>

            {/* Summary */}
            <div className="space-y-2 rounded-xl border border-[#222] bg-[#111] p-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-[#22c55e]" />
                <span className="text-[#ccc]">
                  Profile: <span className="text-white font-medium">{profile.display_name || "Set up"}</span>
                  {profile.department && (
                    <span className="text-[#888]"> / {profile.department}</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-[#22c55e]" />
                <span className="text-[#ccc]">
                  Notifications: <span className="text-white font-medium">{preferences.email_digest} digest</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-[#22c55e]" />
                <span className="text-[#ccc]">
                  Default view: <span className="text-white font-medium">{preferences.default_view === "my_day" ? "My Day" : "Team View"}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-[#22c55e]" />
                <span className="text-[#ccc]">
                  Theme: <span className="text-white font-medium">Dark</span>
                </span>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Go to My Day", href: "/overview", icon: Rocket },
                { label: "View My Tasks", href: "/tasks", icon: Check },
                { label: "Join Team Chat", href: "/team", icon: Users },
                { label: "Browse Playbooks", href: "/playbooks", icon: Building2 },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="flex items-center gap-2 rounded-xl border border-[#222] bg-[#111] p-3 text-sm text-[#888] transition hover:border-[#4FC3F7] hover:text-white"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </button>
              ))}
            </div>

            {/* Launch button */}
            <button
              onClick={handleLaunch}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Rocket className="h-4 w-4" />
              Launch Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-xl">
        {/* ── Progress bar ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isComplete = i < step;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                      isComplete
                        ? "border-[#22c55e] bg-[#22c55e20]"
                        : isActive
                          ? "border-[#4FC3F7] bg-[#4FC3F715]"
                          : "border-[#333] bg-[#111]"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5 text-[#22c55e]" />
                    ) : (
                      <Icon
                        className={`h-5 w-5 ${isActive ? "text-[#4FC3F7]" : "text-[#555]"}`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      isComplete
                        ? "text-[#22c55e]"
                        : isActive
                          ? "text-[#4FC3F7]"
                          : "text-[#555]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Connector bar */}
          <div className="relative mx-5 h-0.5 -mt-[38px] mb-[38px]">
            <div className="absolute inset-0 bg-[#222] rounded-full" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4FC3F7] to-[#22c55e] rounded-full transition-all duration-300"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-[#666]">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">{STEPS[step].label}</h1>
            <p className="mt-1 text-sm text-[#666]">
              {step === 0 && "Set up your profile so the team knows who you are."}
              {step === 1 && "Configure how you want to receive updates."}
              {step === 2 && "See who you will be collaborating with."}
              {step === 3 && "Everything is ready. Welcome aboard!"}
            </p>
          </div>

          {renderStep()}

          {/* ── Navigation ── */}
          {step < 3 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className={`flex items-center gap-1.5 rounded-lg border border-[#333] px-4 py-2 text-sm font-medium transition ${
                  step === 0
                    ? "cursor-not-allowed text-[#444]"
                    : "text-[#888] hover:text-white"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving || (step === 0 && !profile.display_name)}
                className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition ${
                  saving || (step === 0 && !profile.display_name)
                    ? "cursor-not-allowed bg-[#333] text-[#666]"
                    : "bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] text-white hover:opacity-90"
                }`}
              >
                {saving ? "Saving..." : "Next"}
                {!saving && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
