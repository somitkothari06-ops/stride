import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { MaterialDraft } from "./course-types";

// Unconfirmed text stays in the browser. The current single-process preview
// signs it so a later save cannot substitute text that was never extracted.
// Restarting the server expires outstanding reviews; no key is persisted.
const secret = randomBytes(32);
function signature(session: string, candidate: MaterialDraft, expiresAt: number) {
  const { title: _editableTitle, ...source } = candidate;
  return createHmac("sha256", secret).update(JSON.stringify({ session, expiresAt, source })).digest("hex");
}
export function sealCourseDraft(session: string, candidate: MaterialDraft, now = Date.now()) {
  const expiresAt = now + 15 * 60 * 1000;
  return { expiresAt, proof: signature(session, candidate, expiresAt) };
}
export function checkCourseDraft(session: string, candidate: MaterialDraft, proof: unknown, expiresAt: unknown, now = Date.now()) {
  if (typeof proof !== "string" || !/^[a-f0-9]{64}$/.test(proof) || typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + 15 * 60 * 1000) throw new Error("COURSE_REVIEW_INVALID");
  const expected = signature(session, candidate, expiresAt);
  if (!timingSafeEqual(Buffer.from(proof, "hex"), Buffer.from(expected, "hex"))) throw new Error("COURSE_REVIEW_INVALID");
}
