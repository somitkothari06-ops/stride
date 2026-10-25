import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { initialWorkspace } from "./planner";
import type { Workspace } from "./types";

let instance: DatabaseSync | undefined;
export function db() {
  if (!instance) {
    const dir = process.env.STRIDE_DATA_DIR || join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    instance = new DatabaseSync(join(dir, "stride.sqlite"));
    instance.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    instance.exec(
      "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, state TEXT NOT NULL, updated TEXT NOT NULL); CREATE TABLE IF NOT EXISTS usage (session TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(session,day));",
    );
    instance.exec(
      "CREATE TABLE IF NOT EXISTS provider_checks (config_id TEXT PRIMARY KEY, verified_at TEXT, last_failure_at TEXT)",
    );
  }
  return instance;
}
export function getProviderCheck(configId: string) {
  return db()
    .prepare(
      "SELECT verified_at,last_failure_at FROM provider_checks WHERE config_id=?",
    )
    .get(configId) as
    | { verified_at: string | null; last_failure_at: string | null }
    | undefined;
}
export function recordProviderCheck(
  configId: string,
  success: boolean,
  at = new Date().toISOString(),
) {
  db()
    .prepare(
      "INSERT INTO provider_checks(config_id,verified_at,last_failure_at) VALUES(?,?,?) ON CONFLICT(config_id) DO UPDATE SET verified_at=COALESCE(excluded.verified_at,provider_checks.verified_at),last_failure_at=COALESCE(excluded.last_failure_at,provider_checks.last_failure_at)",
    )
    .run(configId, success ? at : null, success ? null : at);
}
export function sessionId(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function createSession(sample = true) {
  const token = randomBytes(32).toString("hex");
  const id = sessionId(token);
  const state = initialWorkspace(sample);
  db()
    .prepare("INSERT INTO sessions(id,state,updated) VALUES(?,?,?)")
    .run(id, JSON.stringify(state), new Date().toISOString());
  return { token, id, state };
}
export function getState(id: string): Workspace | null {
  const row = db().prepare("SELECT state FROM sessions WHERE id=?").get(id) as
    | { state: string }
    | undefined;
  return row ? (JSON.parse(row.state) as Workspace) : null;
}
export function mutate(
  id: string,
  change: (state: Workspace) => void,
): Workspace {
  db().exec("BEGIN IMMEDIATE");
  try {
    const state = getState(id);
    if (!state) throw new Error("SESSION_EXPIRED");
    change(state);
    db()
      .prepare("UPDATE sessions SET state=?,updated=? WHERE id=?")
      .run(JSON.stringify(state), new Date().toISOString(), id);
    db().exec("COMMIT");
    return state;
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }
}
export function consumeAllowance(id: string) {
  const day = new Date().toISOString().slice(0, 10);
  db().exec("BEGIN IMMEDIATE");
  try {
    const row = db()
      .prepare("SELECT count FROM usage WHERE session=? AND day=?")
      .get(id, day) as { count: number } | undefined;
    if ((row?.count ?? 0) >= 40) throw new Error("DAILY_LIMIT");
    const total = db()
      .prepare("SELECT COALESCE(SUM(count),0) AS count FROM usage WHERE day=?")
      .get(day) as { count: number };
    if (total.count >= 150) throw new Error("DAILY_LIMIT");
    db()
      .prepare(
        "INSERT INTO usage(session,day,count) VALUES(?,?,1) ON CONFLICT(session,day) DO UPDATE SET count=count+1",
      )
      .run(id, day);
    db().exec("COMMIT");
  } catch (error) {
    db().exec("ROLLBACK");
    throw error;
  }
}
