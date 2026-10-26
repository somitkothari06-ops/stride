import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, failure } from "@/lib/http";
import { accountCookie, allowAuthAttempt } from "@/lib/account-store";
import { createOAuthAttempt, deleteOAuthAttempt, oauthCookie, oauthLifetime } from "@/lib/oauth-store";
import { oauthAvailability, oauthClient } from "@/lib/oauth";
import { authOrigin } from "@/lib/auth-origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await oauthAvailability(), { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  try {
    if (!request.headers.get("origin")) throw new Error("FORBIDDEN");
    checkOrigin(request);
    const { provider } = z.object({ provider: z.enum(["google", "github"]) }).parse(await body(request, 1000));
    const enabled = await oauthAvailability();
    if (!enabled.available) throw new Error("AUTH_UNAVAILABLE");
    if (!enabled[provider]) throw new Error("OAUTH_NOT_CONFIGURED");
    const jar = await cookies();
    const guest = jar.get("stride_session")?.value, account = jar.get(accountCookie)?.value;
    allowAuthAttempt(`oauth:${account || guest || "anonymous"}`);
    const origin = authOrigin(request);
    const { client, verifier } = oauthClient();
    const { data, error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin}/api/account/oauth/callback`, skipBrowserRedirect: true } });
    const codeVerifier = verifier();
    if (error || !data.url || !codeVerifier) throw new Error("AUTH_UNAVAILABLE");
    const redirect = new URL(data.url);
    if (redirect.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin || redirect.pathname !== "/auth/v1/authorize" || redirect.searchParams.get("code_challenge_method") !== "s256") throw new Error("AUTH_UNAVAILABLE");
    deleteOAuthAttempt(jar.get(oauthCookie)?.value);
    const token = createOAuthAttempt(provider, codeVerifier, origin, guest, account);
    const response = NextResponse.json({ url: redirect.href }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(oauthCookie, token, { httpOnly: true, sameSite: "lax", secure: new URL(origin).protocol === "https:", path: "/", maxAge: oauthLifetime });
    return response;
  } catch (error) { return failure(error); }
}
