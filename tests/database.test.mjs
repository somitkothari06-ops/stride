import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, statSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupDatabase, restoreDatabase, verifyDatabase } from "../scripts/database.mjs";

test("online backup includes committed WAL records and restores an independent snapshot", () => {
  const directory = mkdtempSync(join(tmpdir(), "stride-backup-test-"));
  const source = join(directory, "source.sqlite");
  const destination = join(directory, "snapshot.sqlite");
  const database = new DatabaseSync(source);
  try {
    database.exec("PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE sessions(id TEXT PRIMARY KEY,state TEXT,updated TEXT); CREATE TABLE usage(session TEXT,day TEXT,count INTEGER); CREATE TABLE provider_checks(config_id TEXT PRIMARY KEY,verified_at TEXT,last_failure_at TEXT);");
    database.prepare("INSERT INTO sessions VALUES(?,?,?)").run("synthetic", JSON.stringify({ profile: { name: "Before backup" } }), "2026-10-25");
    database.prepare("INSERT INTO usage VALUES(?,?,?)").run("synthetic", "2026-10-25", 7);
    assert.ok(statSync(source + "-wal").size > 0);
    assert.equal(backupDatabase(source, destination).sessions, 1);
    assert.equal(statSync(destination).mode & 0o777, 0o600);
    database.prepare("UPDATE sessions SET state=?").run(JSON.stringify({ profile: { name: "After backup" } }));
    const restored = join(directory, "restored");
    assert.equal(restoreDatabase(destination, restored).integrity, "ok");
    const snapshot = new DatabaseSync(join(restored, "stride.sqlite"), { readOnly: true });
    try {
      assert.equal(JSON.parse(snapshot.prepare("SELECT state FROM sessions").get().state).profile.name, "Before backup");
      assert.equal(snapshot.prepare("SELECT count FROM usage").get().count, 7);
    } finally { snapshot.close(); }
    assert.throws(() => restoreDatabase(destination, restored));
    assert.equal(verifyDatabase(join(restored, "stride.sqlite")).sessions, 1);
    assert.throws(() => backupDatabase(source, source));
    const existing = join(directory, "existing.sqlite");
    writeFileSync(existing, "keep this file");
    assert.throws(() => backupDatabase(source, existing));
    assert.equal(readFileSync(existing, "utf8"), "keep this file");
  } finally { database.close(); rmSync(directory, { recursive: true, force: true }); }
});

test("bad or missing source never publishes a backup or leaves a restore directory", () => {
  const directory = mkdtempSync(join(tmpdir(), "stride-invalid-backup-"));
  try {
    const source = join(directory, "corrupt.sqlite");
    writeFileSync(source, "not sqlite");
    assert.throws(() => verifyDatabase(source));
    assert.throws(() => backupDatabase(source, join(directory, "backup.sqlite")));
    assert.throws(() => statSync(join(directory, "backup.sqlite")));
    assert.throws(() => restoreDatabase(source, join(directory, "restored")));
    assert.throws(() => statSync(join(directory, "restored")));
    assert.throws(() => backupDatabase(join(directory, "missing.sqlite"), join(directory, "backup.sqlite")));
    assert.throws(() => statSync(join(directory, "missing.sqlite")));
    const incomplete = new DatabaseSync(join(directory, "incomplete.sqlite"));
    incomplete.close();
    assert.throws(() => backupDatabase(join(directory, "incomplete.sqlite"), join(directory, "backup.sqlite")));
    const invalid = new DatabaseSync(join(directory, "invalid-state.sqlite"));
    invalid.exec("CREATE TABLE sessions(state TEXT); CREATE TABLE usage(count INTEGER); CREATE TABLE provider_checks(config_id TEXT); INSERT INTO sessions VALUES('broken json');");
    invalid.close();
    assert.throws(() => backupDatabase(join(directory, "invalid-state.sqlite"), join(directory, "backup.sqlite")));
    assert.throws(() => statSync(join(directory, "backup.sqlite")));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
