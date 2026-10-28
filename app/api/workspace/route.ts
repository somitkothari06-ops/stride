import { NextResponse } from "next/server";
import {allowGuest} from "@/lib/client-limits";
import { createSession } from "@/lib/store";
import { failure, requireSession } from "@/lib/http";
import { workspaceView } from "@/lib/workspace-view";
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
      allowGuest(request);
      session = createSession(new URL(request.url).searchParams.get("demo") === "1");
    }
    const query=new URL(request.url).searchParams;
    const response = NextResponse.json(
      query.get("bootstrap")==="1" ? {ready:true} : { state: workspaceView(session.state,query.get("export")==="1"), providers: providerStatus(), account: "account" in session && session.account ? { email: session.account.email } : null },
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
