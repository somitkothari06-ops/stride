import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { accountCookie, findAccountSession, refreshAccountSession } from "./account-store";

// One refresh per device at a time; simultaneous API calls share rotated credentials.
const refreshing = new Map<string, Promise<string>>();

export function authConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export function authClient() {
  if (!authConfigured()) throw new Error("AUTH_NOT_CONFIGURED");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000), cache: "no-store" }) },
  });
}
export async function currentAccount() {
  const token = (await cookies()).get(accountCookie)?.value;
  if (!token) return null;
  const saved = findAccountSession(token);
  if (!saved) throw new Error("AUTH_EXPIRED");
  const client = authClient();
  let access = saved.access_token;
  if (saved.expires_at < Date.now() / 1000 + 60) {
    let pending = refreshing.get(saved.id);
    if (!pending) {
      pending = (async () => {
        const latest = findAccountSession(token);
        if (!latest) throw new Error("AUTH_EXPIRED");
        if (latest.expires_at >= Date.now() / 1000 + 60) return latest.access_token;
        const { data, error } = await client.auth.refreshSession({ refresh_token: latest.refresh_token });
        if (error || !data.session || data.user?.id !== latest.user_id) throw new Error("AUTH_EXPIRED");
        refreshAccountSession(latest.id, data.session.access_token, data.session.refresh_token, data.session.expires_at!);
        return data.session.access_token;
      })();
      refreshing.set(saved.id, pending);
    }
    try { access = await pending; }
    finally { if (refreshing.get(saved.id) === pending) refreshing.delete(saved.id); }
  }
  const { data, error } = await client.auth.getUser(access);
  if (error || !data.user || data.user.id !== saved.user_id) throw new Error("AUTH_EXPIRED");
  // A logout racing the network check must not recreate or reuse the revoked session.
  if (!findAccountSession(token)) throw new Error("AUTH_EXPIRED");
  return { id: data.user.id, email: data.user.email || "", token };
}
