import { createClient } from "@supabase/supabase-js";
import { authConfigured } from "./auth";
export type OAuthAvailability = { google: boolean; github: boolean; available: boolean };
let cached: { expires: number; value: OAuthAvailability } | undefined;
export async function oauthAvailability(): Promise<OAuthAvailability> {
  if (!authConfigured()) return { google: false, github: false, available: false };
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    if (!response.ok) throw new Error("AUTH_UNAVAILABLE");
    const settings = await response.json();
    const value = { google: settings.external?.google === true, github: settings.external?.github === true, available: true };
    cached = { expires: Date.now() + 30000, value };
    return value;
  } catch { return { google: false, github: false, available: false }; }
}
export function oauthClient(verifier?: string, fetcher: typeof fetch = fetch) {
  if (!authConfigured()) throw new Error("AUTH_NOT_CONFIGURED");
  // Supabase's PKCE storage is request-local memory. Only the one-time verifier
  // moves to private server storage; provider tokens never reach browser JS.
  const values = new Map<string, string>();
  const storageKey = "stride-oauth";
  if (verifier) values.set(`${storageKey}-code-verifier`, JSON.stringify(verifier));
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { flowType: "pkce", storageKey, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
      storage: { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } },
    },
    global: { fetch: (url, options) => fetcher(url, { ...options, cache: "no-store", signal: AbortSignal.timeout(15000) }) },
  });
  return { client, verifier: (): string | undefined => {
    const stored = values.get(`${storageKey}-code-verifier`);
    if (!stored) return undefined;
    const decoded: unknown = JSON.parse(stored);
    return typeof decoded === "string" ? decoded : undefined;
  } };
}
