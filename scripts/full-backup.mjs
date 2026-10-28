import { DatabaseSync } from "node:sqlite";
import { createHash,randomBytes } from "node:crypto";
import {
  chmodSync, closeSync, constants, fstatSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync,
  openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { backupDatabase, verifyDatabase } from "./database.mjs";
import { decryptSnapshot, encryptSnapshot } from "./encrypted-backup.mjs";

const FORMAT = "stride-full-backup";
const VERSION = 1;
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = MAX_ARCHIVE_BYTES;
const MAX_DOCUMENTS = 10000;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const INVALID_BASE64 = /[^A-Za-z0-9+/=]/;
const SENSITIVE_TABLES = ["account_sessions", "oauth_attempts", "companion_reviews"];

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function flushPath(path) {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function assertNewPath(path, label) {
  if (lstatSync(path, { throwIfNoEntry: false })) throw new Error(`${label} already exists`);
}

function writePrivateFile(path, bytes) {
  let complete = false;
  const fd = openSync(path, "wx", 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    complete = true;
  } finally {
    closeSync(fd);
    if (!complete) { try { unlinkSync(path); } catch {} }
  }
  chmodSync(path, 0o600);
}

function readReferencedFile(path, limit) {
  const before = lstatSync(path, { throwIfNoEntry: false });
  if (!before) throw new Error("Referenced document is missing");
  if (before.isSymbolicLink()) throw new Error("Referenced document must not be a symbolic link");
  if (!before.isFile()) throw new Error("Referenced document is not a regular file");
  if (before.size > limit) throw new Error("Referenced document exceeds the size limit");
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(fd);
    if (!opened.isFile()) throw new Error("Referenced document is not a regular file");
    if (opened.size !== before.size) throw new Error("Referenced document changed during backup");
    const bytes = readFileSync(fd);
    if (bytes.length !== opened.size) throw new Error("Referenced document changed during backup");
    return bytes;
  } catch (error) {
    if (error?.code === "ELOOP") throw new Error("Referenced document must not be a symbolic link");
    throw error;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function collectDocumentReferences(databasePath) {
  const database = new DatabaseSync(resolve(databasePath), { readOnly: true });
  try {
    const keys = new Set();
    for (const row of database.prepare("SELECT state FROM sessions").iterate()) {
      if (typeof row.state !== "string") throw new Error("Invalid workspace state in database");
      let state;
      try { state = JSON.parse(row.state); } catch { throw new Error("Invalid workspace state in database"); }
      if (!state || typeof state !== "object" || Array.isArray(state))
        throw new Error("Invalid workspace state in database");
      const materials = state.materials;
      if (materials === undefined) continue;
      if (!Array.isArray(materials)) throw new Error("Invalid materials list in workspace state");
      for (const material of materials) {
        if (!material || typeof material !== "object" || Array.isArray(material))
          throw new Error("Invalid material in workspace state");
        if (material.storageKey === undefined) continue;
        if (typeof material.storageKey !== "string" || !UUID.test(material.storageKey))
          throw new Error("Invalid document reference in workspace state");
        keys.add(material.storageKey);
      }
    }
    return keys;
  } finally {
    database.close();
  }
}

function assertReferences(keys, documents) {
  if (keys.size !== documents.length) throw new Error("Archive manifest does not match workspace references");
  const archived = new Set(documents.map((document) => document.storageKey));
  for (const key of keys) if (!archived.has(key)) throw new Error("Archive is missing a referenced document");
  for (const key of archived) if (!keys.has(key)) throw new Error("Archive contains an unreferenced document");
}

function decodeBytes(value, expectedSize, expectedHash, maximum, label) {
  if (typeof value !== "string" || value.length > Math.ceil(maximum / 3) * 4 + 8 ||
      value.length % 4 !== 0 || INVALID_BASE64.test(value))
    throw new Error(`Invalid ${label} data`);
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64")!==value || bytes.length !== expectedSize || hash(bytes) !== expectedHash)
    throw new Error(`Invalid ${label} checksum`);
  return bytes;
}

function assertEntry(entry, expectedPath, maximum, label) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Invalid ${label} entry`);
  if (entry.path !== expectedPath) throw new Error(`Invalid ${label} path`);
  if (!Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > maximum)
    throw new Error(`Invalid ${label} size`);
  if (typeof entry.sha256 !== "string" || !SHA256.test(entry.sha256))
    throw new Error(`Invalid ${label} checksum`);
  if (typeof entry.data !== "string") throw new Error(`Invalid ${label} data`);
  return entry;
}

function validateArchive(archive) {
  if (!archive || typeof archive !== "object" || Array.isArray(archive))
    throw new Error("Invalid backup archive");
  if (archive.format !== FORMAT || archive.version !== VERSION)
    throw new Error("Unsupported backup archive version");
  if (typeof archive.createdAt !== "string" || Number.isNaN(Date.parse(archive.createdAt)))
    throw new Error("Invalid backup archive metadata");
  assertEntry(archive.snapshot, "stride.sqlite", MAX_ARCHIVE_BYTES, "database snapshot");
  if (!Array.isArray(archive.documents) || archive.documents.length > MAX_DOCUMENTS)
    throw new Error("Invalid document list in archive");

  const seen = new Set();
  for (const document of archive.documents) {
    if (!document || typeof document !== "object" || Array.isArray(document))
      throw new Error("Invalid document entry in archive");
    if (typeof document.storageKey !== "string" || !UUID.test(document.storageKey))
      throw new Error("Invalid document identifier in archive");
    if (seen.has(document.storageKey)) throw new Error("Duplicate document in archive");
    seen.add(document.storageKey);
    const filename = `${document.storageKey}.pdf`;
    assertEntry(document, `documents/${filename}`, MAX_DOCUMENT_BYTES, "document");
    if (document.filename !== filename) throw new Error("Invalid document name in archive");
  }

  if (!Array.isArray(archive.manifest) || archive.manifest.length !== archive.documents.length)
    throw new Error("Invalid archive manifest");
  const byKey = new Map(archive.documents.map((document) => [document.storageKey, document]));
  const manifestKeys = new Set();
  for (const entry of archive.manifest) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      throw new Error("Invalid archive manifest entry");
    if (typeof entry.storageKey !== "string" || !byKey.has(entry.storageKey))
      throw new Error("Archive manifest references a missing document");
    if (manifestKeys.has(entry.storageKey)) throw new Error("Duplicate archive manifest entry");
    manifestKeys.add(entry.storageKey);
    const document = byKey.get(entry.storageKey);
    if (entry.path !== document.path || entry.filename !== document.filename ||
        entry.sha256 !== document.sha256 || entry.size !== document.size)
      throw new Error("Archive manifest does not match document data");
  }
  return archive;
}

function parseArchive(path) {
  let archive;
  try { archive = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new Error("Invalid backup archive"); }
  return validateArchive(archive);
}

function sanitizeDatabase(path) {
  const database = new DatabaseSync(path);
  try {
    // Overwrite deleted cells and rebuild the file so revoked credentials do
    // not linger in free pages of the restored database.
    database.exec("PRAGMA secure_delete=ON");
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const table of SENSITIVE_TABLES) {
        const present = database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
        if (present) database.prepare(`DELETE FROM ${table}`).run();
      }
      // A restored snapshot must not reactivate old scheduled consent.
      for (const row of database.prepare("SELECT id,state FROM sessions").all()) {
        const state=JSON.parse(row.state);
        if(state.dailyPreferences){state.dailyPreferences.enabled=false;state.dailyPreferences.version=(state.dailyPreferences.version||0)+1;database.prepare("UPDATE sessions SET state=? WHERE id=?").run(JSON.stringify(state),row.id);}
      }
      const hasOwners=database.prepare("PRAGMA table_info(sessions)").all().some(c=>c.name==="user_id");
      if(hasOwners)for(const guest of database.prepare("SELECT id FROM sessions WHERE user_id IS NULL").all())database.prepare("UPDATE sessions SET id=? WHERE id=? AND user_id IS NULL").run(randomBytes(32).toString("hex"),guest.id);
      const jobs=database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='daily_runs'").get();
      if(jobs)database.exec("DELETE FROM daily_runs");
      database.exec("COMMIT");
    } catch (error) {
      try { database.exec("ROLLBACK"); } catch {}
      throw error;
    }
    database.exec("PRAGMA journal_mode=DELETE");
    database.exec("VACUUM");
  } finally {
    database.close();
  }
  for (const suffix of ["-wal", "-shm"]) {
    try { unlinkSync(path + suffix); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  flushPath(path);
}

export function createFullBackup(dataDir, keyPath, newOutput) {
  const directory = resolve(dataDir);
  const source = join(directory, "stride.sqlite");
  const output = resolve(newOutput);
  const key = resolve(keyPath);
  assertNewPath(output, "Backup output");
  if (output === key) throw new Error("Backup output and key must differ");

  mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
  const staging = mkdtempSync(join(dirname(output), ".stride-full-backup-"));
  chmodSync(staging, 0o700);
  try {
    const snapshot = join(staging, "stride.sqlite");
    const result = backupDatabase(source, snapshot);
    const snapshotBytes = readFileSync(snapshot);
    if (snapshotBytes.length > MAX_ARCHIVE_BYTES) throw new Error("Database snapshot exceeds the size limit");

    const references = [...collectDocumentReferences(snapshot)].sort();
    const documentsDirectory = join(directory, "documents");
    if (references.length) {
      const info = lstatSync(documentsDirectory, { throwIfNoEntry: false });
      if (!info || info.isSymbolicLink() || !info.isDirectory())
        throw new Error("Documents directory is missing or not a private directory");
    }

    const documents = [];
    let rawBytes = snapshotBytes.length;
    for (const storageKey of references) {
      const filename = `${storageKey}.pdf`;
      const bytes = readReferencedFile(join(directory, "documents", filename), MAX_DOCUMENT_BYTES);
      rawBytes += bytes.length;
      if (Math.ceil(rawBytes / 3) * 4 + 65536 > MAX_ARCHIVE_BYTES)
        throw new Error("Full backup exceeds the size limit");
      documents.push({
        path: `documents/${filename}`,
        storageKey,
        filename,
        sha256: hash(bytes),
        size: bytes.length,
        data: bytes.toString("base64"),
      });
    }

    const archive = {
      format: FORMAT,
      version: VERSION,
      createdAt: new Date().toISOString(),
      snapshot: {
        path: "stride.sqlite",
        sha256: hash(snapshotBytes),
        size: snapshotBytes.length,
        data: snapshotBytes.toString("base64"),
      },
      documents,
      manifest: documents.map(({ data: _data, ...entry }) => entry),
    };
    const plainBytes = Buffer.from(JSON.stringify(archive));
    if (plainBytes.length > MAX_ARCHIVE_BYTES) throw new Error("Full backup exceeds the size limit");

    const plaintext = join(staging, "archive.json");
    writePrivateFile(plaintext, plainBytes);
    encryptSnapshot(plaintext, key, output);
    chmodSync(output, 0o600);
    flushPath(dirname(output));
    return {
      status: "complete",
      sessions: result.sessions,
      documents: documents.length,
      bytes: lstatSync(output).size,
    };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

export function restoreFullBackup(encrypted, keyPath, newDirectory) {
  const source = resolve(encrypted);
  const key = resolve(keyPath);
  const target = resolve(newDirectory);
  assertNewPath(target, "Restore destination");
  const encryptedInfo = lstatSync(source, { throwIfNoEntry: false });
  if (!encryptedInfo || encryptedInfo.isSymbolicLink() || !encryptedInfo.isFile())
    throw new Error("Encrypted backup is missing or invalid");
  if (encryptedInfo.size > MAX_ARCHIVE_BYTES + 4096) throw new Error("Encrypted backup exceeds the size limit");

  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const staging = mkdtempSync(join(dirname(target), ".stride-restore-"));
  chmodSync(staging, 0o700);
  try {
    const plaintext = join(staging, "archive.json");
    decryptSnapshot(source, key, plaintext);
    const plainInfo = lstatSync(plaintext, { throwIfNoEntry: false });
    if (!plainInfo || !plainInfo.isFile() || plainInfo.size > MAX_ARCHIVE_BYTES)
      throw new Error("Backup archive exceeds the size limit");
    const archive = parseArchive(plaintext);
    unlinkSync(plaintext);

    const data = join(staging, "data");
    mkdirSync(data, { mode: 0o700 });
    chmodSync(data, 0o700);
    const databasePath = join(data, "stride.sqlite");
    writePrivateFile(databasePath, decodeBytes(
      archive.snapshot.data, archive.snapshot.size, archive.snapshot.sha256,
      MAX_ARCHIVE_BYTES, "snapshot",
    ));

    const documentsDirectory = join(data, "documents");
    mkdirSync(documentsDirectory, { mode: 0o700 });
    chmodSync(documentsDirectory, 0o700);
    for (const document of archive.documents) {
      const bytes = decodeBytes(
        document.data, document.size, document.sha256, MAX_DOCUMENT_BYTES, "document",
      );
      writePrivateFile(join(documentsDirectory, document.filename), bytes);
    }

    verifyDatabase(databasePath);
    assertReferences(collectDocumentReferences(databasePath), archive.documents);
    sanitizeDatabase(databasePath);
    const restored = verifyDatabase(databasePath);

    flushPath(databasePath);
    for (const name of [...archive.documents.map((document) => document.filename)]) {
      flushPath(join(documentsDirectory, name));
    }
    flushPath(documentsDirectory);
    flushPath(data);
    flushPath(staging);

    // Publication is a single rename from a private sibling staging directory.
    // Re-check immediately before it so an existing directory is never replaced.
    assertNewPath(target, "Restore destination");
    renameSync(data, target);
    flushPath(dirname(target));
    return {
      status: "complete",
      sessions: restored.sessions,
      documents: archive.documents.length,
    };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [operation, first, key, destination] = process.argv.slice(2);
  try {
    if (!["backup", "restore"].includes(operation) || !first || !key || !destination)
      throw new Error("Usage: node scripts/full-backup.mjs backup DATA_DIR KEY_FILE NEW_OUTPUT | restore ENCRYPTED KEY_FILE NEW_DIRECTORY");
    const result = operation === "backup"
      ? createFullBackup(first, key, destination)
      : restoreFullBackup(first, key, destination);
    console.log(JSON.stringify({ operation, ...result }));
  } catch {
    console.error("Full backup operation failed. Check arguments, permissions, key access and that the destination is new. No existing destination was replaced.");
    process.exitCode = 1;
  }
}
