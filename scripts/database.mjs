import { DatabaseSync } from "node:sqlite";
import { chmodSync, closeSync, fsyncSync, linkSync, mkdirSync, mkdtempSync, openSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function flushPath(path) {
  const fd = openSync(path, "r");
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

// Keep database contents and session identifiers out of command output.
export function verifyDatabase(path) {
  const database = new DatabaseSync(resolve(path), { readOnly: true });
  try {
    const checks = database.prepare("PRAGMA integrity_check").all();
    if (checks.length !== 1 || Object.values(checks[0])[0] !== "ok")
      throw new Error("Database integrity check failed");
    for (const table of ["sessions", "usage", "provider_checks"])
      database.prepare(`SELECT * FROM ${table} LIMIT 0`).all();
    for (const row of database.prepare("SELECT state FROM sessions").iterate()) {
      const state = JSON.parse(row.state);
      if (!state || typeof state !== "object" || Array.isArray(state))
        throw new Error("Invalid workspace record");
    }
    return { integrity: "ok", sessions: database.prepare("SELECT COUNT(*) AS count FROM sessions").get().count };
  } finally {
    database.close();
  }
}

export function backupDatabase(source, destination) {
  const input = resolve(source);
  const output = resolve(destination);
  if (input === output) throw new Error("Source and destination must differ");
  // Staging is private and on the destination filesystem. The final hard link
  // publishes only a verified, flushed snapshot and never replaces a file.
  const staging = mkdtempSync(join(dirname(output), ".stride-backup-"));
  chmodSync(staging, 0o700);
  const temporary = join(staging, "snapshot.sqlite");
  try {
    const database = new DatabaseSync(input, { readOnly: true });
    try {
      database.exec("PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;");
      database.prepare("VACUUM INTO ?").run(temporary);
    } finally {
      database.close();
    }
    chmodSync(temporary, 0o600);
    const result = verifyDatabase(temporary);
    flushPath(temporary);
    linkSync(temporary, output);
    flushPath(dirname(output));
    return result;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

export function restoreDatabase(source, newDirectory) {
  const directory = resolve(newDirectory);
  // Restoring directly over a running database risks stale WAL replay. Require
  // a brand-new directory; the operator switches the stopped app separately.
  mkdirSync(directory, { mode: 0o700 });
  try {
    flushPath(dirname(directory));
    return backupDatabase(source, join(directory, "stride.sqlite"));
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, source, target] = process.argv.slice(2);
  try {
    if (!source || !["backup", "verify", "restore"].includes(command) || (command !== "verify" && !target))
      throw new Error("Usage: node scripts/database.mjs backup SOURCE DESTINATION | verify SOURCE | restore SOURCE NEW_DIRECTORY");
    const result = command === "verify" ? verifyDatabase(source)
      : command === "backup" ? backupDatabase(source, target) : restoreDatabase(source, target);
    console.log(JSON.stringify({ operation: command, ...result }));
  } catch {
    console.error("Database operation failed. Check arguments, permissions, source integrity and that the destination is new. No existing destination was replaced.");
    process.exitCode = 1;
  }
}
