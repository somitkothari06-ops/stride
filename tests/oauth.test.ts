import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db } from "../lib/store";
import { createOAuthAttempt, consumeOAuthAttempt, deleteOAuthAttempt, finishOAuthAttempt } from "../lib/oauth-store";
import { oauthClient } from "../lib/oauth";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(), "stride-oauth-"));
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "synthetic-public-test-key";
const origin = "http://127.0.0.1:3100";

test("OAuth attempt is bound to browser identity and origin and can be consumed only once", () => {
  const token = createOAuthAttempt("google", "synthetic-verifier", origin, "guest-a", "account-a");
  assert.equal(consumeOAuthAttempt(token, origin, "guest-a", "account-a").verifier, "synthetic-verifier");
  assert.throws(() => consumeOAuthAttempt(token, origin, "guest-a", "account-a"), /OAUTH_EXPIRED/);
  finishOAuthAttempt(token);
  assert.throws(() => finishOAuthAttempt(token), /OAUTH_EXPIRED/);
  for (const args of [["https://wrong.example", "guest-a", "account-a"], [origin, "guest-b", "account-a"], [origin, "guest-a", "account-b"]]) {
    const other = createOAuthAttempt("github", "v", origin, "guest-a", "account-a");
    assert.throws(() => consumeOAuthAttempt(other, ...args as [string,string,string]), /OAUTH_EXPIRED/);
    assert.throws(() => consumeOAuthAttempt(other, origin, "guest-a", "account-a"), /OAUTH_EXPIRED/);
  }
});
test("OAuth expiry and logout cancellation reject callbacks without leaking a verifier", () => {
  const token = createOAuthAttempt("github", "v", origin);
  consumeOAuthAttempt(token, origin);
  deleteOAuthAttempt(token);
  assert.throws(() => consumeOAuthAttempt(token, origin), /OAUTH_EXPIRED/);
  assert.throws(() => finishOAuthAttempt(token), /OAUTH_EXPIRED/);
  const expired = createOAuthAttempt("google", "v", origin);
  db().exec("UPDATE oauth_attempts SET expires=0");
  assert.throws(() => consumeOAuthAttempt(expired, origin), /OAUTH_EXPIRED/);
  assert.throws(() => consumeOAuthAttempt(undefined, origin), /OAUTH_EXPIRED/);
});
test("Supabase SDK generates a server-held S256 PKCE verifier for both providers", async () => {
  for (const provider of ["google", "github"] as const) {
    const { client, verifier } = oauthClient();
    const { data, error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin}/api/account/oauth/callback`, skipBrowserRedirect: true } });
    assert.equal(error, null);
    const url = new URL(data.url!);
    assert.equal(url.origin, process.env.NEXT_PUBLIC_SUPABASE_URL);
    assert.equal(url.searchParams.get("provider"),provider);
    assert.equal(url.searchParams.get("redirect_to"),`${origin}/api/account/oauth/callback`);
    assert.equal(url.searchParams.get("code_challenge_method"),"s256");
    assert(verifier());
    assert.equal(url.searchParams.get("code_challenge"),createHash("sha256").update(verifier()!).digest("base64url"));
    assert.equal(url.searchParams.has("code_verifier"),false);
  }
});
test("PKCE exchange restores SDK storage encoding and sends only the original verifier", async () => {
  let submitted: Record<string, string> | undefined;
  const fakeFetch: typeof fetch = async (_url, options) => {
    submitted = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ access_token: "synthetic-access", refresh_token: "synthetic-refresh", token_type: "bearer", expires_in: 3600, user: { id: "synthetic-user", email: "synthetic@example.invalid" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const { client } = oauthClient("original-synthetic-verifier", fakeFetch);
  const { error } = await client.auth.exchangeCodeForSession("synthetic-code");
  assert.equal(error,null);
  assert.equal(submitted?.code_verifier,"original-synthetic-verifier");
  assert.equal(submitted?.auth_code,"synthetic-code");
});
