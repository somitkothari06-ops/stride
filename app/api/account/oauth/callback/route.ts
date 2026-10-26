import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accountCookie, accountLifetime } from "@/lib/account-store";
import { completeAccountSignIn } from "@/lib/account-signin";
import { consumeOAuthAttempt, finishOAuthAttempt, deleteOAuthAttempt, oauthCookie } from "@/lib/oauth-store";
import { oauthClient } from "@/lib/oauth";
import { authOrigin, authFallbackOrigin } from "@/lib/auth-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url), jar = await cookies();
  let response: NextResponse;
  let claimed = false;
  const flowToken = jar.get(oauthCookie)?.value;
  let origin = authFallbackOrigin();
  try {
    origin = authOrigin(request);
    const guest = jar.get("stride_session")?.value, account = jar.get(accountCookie)?.value;
    const attempt = consumeOAuthAttempt(flowToken, origin, guest, account);
    claimed = true;
    if (url.searchParams.has("error")) throw new Error("OAUTH_CANCELLED");
    const code = url.searchParams.get("code");
    if (!code || code.length > 4096) throw new Error("OAUTH_EXPIRED");
    const { client } = oauthClient(attempt.verifier);
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !data.session || !data.user || data.session.user.id !== data.user.id) throw new Error("OAUTH_EXPIRED");
    const verified = await client.auth.getUser(data.session.access_token);
    if (verified.error || verified.data.user?.id !== data.user.id) throw new Error("OAUTH_EXPIRED");
    finishOAuthAttempt(flowToken!);
    const { token } = completeAccountSignIn(data.session, guest, account);
    response = NextResponse.redirect(new URL("/workspace", origin), 303);
    response.cookies.set(accountCookie, token, { httpOnly: true, sameSite: "lax", secure: new URL(origin).protocol === "https:", maxAge: accountLifetime, path: "/" });
    response.cookies.set("stride_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  } catch (error) {
    if (claimed) deleteOAuthAttempt(flowToken);
    const reason = error instanceof Error && error.message === "OAUTH_CANCELLED" ? "cancelled" : "retry";
    response = NextResponse.redirect(new URL(`/login?oauth_error=${reason}`, origin), 303);
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(oauthCookie, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
