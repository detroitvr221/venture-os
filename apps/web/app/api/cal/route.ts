import { NextRequest, NextResponse } from "next/server";

const CAL_API_KEY = process.env.CAL_API_KEY || "";
const CAL_BASE = "https://api.cal.com/v2";
const CAL_VERSION = "2024-06-14";

function calHeaders() {
  return {
    Authorization: `Bearer ${CAL_API_KEY}`,
    "cal-api-version": CAL_VERSION,
    "Content-Type": "application/json",
  };
}

// GET: List event types or bookings
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "event-types";

  try {
    const res = await fetch(`${CAL_BASE}/${type}`, {
      headers: calHeaders(),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Cal.com API error" }, { status: 500 });
  }
}

// POST: Create a booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${CAL_BASE}/bookings`, {
      method: "POST",
      headers: calHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
