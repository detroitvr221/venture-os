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

  // OpenClaw VPS 1
  try {
    const res = await fetch("https://claw.thenorthbridgemi.com/", {
      signal: AbortSignal.timeout(5000),
    });
    checks.openclaw_vps1 = res.ok ? "ok" : "error";
  } catch {
    checks.openclaw_vps1 = "unreachable";
  }

  // OpenClaw VPS 2
  try {
    const res = await fetch("http://187.77.207.22:18789/health", {
      signal: AbortSignal.timeout(5000),
    });
    checks.openclaw_vps2 = res.ok ? "ok" : "error";
  } catch {
    checks.openclaw_vps2 = "unreachable";
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
