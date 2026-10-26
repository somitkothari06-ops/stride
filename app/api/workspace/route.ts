import { NextResponse } from "next/server";
import { createSession } from "@/lib/store";
import { failure, requireSession } from "@/lib/http";
import { providerStatus } from "@/lib/ai";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    let session;
    try {
      session = await requireSession();
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SESSION_EXPIRED") throw error;
      session = createSession(new URL(request.url).searchParams.get("fresh") !== "1");
    }
    const response = NextResponse.json(
      { state: session.state, providers: providerStatus(), account: "account" in session && session.account ? { email: session.account.email } : null },
      { headers: { "Cache-Control": "no-store" } },
    );
    if ("token" in session && typeof session.token === "string")
      response.cookies.set("stride_session", session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(request.url).protocol === "https:",
        maxAge: 86400 * 30,
        path: "/",
      });
    return response;
  } catch (error) {
    return failure(error);
  }
}
