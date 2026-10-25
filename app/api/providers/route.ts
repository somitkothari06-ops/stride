import { NextResponse } from "next/server";
import { providerStatus } from "@/lib/ai";
export async function GET() {
  return NextResponse.json(providerStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
