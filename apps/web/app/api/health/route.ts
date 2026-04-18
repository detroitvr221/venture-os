import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // Dashboard
  checks.dashboard = "ok";

  // Supabase
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/organizations?select=id&limit=1`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
        },
      }
    );
    checks.supabase = res.ok ? "ok" : "error";
  } catch {
    checks.supabase = "unreachable";
  }

  // Hermes API Bridge (VPS 2 — replaced OpenClaw)
  try {
    const res = await fetch("http://187.77.207.22:18789/health", {
      signal: AbortSignal.timeout(5000),
    });
    checks.hermes = res.ok ? "ok" : "error";
  } catch {
    checks.hermes = "unreachable";
  }

  // SMTP Receiver (VPS 1)
  try {
    const res = await fetch("http://145.223.75.46:8080/", {
      signal: AbortSignal.timeout(5000),
    });
    checks.filebrowser = res.ok ? "ok" : "error";
  } catch {
    checks.filebrowser = "unreachable";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
