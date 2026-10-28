import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFullBackup, restoreFullBackup } from "../scripts/full-backup.mjs";
import { cleanupDocuments } from "../scripts/cleanup-documents.mjs";

function workspace(name, attachments = []) {
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
    materials: [],
    ...(attachments.length ? { evidence: { entries: [{ id: "entry-1", observed: { attachments } }] } } : {}),
  };
}

function attachment(key, extension) {
  return { key, filename: `${key}.${extension}`, kind: extension === "png" ? "image" : "text", extension, size: 16, uploadedAt: "2026-10-28T09:00:00.000Z" };
}

function makeData(rows, documents, evidence) {
  const directory = mkdtempSync(join(tmpdir(), "stride-evidence-data-"));
  chmodSync(directory, 0o700);
  mkdirSync(join(directory, "documents"), { mode: 0o700 });
  chmodSync(join(directory, "documents"), 0o700);
  mkdirSync(join(directory, "evidence"), { mode: 0o700 });
  chmodSync(join(directory, "evidence"), 0o700);
  const database = new DatabaseSync(join(directory, "stride.sqlite"));
  try {
    database.exec(
      "CREATE TABLE sessions (id TEXT PRIMARY KEY,state TEXT NOT NULL,updated TEXT NOT NULL);" +
      "CREATE TABLE usage (session TEXT NOT NULL,day TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session,day));" +
      "CREATE TABLE provider_checks (config_id TEXT PRIMARY KEY,verified_at TEXT,last_failure_at TEXT);",
    );
    for (const [id, state] of Object.entries(rows))
      database.prepare("INSERT INTO sessions VALUES(?,?,?)").run(id, JSON.stringify(state), "2026-10-27T00:00:00.000Z");
  } finally {
    database.close();
  }
  for (const [name, bytes] of Object.entries(documents))
    writeFileSync(join(directory, "documents", name), bytes, { mode: 0o600 });
  for (const [name, bytes] of Object.entries(evidence))
    writeFileSync(join(directory, "evidence", name), bytes, { mode: 0o600 });
  return directory;
}

test("full backup and restore keep evidence attachments private and recoverable", () => {
  const pngKey = randomUUID();
  const mdKey = randomUUID();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
  const md = Buffer.from("# Synthetic notes\n");
  const data = makeData(
    { synthetic: workspace("Journal owner", [attachment(pngKey, "png"), attachment(mdKey, "md")]) },
    {},
    { [`${pngKey}.png`]: png, [`${mdKey}.md`]: md },
  );
  const output = mkdtempSync(join(tmpdir(), "stride-evidence-out-"));
  try {
    const key = join(output, "full.key");
    const encrypted = join(output, "full.backup");
    assert.deepEqual(createFullBackup(data, key, encrypted), {
      status: "complete",
      sessions: 1,
      documents: 0,
      attachments: 2,
      bytes: statSync(encrypted).size,
    });

    const restored = join(output, "restored");
    assert.deepEqual(restoreFullBackup(encrypted, key, restored), {
      status: "complete",
      sessions: 1,
      documents: 0,
      attachments: 2,
    });
    assert.equal(statSync(join(restored, "evidence")).mode & 0o777, 0o700);
    assert.equal(statSync(join(restored, "evidence", `${pngKey}.png`)).mode & 0o777, 0o600);
    assert.deepEqual(readFileSync(join(restored, "evidence", `${mdKey}.md`)), md);
  } finally {
    rmSync(data, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("a tampered or missing attachment refuses backup and restore", () => {
  const pngKey = randomUUID();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9, 9, 9]);
  const data = makeData(
    { synthetic: workspace("Tamper check", [attachment(pngKey, "png")]) },
    {},
    { [`${pngKey}.png`]: png },
  );
  const output = mkdtempSync(join(tmpdir(), "stride-evidence-tamper-"));
  try {
    const key = join(output, "full.key");
    const encrypted = join(output, "full.backup");
    createFullBackup(data, key, encrypted);

    // Remove the referenced file: a later backup must fail rather than strand it.
    const missingData = makeData(
      { synthetic: workspace("Missing attachment", [attachment(pngKey, "png")]) },
      {},
      {},
    );
    assert.throws(() => createFullBackup(missingData, key, join(output, "missing.backup")), /missing/i);
    assert.equal(existsSync(join(output, "missing.backup")), false);

    // Tamper with the archived attachment bytes: restore must refuse.
    const restored = join(output, "restored");
    // Flip one byte inside the encrypted archive.
    const bytes = readFileSync(encrypted);
    bytes[bytes.length - 1] ^= 1;
    const tampered = join(output, "tampered.backup");
    writeFileSync(tampered, bytes, { mode: 0o600 });
    assert.throws(() => restoreFullBackup(tampered, key, restored));
    assert.equal(existsSync(restored), false);
    assert.deepEqual(readdirSync(output).filter((name) => name.startsWith(".stride-")), []);
  } finally {
    rmSync(data, { recursive: true, force: true });
    rmSync(output, { recursive: true, force: true });
  }
});

test("cleanup removes orphaned evidence files and keeps referenced ones", () => {
  const kept = randomUUID();
  const orphan = randomUUID();
  const data = makeData(
    { synthetic: workspace("Cleanup", [attachment(kept, "png")]) },
    {},
    { [`${kept}.png`]: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), [`${orphan}.txt`]: Buffer.from("orphaned") },
  );
  try {
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    for (const name of [`${kept}.png`, `${orphan}.txt`])
      utimesSync(join(data, "evidence", name), old, old);
    const dry = cleanupDocuments(data, { now: Date.now() });
    assert.equal(dry.candidates, 1);
    assert.equal(existsSync(join(data, "evidence", `${orphan}.txt`)), true);
    const applied = cleanupDocuments(data, { now: Date.now(), apply: true });
    assert.equal(applied.removed, 1);
    assert.equal(existsSync(join(data, "evidence", `${orphan}.txt`)), false);
    assert.equal(existsSync(join(data, "evidence", `${kept}.png`)), true);
  } finally {
    rmSync(data, { recursive: true, force: true });
  }
});
