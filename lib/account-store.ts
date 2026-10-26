import { randomBytes } from "node:crypto";
import { db, createSession, getState, sessionId } from "./store";

const lifetime = 86400 * 30;
export const accountCookie = "stride_account";
export const accountLifetime = lifetime;
export type AccountSession = {
  id: string; user_id: string; access_token: string; refresh_token: string;
  expires_at: number; valid_until: number;
};
function database() {
  const connection = db();
  connection.exec("CREATE TABLE IF NOT EXISTS account_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, access_token TEXT NOT NULL, refresh_token TEXT NOT NULL, expires_at INTEGER NOT NULL, valid_until INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS auth_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL)");
  return connection;
}
export function guestWorkspace(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const id = sessionId(token);
  const row = db().prepare("SELECT id FROM sessions WHERE id=? AND user_id IS NULL").get(id);
  const state = row ? getState(id) : null;
  return state ? { id, state } : null;
}
export function ownedWorkspace(userId: string, guestToken?: string) {
  database().exec("BEGIN IMMEDIATE");
  try {
    const existing = database().prepare("SELECT id FROM sessions WHERE user_id=?").get(userId) as { id: string } | undefined;
    if (existing) {
      const state = getState(existing.id);
      if (!state) throw new Error("SESSION_EXPIRED");
      database().exec("COMMIT");
      return { id: existing.id, state, claimed: false };
    }
    const guest = guestWorkspace(guestToken);
    const workspace = guest || createSession(false);
    // Rotate the storage identity too: an in-flight guest operation must not write
    // through its previously resolved id after this workspace becomes account-owned.
    const id = guest ? sessionId(randomBytes(32).toString("hex")) : workspace.id;
    database().prepare("UPDATE sessions SET id=?,user_id=? WHERE id=? AND user_id IS NULL").run(id, userId, workspace.id);
    if (guest) database().prepare("UPDATE usage SET session=? WHERE session=?").run(id, guest.id);
    database().exec("COMMIT");
    return { id, state: workspace.state, claimed: !!guest };
  } catch (error) { database().exec("ROLLBACK"); throw error; }
}
export function createAccountSession(userId: string, access: string, refresh: string, expiresAt: number) {
  const token = randomBytes(32).toString("hex");
  database().prepare("DELETE FROM account_sessions WHERE valid_until<=?").run(Math.floor(Date.now() / 1000));
  database().prepare("INSERT INTO account_sessions VALUES(?,?,?,?,?,?)").run(sessionId(token), userId, access, refresh, expiresAt, Math.floor(Date.now() / 1000) + lifetime);
  return token;
}
export function findAccountSession(token?: string): AccountSession | null {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return database().prepare("SELECT * FROM account_sessions WHERE id=? AND valid_until>?").get(sessionId(token), Math.floor(Date.now() / 1000)) as AccountSession | undefined || null;
}
export function refreshAccountSession(id: string, access: string, refresh: string, expires: number) {
  const result = database().prepare("UPDATE account_sessions SET access_token=?,refresh_token=?,expires_at=? WHERE id=? AND valid_until>?").run(access, refresh, expires, id, Math.floor(Date.now() / 1000));
  if (!result.changes) throw new Error("AUTH_EXPIRED");
}
export function deleteAccountSession(token?: string) {
  if (token) database().prepare("DELETE FROM account_sessions WHERE id=?").run(sessionId(token));
}
export function allowAuthAttempt(email: string) {
  const period = Math.floor(Date.now() / 900);
  const buckets: [string, number][] = [[`${period}:global`, 100], [`${period}:${sessionId(email.toLowerCase())}`, 8]];
  database().exec("BEGIN IMMEDIATE");
  try {
    database().prepare("DELETE FROM auth_limits WHERE bucket NOT LIKE ?").run(`${period}:%`);
    for (const [bucket, limit] of buckets) {
      const row = database().prepare("SELECT count FROM auth_limits WHERE bucket=?").get(bucket) as { count: number } | undefined;
      if ((row?.count || 0) >= limit) throw new Error("AUTH_RATE_LIMIT");
      database().prepare("INSERT INTO auth_limits VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1").run(bucket);
    }
    database().exec("COMMIT");
  } catch (error) { database().exec("ROLLBACK"); throw error; }
}
