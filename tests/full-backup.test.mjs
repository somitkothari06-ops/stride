import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  rmSync, statSync, symlinkSync, utimesSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFullBackup, restoreFullBackup } from "../scripts/full-backup.mjs";
import { cleanupDocuments } from "../scripts/cleanup-documents.mjs";
import { decryptSnapshot, encryptSnapshot } from "../scripts/encrypted-backup.mjs";

function workspace(name, materials = []) {
  return {
    version: 1,
    revision: 1,
    sample: false,
    profile: { name, year: "2nd year", goal: "synthetic", minutes: 30, timezone: "UTC" },
    works: [],
    observations: [],
    plan: null,
    prepared: null,
    direction: null,
    notice: null,
    materials,
  };
}

function material(storageKey) {
  return {
    id: `material-${storageKey}`,
    addedAt: "2026-10-01T00:00:00.000Z",
    title: "Synthetic reading",
    subject: "Synthetic subject",
    kind: "Syllabus",
    filename: "synthetic.pdf",
    pages: [{ locator: "Page 1", text: "Synthetic page text" }],
    warnings: [],
    ...(storageKey ? { storageKey } : {}),
  };
}

function writeDatabase(directory, rows, extras = false) {
  const database = new DatabaseSync(join(directory, "stride.sqlite"));
  try {
    database.exec(
      "PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0;" +
      "CREATE TABLE sessions (id TEXT PRIMARY KEY,state TEXT NOT NULL,updated TEXT NOT NULL);" +
      "CREATE TABLE usage (session TEXT NOT NULL,day TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session,day));" +
      "CREATE TABLE provider_checks (config_id TEXT PRIMARY KEY,verified_at TEXT,last_failure_at TEXT);",
    );
    if (extras) {
      database.exec(
        "CREATE TABLE account_sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,access_token TEXT NOT NULL,refresh_token TEXT NOT NULL,expires_at INTEGER NOT NULL,valid_until INTEGER NOT NULL);" +
        "CREATE TABLE oauth_attempts (id TEXT PRIMARY KEY,verifier TEXT NOT NULL,origin TEXT NOT NULL,guest_hash TEXT,account_hash TEXT,expires INTEGER NOT NULL,provider TEXT NOT NULL,claimed INTEGER NOT NULL DEFAULT 0);" +
        "CREATE TABLE companion_reviews (id TEXT PRIMARY KEY,session TEXT NOT NULL,source TEXT NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL,expires INTEGER NOT NULL,committed INTEGER NOT NULL DEFAULT 0);",
      );
      database.prepare("INSERT INTO account_sessions VALUES(?,?,?,?,?,?)")
        .run("a".repeat(64), "synthetic-user", "synthetic-access", "synthetic-refresh", 1, 9999999999);
      database.prepare("INSERT INTO oauth_attempts VALUES(?,?,?,?,?,?,?,?)")
        .run("b".repeat(64), "synthetic-verifier", "https://synthetic.invalid", null, null, 9999999999, "synthetic", 0);
      database.prepare("INSERT INTO companion_reviews VALUES(?,?,?,?,?,?,?)")
        .run("synthetic-review", "synthetic-session", "synthetic-source", "[]", 1, 9999999999, 0);
    }
    for (const [id, state] of Object.entries(rows)) {
      database.prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(id, typeof state === "string" ? state : JSON.stringify(state), "2026-10-27T00:00:00.000Z");
    }
    database.prepare("INSERT INTO usage VALUES(?,?,?)").run("synthetic-session", "2026-10-27", 3);
  } finally {
    database.close();
  }
}

function makeData(rows, documents, extras = false) {
  const directory = mkdtempSync(join(tmpdir(), "stride-full-data-"));
  chmodSync(directory, 0o700);
  mkdirSync(join(directory, "documents"), { mode: 0o700 });
  chmodSync(join(directory, "documents"), 0o700);
  writeDatabase(directory, rows, extras);
  for (const [storageKey, bytes] of Object.entries(documents))
    writeFileSync(join(directory, "documents", `${storageKey}.pdf`), bytes, { mode: 0o600 });
  return directory;
}

