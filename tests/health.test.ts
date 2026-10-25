import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(), "stride-health-"));
import { GET } from "../app/api/health/route";
import { db } from "../lib/store";
test("health checks storage without creating a session or exposing configuration", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {status:"ok"});
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.has("set-cookie"), false);
  assert.equal((db().prepare("SELECT COUNT(*) AS n FROM sessions").get() as {n:number}).n,0);
});
test("health reports unavailable when the workspace table cannot be read", async () => {
  db().exec("DROP TABLE sessions");
  const response = GET();
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{status:"unavailable"});
});
