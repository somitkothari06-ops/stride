import { DatabaseSync } from "node:sqlite";
import { lstatSync, readdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const UUID_FILE = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.pdf$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const EVIDENCE_FILE = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.([a-z0-9]{1,8})$/;

function referencedDocuments(databasePath) {
  const database = new DatabaseSync(resolve(databasePath), { readOnly: true });
  try {
    const keys = new Set();
    const evidence = new Set();
    for (const row of database.prepare("SELECT state FROM sessions").iterate()) {
      if (typeof row.state !== "string") throw new Error("Invalid workspace state");
      let state;
      try { state = JSON.parse(row.state); } catch { throw new Error("Invalid workspace state"); }
      if (!state || typeof state !== "object" || Array.isArray(state))
        throw new Error("Invalid workspace state");
      const materials = state.materials;
      if (materials !== undefined) {
        if (!Array.isArray(materials)) throw new Error("Invalid materials list");
        for (const material of materials) {
          if (!material || typeof material !== "object" || Array.isArray(material))
            throw new Error("Invalid material");
          if (material.storageKey === undefined) continue;
          if (typeof material.storageKey !== "string" || !UUID.test(material.storageKey))
            throw new Error("Invalid document reference");
          keys.add(material.storageKey.toLowerCase());
        }
      }
      const entries = state.evidence?.entries;
      if (entries !== undefined) {
        if (!Array.isArray(entries)) throw new Error("Invalid evidence journal");
        for (const entry of entries) {
          if (!entry || typeof entry !== "object" || Array.isArray(entry))
            throw new Error("Invalid evidence entry");
          const attachments = entry.observed?.attachments;
          if (attachments === undefined) continue;
          if (!Array.isArray(attachments)) throw new Error("Invalid attachment list");
          for (const attachment of attachments) {
            if (!attachment || typeof attachment !== "object" || Array.isArray(attachment))
              throw new Error("Invalid attachment");
            if (typeof attachment.key !== "string" || !UUID.test(attachment.key))
              throw new Error("Invalid attachment reference");
            if (typeof attachment.extension !== "string" || !/^[a-z0-9]{1,8}$/.test(attachment.extension))
              throw new Error("Invalid attachment reference");
            evidence.add(`${attachment.key.toLowerCase()}.${attachment.extension}`);
          }
        }
      }
    }
    return { keys, evidence };
  } finally {
    database.close();
  }
}

export function cleanupDocuments(dataDir, options = {}) {
  if (dataDir && typeof dataDir === "object") {
    options = dataDir;
    dataDir = options.dataDir || options.directory;
  }
  if (typeof options === "boolean") options = { apply: options };
  options = options || {};
  const apply = options.apply === true;
  const clock = options.now === undefined ? Date.now() : options.now;
  const now = clock instanceof Date ? clock.getTime() : clock;
  if (!Number.isFinite(now)) throw new Error("Invalid cleanup time");
  const directory = resolve(dataDir || process.env.STRIDE_DATA_DIR || join(process.cwd(), ".data"));
  const references = referencedDocuments(join(directory, "stride.sqlite"));
  const referenced = references.keys;
  const documentsDirectory = join(directory, "documents");
  const evidenceDirectory = join(directory, "evidence");

  const collect = (path) => {
    const info = lstatSync(path, { throwIfNoEntry: false });
    if (!info) return [];
    if (info.isSymbolicLink() || !info.isDirectory())
      throw new Error("Data directory is not a private directory");
    try { return readdirSync(path, { withFileTypes: true }); }
    catch { throw new Error("Data directory is unavailable"); }
  };

  const cutoff = now - MAX_AGE_MS;
  const candidates = [];
  let scanned = 0;

  const documentsInfo = collect(documentsDirectory);
  scanned += documentsInfo.length;
  for (const entry of documentsInfo) {
    const match = UUID_FILE.exec(entry.name);
    if (!match || !entry.isFile() || referenced.has(match[1].toLowerCase())) continue;
    const path = join(documentsDirectory, entry.name);
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile()) continue;
    if (info.mtimeMs >= cutoff) continue;
    candidates.push(path);
  }

  const evidenceInfo = collect(evidenceDirectory);
  scanned += evidenceInfo.length;
  for (const entry of evidenceInfo) {
    const match = EVIDENCE_FILE.exec(entry.name);
    if (!match || !entry.isFile() || references.evidence.has(`${match[1].toLowerCase()}.${match[2]}`)) continue;
    const path = join(evidenceDirectory, entry.name);
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile()) continue;
    if (info.mtimeMs >= cutoff) continue;
    candidates.push(path);
  }

  let removed = 0;
  if (apply) {
    for (const path of candidates) {
      try { unlinkSync(path); removed++; }
      catch { throw new Error("Document cleanup failed"); }
    }
  }
  return {
    apply,
    dryRun: !apply,
    scanned,
    referenced: referenced.size + references.evidence.size,
    candidates: candidates.length,
    removed,
  };
}

export const cleanupOrphanDocuments = cleanupDocuments;
export const cleanupOrphanedDocuments = cleanupDocuments;
export const cleanupDocumentFiles = cleanupDocuments;

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  try {
    const apply = args.includes("--apply");
    const positional = args.filter((argument) => argument !== "--apply");
    if (positional.some((argument) => argument.startsWith("--")) || positional.length > 1)
      throw new Error("Usage: node scripts/cleanup-documents.mjs [DATA_DIR] [--apply]");
    const result = cleanupDocuments(positional[0], { apply });
    console.log(JSON.stringify({
      operation: "cleanup-documents",
      mode: apply ? "apply" : "dry-run",
      dryRun: result.dryRun,
      candidates: result.candidates,
      removed: result.removed,
    }));
  } catch {
    console.error("Document cleanup failed. Check the data directory and database. No names, identifiers or content were printed.");
    process.exitCode = 1;
  }
}
