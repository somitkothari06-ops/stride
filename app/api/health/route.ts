import { NextResponse } from "next/server";
import { db } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Readiness only: no session, user content, provider call or secret is returned.
export function GET() {
  let ready = false;
  try { db().prepare("SELECT 1 FROM sessions LIMIT 1").get(); ready = true; } catch {}
  return NextResponse.json({ status: ready ? "ok" : "unavailable" }, {
    status: ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
