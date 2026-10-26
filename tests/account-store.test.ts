import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession, db, mutate } from "../lib/store";
import { guestWorkspace, ownedWorkspace, createAccountSession, findAccountSession, deleteAccountSession, refreshAccountSession, allowAuthAttempt } from "../lib/account-store";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(), "stride-accounts-"));

test("guest claim is one-time, keeps work and blocks the old guest cookie", () => {
  const guest = createSession(false);
  mutate(guest.id, state => { state.profile.name = "Student A"; });
  const account = ownedWorkspace("user-a", guest.token);
  assert.equal(account.claimed, true);
  assert.equal(account.state.profile.name, "Student A");
  assert.notEqual(account.id, guest.id);
  assert.throws(() => mutate(guest.id, state => { state.profile.name = "Late guest write"; }), /SESSION_EXPIRED/);
  assert.equal(guestWorkspace(guest.token), null);
  assert.equal(ownedWorkspace("user-a").id, account.id);
  const other = ownedWorkspace("user-b", guest.token);
  assert.notEqual(other.id, account.id);
  assert.notEqual(other.state.profile.name, "Student A");
});
test("existing accounts open their own work and never absorb another guest", () => {
  const guest = createSession(false);
  mutate(guest.id, state => { state.profile.name = "Guest C"; });
  const original = ownedWorkspace("user-a");
  const reopened = ownedWorkspace("user-a", guest.token);
  assert.equal(reopened.id, original.id);
  assert.equal(reopened.claimed, false);
  assert.equal(guestWorkspace(guest.token)?.state.profile.name, "Guest C");
});
test("opaque account sessions revoke immediately, expire and cannot be resurrected by refresh", () => {
  const token = createAccountSession("user-a", "synthetic-access", "synthetic-refresh", Date.now() / 1000 + 3600);
  const saved = findAccountSession(token)!;
  assert.notEqual(saved.id, token);
  refreshAccountSession(saved.id, "new-access", "new-refresh", Date.now() / 1000 + 3600);
  assert.equal(findAccountSession(token)?.access_token, "new-access");
  deleteAccountSession(token);
  assert.equal(findAccountSession(token), null);
  assert.throws(() => refreshAccountSession(saved.id, "x", "y", 9999999999), /AUTH_EXPIRED/);
  const expired = createAccountSession("user-b", "a", "r", 1);
  db().prepare("UPDATE account_sessions SET valid_until=1 WHERE user_id=?").run("user-b");
  assert.equal(findAccountSession(expired), null);
});
test("account requests have a persistent per-email allowance", () => {
  for (let i = 0; i < 8; i++) allowAuthAttempt("test@example.invalid");
  assert.throws(() => allowAuthAttempt("TEST@example.invalid"), /AUTH_RATE_LIMIT/);
});
