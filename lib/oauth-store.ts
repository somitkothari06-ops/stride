import { randomBytes } from "node:crypto";
import { db, sessionId } from "./store";

export const oauthCookie = "stride_oauth";
export const oauthLifetime = 600;
export type OAuthProvider = "google" | "github";
type Attempt = { verifier: string; origin: string; guest_hash: string | null; account_hash: string | null; expires: number; provider: OAuthProvider };
function database() {
  const connection = db();
  connection.exec("CREATE TABLE IF NOT EXISTS oauth_attempts (id TEXT PRIMARY KEY, verifier TEXT NOT NULL, origin TEXT NOT NULL, guest_hash TEXT, account_hash TEXT, expires INTEGER NOT NULL, provider TEXT NOT NULL, claimed INTEGER NOT NULL DEFAULT 0)");
  return connection;
}
const fingerprint = (token?: string) => token ? sessionId(token) : null;
export function createOAuthAttempt(provider: OAuthProvider, verifier: string, origin: string, guest?: string, account?: string) {
  const token = randomBytes(32).toString("hex");
  database().prepare("DELETE FROM oauth_attempts WHERE expires<=?").run(Math.floor(Date.now() / 1000));
  database().prepare("INSERT INTO oauth_attempts(id,verifier,origin,guest_hash,account_hash,expires,provider) VALUES(?,?,?,?,?,?,?)").run(sessionId(token), verifier, origin, fingerprint(guest), fingerprint(account), Math.floor(Date.now() / 1000) + oauthLifetime, provider);
  return token;
}
export function deleteOAuthAttempt(token?: string) {
  if (token && /^[a-f0-9]{64}$/.test(token)) database().prepare("DELETE FROM oauth_attempts WHERE id=?").run(sessionId(token));
}
export function consumeOAuthAttempt(token: string | undefined, origin: string, guest?: string, account?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error("OAUTH_EXPIRED");
  // Atomic single claim prevents replay; retain the row so logout can cancel an
  // exchange while its provider network requests are still in flight.
  const attempt = database().prepare("UPDATE oauth_attempts SET claimed=1 WHERE id=? AND claimed=0 RETURNING verifier,origin,guest_hash,account_hash,expires,provider").get(sessionId(token)) as Attempt | undefined;
  if (!attempt) throw new Error("OAUTH_EXPIRED");
  if (attempt.expires <= Date.now() / 1000 || attempt.origin !== origin || attempt.guest_hash !== fingerprint(guest) || attempt.account_hash !== fingerprint(account)) {
    deleteOAuthAttempt(token);
    throw new Error("OAUTH_EXPIRED");
  }
  return attempt;
}
export function finishOAuthAttempt(token: string) {
  const result = database().prepare("DELETE FROM oauth_attempts WHERE id=? AND claimed=1 AND expires>?").run(sessionId(token), Math.floor(Date.now() / 1000));
  if (!result.changes) throw new Error("OAUTH_EXPIRED");
}