function assertNoStaging(directory) {
  assert.deepEqual(readdirSync(directory).filter((name) => name.startsWith(".stride-")), []);
}

test("full backup restores an independent database and original PDF privately", () => {
  const storageKey = randomUUID();
  const original = Buffer.alloc(8*1024*1024,0x41); // Exercise a maximum-size original, not just a tiny fixture.
  const data = makeData({ synthetic: workspace("Before backup", [material(storageKey)]) }, { [storageKey]: original });
  const output = mkdtempSync(join(tmpdir(), "stride-full-output-"));
  try {
    const key = join(output, "full.key");
    const encrypted = join(output, "full.backup");
    const restored = join(output, "restored");
    assert.deepEqual(createFullBackup(data, key, encrypted), {
      status: "complete", sessions: 1, documents: 1, bytes: statSync(encrypted).size,
    });
    assert.equal(statSync(key).mode & 0o777, 0o600);
    assert.equal(statSync(encrypted).mode & 0o777, 0o600);

    const live = new DatabaseSync(join(data, "stride.sqlite"));
    try {
      live.prepare("UPDATE sessions SET state=?").run(JSON.stringify(workspace("After backup", [])));
    } finally { live.close(); }
    writeFileSync(join(data, "documents", `${storageKey}.pdf`), "changed after backup");

    assert.equal(restoreFullBackup(encrypted, key, restored).sessions, 1);
    assert.equal(statSync(restored).mode & 0o777, 0o700);
    assert.equal(statSync(join(restored, "documents")).mode & 0o777, 0o700);
    assert.equal(statSync(join(restored, "stride.sqlite")).mode & 0o777, 0o600);
    assert.equal(statSync(join(restored, "documents", `${storageKey}.pdf`)).mode & 0o777, 0o600);
    assert.deepEqual(readFileSync(join(restored, "documents", `${storageKey}.pdf`)), original);

    const snapshot = new DatabaseSync(join(restored, "stride.sqlite"), { readOnly: true });
    try {
      assert.equal(JSON.parse(snapshot.prepare("SELECT state FROM sessions").get().state).profile.name, "Before backup");
      assert.equal(snapshot.prepare("SELECT count FROM usage").get().count, 3);
    } finally { snapshot.close(); }

    assert.throws(() => createFullBackup(data, key, encrypted), /exists/i);
    assert.throws(() => restoreFullBackup(encrypted, key, restored), /exists/i);
    assertNoStaging(output);
  } finally {
    rmSync(data, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("missing files, symlinks, tampering, a wrong key and a bad manifest are refused", () => {
  const output = mkdtempSync(join(tmpdir(), "stride-full-refusal-"));
  const temporary = [];
  try {
    const key = join(output, "full.key");

    const missingData = makeData({ synthetic: workspace("Missing", [material(randomUUID())]) }, {});
    temporary.push(missingData);
    const missingOutput = join(output, "missing.backup");
    assert.throws(() => createFullBackup(missingData, key, missingOutput), /missing/i);
    assert.equal(existsSync(missingOutput), false);
    assertNoStaging(output);

    const linkedKey = randomUUID();
    const linkedData = makeData({ synthetic: workspace("Linked", [material(linkedKey)]) }, {});
    temporary.push(linkedData);
    const target = join(linkedData, "outside.pdf");
    writeFileSync(target, "synthetic");
    symlinkSync(target, join(linkedData, "documents", `${linkedKey}.pdf`));
    const linkedOutput = join(output, "linked.backup");
    assert.throws(() => createFullBackup(linkedData, key, linkedOutput), /symbolic link/i);
    assert.equal(existsSync(linkedOutput), false);

    const storageKey = randomUUID();
    const validData = makeData({ synthetic: workspace("Valid", [material(storageKey)]) }, {
      [storageKey]: Buffer.from("%PDF-1.4 synthetic"),
    });
    temporary.push(validData);
    const encrypted = join(output, "valid.backup");
    createFullBackup(validData, key, encrypted);

    const tamperedBytes = readFileSync(encrypted);
    tamperedBytes[tamperedBytes.length - 1] ^= 1;
    const tampered = join(output, "tampered.backup");
    writeFileSync(tampered, tamperedBytes, { mode: 0o600 });
    const tamperedTarget = join(output, "tampered-restore");
    assert.throws(() => restoreFullBackup(tampered, key, tamperedTarget));
    assert.equal(existsSync(tamperedTarget), false);

    const wrongKey = join(output, "wrong.key");
    writeFileSync(wrongKey, Buffer.alloc(32, 7), { mode: 0o600 });
    const wrongTarget = join(output, "wrong-restore");
    assert.throws(() => restoreFullBackup(encrypted, wrongKey, wrongTarget));
    assert.equal(existsSync(wrongTarget), false);

    const plaintext = join(output, "archive.json");
    decryptSnapshot(encrypted, key, plaintext);
    const archive = JSON.parse(readFileSync(plaintext, "utf8"));
    const missingManifest = join(output, "missing-manifest.backup");
    writeFileSync(plaintext, JSON.stringify({ ...archive, documents: [], manifest: [] }));
    encryptSnapshot(plaintext, key, missingManifest);
    const missingManifestTarget = join(output, "manifest-restore");
    assert.throws(() => restoreFullBackup(missingManifest, key, missingManifestTarget));
    assert.equal(existsSync(missingManifestTarget), false);

    const badPath = structuredClone(archive);
    badPath.documents[0].path = "documents/../escape.pdf";
    badPath.manifest[0].path = "documents/../escape.pdf";
    const badPathBackup = join(output, "bad-path.backup");
    writeFileSync(plaintext, JSON.stringify(badPath));
    encryptSnapshot(plaintext, key, badPathBackup);
    const badPathTarget = join(output, "path-restore");
    assert.throws(() => restoreFullBackup(badPathBackup, key, badPathTarget));
    assert.equal(existsSync(badPathTarget), false);

    const badHash = structuredClone(archive);
    badHash.documents[0].data = Buffer.from("replacement").toString("base64");
    const badHashBackup = join(output, "bad-hash.backup");
    writeFileSync(plaintext, JSON.stringify(badHash));
    encryptSnapshot(plaintext, key, badHashBackup);
    const badHashTarget = join(output, "hash-restore");
    assert.throws(() => restoreFullBackup(badHashBackup, key, badHashTarget));
    assert.equal(existsSync(badHashTarget), false);
    assertNoStaging(output);
  } finally {
    for (const directory of temporary) rmSync(directory, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("restore sanitises account, OAuth and companion session material", () => {
  const data = makeData({ synthetic: workspace("Owned workspace", []) }, {}, true);
  const output = mkdtempSync(join(tmpdir(), "stride-full-sanitize-"));
  try {
    const key = join(output, "full.key");
    const encrypted = join(output, "full.backup");
    const restored = join(output, "restored");
    createFullBackup(data, key, encrypted);
    restoreFullBackup(encrypted, key, restored);

    const database = new DatabaseSync(join(restored, "stride.sqlite"), { readOnly: true });
    try {
      for (const table of ["account_sessions", "oauth_attempts", "companion_reviews"])
        assert.equal(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0);
      assert.equal(database.prepare("SELECT COUNT(*) AS count FROM sessions").get().count, 1);
    } finally { database.close(); }
    const bytes = readFileSync(join(restored, "stride.sqlite"));
    for (const value of ["synthetic-access", "synthetic-refresh", "synthetic-verifier"])
      assert.equal(bytes.includes(Buffer.from(value)), false);
  } finally {
    rmSync(data, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("document cleanup is a dry run by default and only removes old unreferenced UUID PDFs", () => {
  const directory = mkdtempSync(join(tmpdir(), "stride-cleanup-"));
  try {
    mkdirSync(join(directory, "documents"), { mode: 0o700 });
    chmodSync(join(directory, "documents"), 0o700);
    const keepOne = randomUUID();
    const keepTwo = randomUUID();
    const orphan = randomUUID();
    const fresh = randomUUID();
    const other = "not-a-uuid";
    const linked = randomUUID();
    writeDatabase(directory, {
      first: workspace("First", [material(keepOne)]),
      second: workspace("Second", [material(keepTwo)]),
    });
    const documents = join(directory, "documents");
    for (const storageKey of [keepOne, keepTwo, orphan]) {
      writeFileSync(join(documents, `${storageKey}.pdf`), "synthetic PDF", { mode: 0o600 });
    }
    writeFileSync(join(documents, `${fresh}.pdf`), "fresh preview", { mode: 0o600 });
    writeFileSync(join(documents, `${other}.pdf`), "other PDF", { mode: 0o600 });
    writeFileSync(join(documents, "notes.pdf"), "not a UUID", { mode: 0o600 });
    symlinkSync(join(documents, `${orphan}.pdf`), join(documents, `${linked}.pdf`));
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    for (const storageKey of [keepOne, keepTwo, orphan, other]) {
      utimesSync(join(documents, `${storageKey}.pdf`), old, old);
    }
    utimesSync(join(documents, "notes.pdf"), old, old);

    const dry = cleanupDocuments(directory, { now: Date.now() });
    assert.equal(dry.apply, false);
    assert.equal(dry.candidates, 1);
    assert.equal(dry.removed, 0);
    assert.equal(existsSync(join(documents, `${orphan}.pdf`)), true);

    const applied = cleanupDocuments(directory, { now: Date.now(), apply: true });
    assert.equal(applied.removed, 1);
    assert.equal(existsSync(join(documents, `${orphan}.pdf`)), false);
    for (const storageKey of [keepOne, keepTwo, fresh, other]) {
      assert.equal(existsSync(join(documents, `${storageKey}.pdf`)), true);
    }
    assert.equal(existsSync(join(documents, "notes.pdf")), true);
    assert.equal(lstatSync(join(documents, `${linked}.pdf`)).isSymbolicLink(), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("document cleanup fails closed on malformed workspace state", () => {
  const directory = mkdtempSync(join(tmpdir(), "stride-cleanup-invalid-"));
  try {
    mkdirSync(join(directory, "documents"), { mode: 0o700 });
    const orphan = randomUUID();
    writeFileSync(join(directory, "documents", `${orphan}.pdf`), "synthetic PDF", { mode: 0o600 });
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    utimesSync(join(directory, "documents", `${orphan}.pdf`), old, old);
    writeDatabase(directory, { malformed: "not valid json" });
    assert.throws(() => cleanupDocuments(directory, { now: Date.now(), apply: true }), /workspace/i);
    assert.equal(existsSync(join(directory, "documents", `${orphan}.pdf`)), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test('restore rotates guest identities and disables previously enabled daily jobs',()=>{const own=workspace('Synthetic owner'),guest=workspace('Synthetic guest');own.dailyPreferences={enabled:true,hour:8,version:3};const data=makeData({owner:own,guest},{}),out=mkdtempSync(join(tmpdir(),'stride-restore-consent-'));try{const c=new DatabaseSync(join(data,'stride.sqlite'));c.exec("ALTER TABLE sessions ADD COLUMN user_id TEXT; UPDATE sessions SET user_id='synthetic-owner' WHERE id='owner'; CREATE TABLE daily_runs(workspace TEXT); INSERT INTO daily_runs VALUES('owner')");c.close();const key=join(out,'key'),archive=join(out,'archive'),dest=join(out,'restored');createFullBackup(data,key,archive);restoreFullBackup(archive,key,dest);const r=new DatabaseSync(join(dest,'stride.sqlite'));assert.equal(r.prepare("SELECT count(*) AS n FROM sessions WHERE id='guest'").get().n,0);const state=JSON.parse(r.prepare("SELECT state FROM sessions WHERE id='owner'").get().state);assert.equal(state.dailyPreferences.enabled,false);assert.equal(state.dailyPreferences.version,4);assert.equal(r.prepare('SELECT count(*) AS n FROM daily_runs').get().n,0);r.close();}finally{rmSync(data,{recursive:true,force:true});rmSync(out,{recursive:true,force:true});}});
