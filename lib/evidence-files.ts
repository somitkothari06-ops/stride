import { readFile, writeFile, mkdir, chmod, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// Evidence attachments live outside the workspace JSON, like course PDFs.
// Keys are unguessable UUIDs and every read goes through an ownership check,
// so one student can never open another student's upload.
const uuid = z.uuid();

export type AttachmentKind = "text" | "image";
export type AttachmentMime =
  | "text/plain"
  | "text/markdown"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export function evidenceFile(key: string, extension: string) {
  uuid.parse(key);
  if (!/^[a-z0-9]{1,8}$/.test(extension)) throw new Error("EVIDENCE_UNSUPPORTED");
  return join(
    process.env.STRIDE_DATA_DIR || join(process.cwd(), ".data"),
    "evidence",
    `${key}.${extension}`,
  );
}

export async function retainEvidence(
  key: string,
  extension: string,
  bytes: Uint8Array,
) {
  const path = evidenceFile(key, extension);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await chmod(dirname(path), 0o700);
  await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
}

export async function readEvidence(key: string, extension: string) {
  return new Uint8Array(await readFile(evidenceFile(key, extension)));
}

export async function removeEvidence(key: string, extension: string) {
  try {
    await unlink(evidenceFile(key, extension));
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
}

export async function evidenceExists(key: string, extension: string) {
  try {
    await readFile(evidenceFile(key, extension));
    return true;
  } catch {
    return false;
  }
}
