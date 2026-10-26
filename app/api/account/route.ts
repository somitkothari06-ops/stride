import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { body, checkOrigin, failure } from "@/lib/http";
import { authClient, authConfigured, currentAccount } from "@/lib/auth";
import { accountCookie, accountLifetime, allowAuthAttempt, deleteAccountSession } from "@/lib/account-store";
import { completeAccountSignIn } from "@/lib/account-signin";
import { deleteOAuthAttempt, oauthCookie } from "@/lib/oauth-store";
import { authOrigin } from "@/lib/auth-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const Input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("signout") }),
  z.object({ action: z.literal("signin"), email: z.email().max(254), password: z.string().min(1).max(128) }),
  z.object({ action: z.literal("signup"), email: z.email().max(254), password: z.string().min(8).max(128) }),
]);
export async function GET() {
  try {
    const account = await currentAccount();
    return NextResponse.json({ configured: authConfigured(), account: account ? { email: account.email } : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    // Auth mutations require an explicit same-origin browser request, including logout.
    if (!request.headers.get("origin")) throw new Error("FORBIDDEN");
    checkOrigin(request);
    const origin = authOrigin(request);
    const input = Input.parse(await body(request, 3000));
    const jar = await cookies();
    if (input.action === "signout") {
      // Deleting the server-owned opaque session revokes this device immediately.
      deleteAccountSession(jar.get(accountCookie)?.value);
      deleteOAuthAttempt(jar.get(oauthCookie)?.value);
      const response = NextResponse.json({ signedOut: true }, { headers: { "Cache-Control": "no-store" } });
      for (const name of jar.get(accountCookie)?.value ? [accountCookie, "stride_session", oauthCookie] : [accountCookie, oauthCookie])
        response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return response;
    }
    const email = input.email.trim().toLowerCase();
    allowAuthAttempt(email);
    const client = authClient();
    const result = input.action === "signin"
      ? await client.auth.signInWithPassword({ email, password: input.password })
      : await client.auth.signUp({ email, password: input.password, options: { emailRedirectTo: `${origin}/login` } });
    if (result.error) {
      if (result.error.status === 429) throw new Error("AUTH_RATE_LIMIT");
      if (!result.error.status || result.error.status >= 500) throw new Error("AUTH_UNAVAILABLE");
      throw new Error(input.action === "signup" ? "AUTH_SIGNUP_FAILED" : "AUTH_FAILED");
    }
    if (!result.data.session) {
      return NextResponse.json({ confirmationRequired: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const { session, user } = result.data;
    if (!user || session.user.id !== user.id) throw new Error("AUTH_FAILED");
    const { token, claimed } = completeAccountSignIn(session, jar.get("stride_session")?.value, jar.get(accountCookie)?.value);
    deleteOAuthAttempt(jar.get(oauthCookie)?.value);
    const response = NextResponse.json({ signedIn: true, claimed }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(oauthCookie, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    response.cookies.set(accountCookie, token, { httpOnly: true, sameSite: "lax", secure: new URL(origin).protocol === "https:", maxAge: accountLifetime, path: "/" });
    response.cookies.set("stride_session", "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return failure(error); }
}
