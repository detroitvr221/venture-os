"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/overview");
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-[#222] bg-[#111] p-8">
        <h1 className="text-center text-xl font-bold text-white">
          Sign in to Northbridge Digital
        </h1>
        <p className="mt-2 text-center text-sm text-[#888]">
          Enter your credentials to access the dashboard
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg border border-[#ef444440] bg-[#ef444410] px-4 py-3 text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-[#888]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#666] outline-none transition-colors focus:border-[#4FC3F7]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-[#888]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-2.5 text-sm text-white placeholder-[#666] outline-none transition-colors focus:border-[#4FC3F7]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[#4FC3F7] to-[#F5C542] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              if (!email) { setError("Enter your email first"); return; }
              const supabase = createClient();
              const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login`,
              });
              if (resetError) setError(resetError.message);
              else setResetSent(true);
            }}
            className="text-xs text-[#666] hover:text-[#4FC3F7] transition-colors"
          >
            Forgot your password?
          </button>
          {resetSent && (
            <p className="mt-2 text-xs text-[#10b981]">Password reset email sent. Check your inbox.</p>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-[#888]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#4FC3F7] hover:text-[#60a5fa] transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
