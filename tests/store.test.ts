import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createSession,
  getState,
  mutate,
  consumeAllowance,
  sessionId,
} from "../lib/store";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(), "stride-test-"));

test("separate browser sessions never share user-owned data", () => {
  const a = createSession();
  const b = createSession();
  mutate(a.id, (s) => {
    s.profile.name = "Private A";
  });
  assert.equal(getState(a.id)?.profile.name, "Private A");
  assert.equal(getState(b.id)?.profile.name, "Alex");
  assert.notEqual(a.id, a.token);
  assert.equal(sessionId(a.token), a.id);
});
test("a failed mutation rolls back instead of partly changing data", () => {
  const a = createSession();
  assert.throws(() =>
    mutate(a.id, (s) => {
      s.profile.name = "Wrong";
      throw new Error("failure");
    }),
  );
  assert.equal(getState(a.id)?.profile.name, "Alex");
});
test("live call allowance is bounded per session", () => {
  const a = createSession();
  for (let n = 0; n < 40; n++) consumeAllowance(a.id);
  assert.throws(() => consumeAllowance(a.id), /DAILY_LIMIT/);
});
