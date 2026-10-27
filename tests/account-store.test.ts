import test from "node:test";
import {randomUUID} from "node:crypto";
import {manageChat,commitChatTurn,chatSnapshot} from "../lib/pip-chat";
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
  const now = 1800000;
  for (let i = 0; i < 8; i++) allowAuthAttempt("test@example.invalid", now + i * 1000);
  assert.throws(() => allowAuthAttempt("TEST@example.invalid", now + 10000), /AUTH_RATE_LIMIT/);
  assert.doesNotThrow(() => allowAuthAttempt("test@example.invalid", now + 15 * 60 * 1000));
});

test("separate chats survive guest claim and remain private across account workspaces",()=>{
 const guest=createSession(false),threadId=randomUUID();manageChat(guest.id,{action:"create",id:threadId,revision:0});
 commitChatTurn(guest.id,0,randomUUID(),"A private study question",{text:"A saved explanation",intent:"teach",sources:[]},threadId);
 const account=ownedWorkspace("thread-owner",guest.token);const reopened=ownedWorkspace("thread-owner");
 assert.equal(chatSnapshot(account.state,threadId).chat.messages.length,2);assert.deepEqual(chatSnapshot(reopened.state,threadId),chatSnapshot(account.state,threadId));
 assert.throws(()=>chatSnapshot(ownedWorkspace("other-thread-owner").state,threadId),/CHAT_NOT_FOUND/);
 assert.throws(()=>commitChatTurn(guest.id,1,randomUUID(),"Late guest write",{text:"No",intent:"talk",sources:[]},threadId),/SESSION_EXPIRED/);
});


test("sign-in asks for profile confirmation without replacing saved work or chats", async () => {
  const { completeAccountSignIn } = await import("../lib/account-signin");
  const guest = createSession(true), threadId = randomUUID();
  manageChat(guest.id, { action: "create", id: threadId, revision: 0 });
  const before = chatSnapshot(ownedWorkspace("onboarding-owner", guest.token).state, threadId);
  const session = { user: { id: "onboarding-owner" }, access_token: "test-access", refresh_token: "test-refresh", expires_at: Date.now() / 1000 + 3600 } as Parameters<typeof completeAccountSignIn>[0];
  const result = completeAccountSignIn(session);
  assert.equal(result.next, "/about-you");
  const saved = ownedWorkspace("onboarding-owner");
  assert.deepEqual(chatSnapshot(saved.state, threadId), before);
  assert.equal(saved.state.profile.name, "Alex");
  assert.ok(saved.state.works.length > 0);
  mutate(saved.id, state => { state.profile.name = "My chosen name"; state.profile.onboardingComplete = true; });
  const reopened = completeAccountSignIn(session, undefined, result.token);
  assert.equal(reopened.next, "/workspace");
  assert.equal(findAccountSession(result.token), null);
  assert.equal(ownedWorkspace("onboarding-owner").state.profile.name, "My chosen name");
  deleteAccountSession(reopened.token);
});
