"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;

  const fieldErrors: Record<string, string> = {};
  if (touched.fullName && !fullName.trim()) fieldErrors.fullName = "Name is required";
  if (touched.email && !email.includes("@")) fieldErrors.email = "Enter a valid email";
  if (touched.password && password.length > 0 && password.length < 8) fieldErrors.password = "Min 8 characters";
  if (touched.confirmPassword && confirmPassword && password !== confirmPassword) fieldErrors.confirmPassword = "Passwords don't match";

  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          phone: phone,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#222] bg-[#111] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e15]">
            <svg className="h-7 w-7 text-[#22c55e]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">Check your email</h2>
          <p className="mt-2 text-sm text-[#888]">
            We sent a confirmation link to <span className="font-medium text-white">{email}</span>. Click the link to activate your account.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-medium text-[#4FC3F7] hover:text-[#60a5fa] transition-colors">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-[#222] bg-[#111] p-8">
        <h1 className="text-center text-xl font-bold text-white">Get started with Northbridge</h1>
        <p className="mt-2 text-center text-sm text-[#888]">Create your account to access the dashboard</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-[#ef444440] bg-[#ef444410] px-4 py-3 text-sm text-[#ef4444]">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-[#888]">Full Name *</label>
              <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} onBlur={() => markTouched("fullName")} required autoComplete="name" placeholder="John Smith"
                className={`w-full rounded-lg border bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#4FC3F7] ${fieldErrors.fullName ? "border-[#ef4444]" : "border-[#333]"}`} />
              {fieldErrors.fullName && <p className="mt-1 text-[10px] text-[#ef4444]">{fieldErrors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="company" className="mb-1.5 block text-xs font-medium text-[#888]">Company Name</label>
              <input id="company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoComplete="organization" placeholder="Acme Corp"
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#4FC3F7]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#888]">Email *</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => markTouched("email")} required autoComplete="email" placeholder="you@company.com"
                className={`w-full rounded-lg border bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#4FC3F7] ${fieldErrors.email ? "border-[#ef4444]" : "border-[#333]"}`} />
              {fieldErrors.email && <p className="mt-1 text-[10px] text-[#ef4444]">{fieldErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-[#888]">Phone</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+1 555 0123"
                className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#4FC3F7]" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#888]">Password *</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => markTouched("password")} required autoComplete="new-password" placeholder="Min 8 characters"
              className={`w-full rounded-lg border bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#4FC3F7] ${fieldErrors.password ? "border-[#ef4444]" : "border-[#333]"}`} />
            {fieldErrors.password && <p className="mt-1 text-[10px] text-[#ef4444]">{fieldErrors.password}</p>}
            {password.length > 0 && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div key={level} className={`h-1 flex-1 rounded-full ${
                    passwordStrength >= level
                      ? level === 1 ? "bg-[#ef4444]" : level === 2 ? "bg-[#f59e0b]" : "bg-[#22c55e]"
                      : "bg-[#333]"
                  }`} />
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-[#888]">Confirm Password *</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onBlur={() => markTouched("confirmPassword")} required autoComplete="new-password" placeholder="Repeat password"
              className={`w-full rounded-lg border bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-[#666] outline-none focus:border-[#4FC3F7] ${fieldErrors.confirmPassword ? "border-[#ef4444]" : "border-[#333]"}`} />
            {fieldErrors.confirmPassword && <p className="mt-1 text-[10px] text-[#ef4444]">{fieldErrors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-[10px] text-[#666]">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-[#4FC3F7] hover:underline">Terms</Link> and{" "}
            <Link href="/privacy" className="text-[#4FC3F7] hover:underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-[#888]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#4FC3F7] hover:text-[#60a5fa] transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
