import { invalidateRoleBridge } from "./role-bridge";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Workspace } from "./types";
import { db, getState } from "./store";
import {
  evidenceExists,
  removeEvidence,
  type AttachmentKind,
  type AttachmentMime,
} from "./evidence-files";
import { clearReturnCardIfStale } from "./focus-session";

// Bounds are strict on purpose: an evidence journal is a record of real work,
// not a general file store. Every limit below is enforced before anything is
// saved, and every file is checked by content signature, not by name alone.
export const MAX_EVIDENCE_ENTRIES = 60;
// The shared vision model accepts at most five images per request, and five
// images plus text keep the whole multipart request under the 16 MB proxy
// limit. Per-file size bounds are unchanged.
export const MAX_ATTACHMENTS = 5;
export const MAX_TEXT_ATTACHMENT_BYTES = 262144;
export const MAX_IMAGE_ATTACHMENT_BYTES = 3_000_000;
export const MAX_SUBMISSION_CHARS = 12000;
// The submission plus all text attachments sent to the model together stay
// under this bound; anything larger is rejected explicitly, never clipped.
export const MAX_COMBINED_TEXT_CHARS = 24000;
export const MAX_PENDING_REVIEWS = 6;
export const REVIEW_MINUTES = 15;

const specs = {
  txt: { kind: "text", mime: "text/plain", max: MAX_TEXT_ATTACHMENT_BYTES },
  md: { kind: "text", mime: "text/markdown", max: MAX_TEXT_ATTACHMENT_BYTES },
  png: { kind: "image", mime: "image/png", max: MAX_IMAGE_ATTACHMENT_BYTES },
  jpg: { kind: "image", mime: "image/jpeg", max: MAX_IMAGE_ATTACHMENT_BYTES },
  jpeg: { kind: "image", mime: "image/jpeg", max: MAX_IMAGE_ATTACHMENT_BYTES },
  webp: { kind: "image", mime: "image/webp", max: MAX_IMAGE_ATTACHMENT_BYTES },
} as const satisfies Record<string, { kind: AttachmentKind; mime: AttachmentMime; max: number }>;

export type AttachmentSpec = typeof specs[keyof typeof specs];
const utf8 = new TextDecoder("utf-8", { fatal: true });

function signatureMatches(extension: keyof typeof specs, bytes: Uint8Array) {
  if (specs[extension].kind === "text") {
    if (bytes.length === 0) return false;
    try {
      const text = utf8.decode(bytes);
      // A text file that is really an executable or binary blob contains NUL
      // bytes or unusual control characters; plain work never does.
      return !/[\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u000e\u000f\u0010-\u001f]/.test(
        text,
      );
    } catch {
      return false;
    }
  }
  if (extension === "png")
    return (
      bytes.length > 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
      bytes[6] === 0x1a && bytes[7] === 0x0a
    );
  if (extension === "jpg" || extension === "jpeg")
    return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "webp")
    return (
      bytes.length > 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    );
  return false;
}

function isExecutable(bytes: Uint8Array) {
  return (
    (bytes.length > 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) ||
    (bytes.length > 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46)
  );
}

export type PreparedAttachment = {
  key: string;
  filename: string;
  kind: AttachmentKind;
  mime: AttachmentMime;
  extension: keyof typeof specs;
  size: number;
  uploadedAt: string;
};

// Validates one uploaded file by content and name. Throws EVIDENCE_UNSUPPORTED
// for types we never accept (SVG, documents, executables), EVIDENCE_TOO_LARGE
// over the byte bound, and EVIDENCE_MISMATCH when the name and the bytes
// disagree (a spoofed screenshot is not a screenshot).
export function prepareAttachment(name: string, bytes: Uint8Array, now = new Date().toISOString()): PreparedAttachment {
  const filename = name.replace(/^.*[\\/]/, "").slice(0, 160);
  const dot = filename.lastIndexOf(".");
  const rawExtension = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
  // Object.hasOwn, not `in`: inherited keys such as "constructor" or
  // "toString" must never be treated as accepted file types.
  if (!Object.hasOwn(specs, rawExtension)) throw new Error("EVIDENCE_UNSUPPORTED");
  const extension = rawExtension as keyof typeof specs;
  if (bytes.length === 0 || bytes.length > specs[extension].max)
    throw new Error("EVIDENCE_TOO_LARGE");
  if (isExecutable(bytes)) throw new Error("EVIDENCE_UNSUPPORTED");
  if (!signatureMatches(extension, bytes)) throw new Error("EVIDENCE_MISMATCH");
  return {
    key: randomUUID(),
    filename,
    kind: specs[extension].kind,
    mime: specs[extension].mime,
    extension,
    size: bytes.length,
    uploadedAt: now,
  };
}

export function validActivityDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("EVIDENCE_INVALID_DATE");
  const parsed = new Date(value + "T12:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error("EVIDENCE_INVALID_DATE");
  return value;
}

// The model only proposes a record; it never decides what is true. These
// patterns reject model output that claims verification, authorship, mastery
// or executed tests as fact.
const bannedClaims: RegExp[] = [
  /\b(i|we)\s+(?:have\s+)?(verified|confirmed|certified|guarantee)\b/i,
  /\b(i|we)\s+(ran|executed)\s+(your|the)\s+(code|tests?|program)\b/i,
  /\byou\s+(have|'ve|are)\s+(mastered|proficient|verified|competent)\b/i,
  /\bmastered?\b/i,
  /\bmastery\s+(?:is|was|has been)\s+(?:confirmed|verified|proven|certified)\b/i,
  /\bauthorship\s+(?:is|was|has been)\s+(?:confirmed|verified|proven|certified)\b/i,
  /\b(?:confirmed|verified|proven|certified)\s+authorship\b/i,
  /\bproves?\s+(that\s+)?you\b/i,
  /\byour\s+work\s+date\s+(?:is|was)\s+(?:confirmed|verified|proven)\b/i,
];

export function checkGrounding(candidate: EvidenceCandidate) {
  const text = [candidate.artifactShows, candidate.modelFeedback, candidate.uncertainty, candidate.nextSuggestion].join("\n");
  for (const pattern of bannedClaims)
    if (pattern.test(text)) throw new Error("EVIDENCE_CLAIM_INVALID");
}

export const EvidenceCandidateSchema = z.object({
  activity: z.string().trim().min(1).max(300),
  artifactShows: z.string().trim().min(1).max(800),
  // The student explanation keeps the actual submission: it may be as long as
  // the submitted text itself (MAX_SUBMISSION_CHARS), never a forced summary.
  studentExplanation: z.string().trim().min(1).max(MAX_SUBMISSION_CHARS),
  modelFeedback: z.string().trim().max(1500).default(""),
  uncertainty: z.string().trim().max(500).default(""),
  nextSuggestion: z.string().trim().max(500).default(""),
});
export type EvidenceCandidate = z.infer<typeof EvidenceCandidateSchema>;

export const EvidenceAttachmentSchema = z.object({
  key: z.uuid(),
  filename: z.string().min(1).max(160),
  kind: z.enum(["text", "image"]),
  mime: z.enum(["text/plain", "text/markdown", "image/png", "image/jpeg", "image/webp"]),
  extension: z.string().regex(/^[a-z0-9]{1,8}$/),
  size: z.number().int().positive(),
  uploadedAt: z.string().min(1),
});
export type EvidenceAttachment = z.infer<typeof EvidenceAttachmentSchema>;

export const EvidenceEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  kind: z.enum(["evidence", "session"]),
  assessment:z.enum(["model","unassessed"]).optional(),
  reported: z.object({
    activity: z.string().max(300),
    explanation: z.string().max(MAX_SUBMISSION_CHARS),
  }),
  observed: z.object({
    artifactShows: z.string().max(800),
    attachments: z.array(EvidenceAttachmentSchema).max(MAX_ATTACHMENTS),
  }),
  modelFeedback: z.string().max(1500),
  uncertainty: z.string().max(500),
  nextSuggestion: z.string().max(500),
  // The exact text the student submitted before any draft edits, kept so the
  // original words stay traceable even after the reviewed fields are changed.
  originalSubmission: z.string().max(MAX_SUBMISSION_CHARS).optional(),
  focusId: z.string().min(1).optional(),
});
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;

export const evidenceTask = `You help a student keep an honest evidence journal. You receive what the student submitted in their own words, and optionally the contents of small text files or screenshots they attached. Return ONE proposed journal record as JSON with the keys "activity", "artifactShows", "studentExplanation", "modelFeedback", "uncertainty" and "nextSuggestion".
"activity": what the student says they did, in neutral words (max 300 characters). Use only what the student or the attached material actually says.
"artifactShows": what the pasted text or attachments actually show, closely paraphrased (max 800 characters). If nothing was attached, describe what the pasted submission itself contains.
"studentExplanation": a short exact excerpt from the student's explanation, at most 300 characters. The server will preserve their complete submission separately; never upgrade or correct it.
"modelFeedback": one short, kind observation or question about gaps or a next step (max 1500 characters). Say what you can and cannot tell from this submission alone.
"uncertainty": what remains unclear from this submission alone (max 500 characters).
"nextSuggestion": one small, concrete next step (max 500 characters).
Hard rules: never state or imply the date the work was done, who created it, that any test was run or passed, or any level of mastery as fact. If the submission does not show something, put that in "uncertainty" instead of filling the gap. Never claim you verified, executed or checked anything.`;

export function evidenceModelData(
  submission: string,
  attachments: { filename: string; kind: AttachmentKind; excerpt?: string }[],
) {
  return {
    submission,
    attachments: attachments.map(({ filename, kind, excerpt }) => ({
      filename,
      kind,
      ...(excerpt !== undefined ? { textExcerpt: excerpt } : {}),
    })),
  };
}

// A text attachment is decoded in full, valid UTF-8 only. Nothing is silently
// clipped: if the content is not valid UTF-8 the attachment is refused, and if
// the combined submission plus text attachments exceed MAX_COMBINED_TEXT_CHARS
// the submission is rejected with an explicit error instead of being trimmed.
export function evidenceTextExcerpt(bytes: Uint8Array) {
  try {
    return utf8.decode(bytes);
  } catch {
    throw new Error("EVIDENCE_MISMATCH");
  }
}

export function assertCombinedTextLimit(submission: string, textExcerpts: string[]) {
  const total =
    submission.length +
    textExcerpts.reduce((sum, excerpt) => sum + excerpt.length, 0);
  if (total > MAX_COMBINED_TEXT_CHARS) throw new Error("EVIDENCE_TEXT_TOO_LONG");
}

// Unconfirmed journal records stay out of personal memory. The pending review
// is stored server-side with an expiry and an ownership column, mirroring the
// companion capture flow: a later save cannot substitute content that was
// never reviewed. Pending reviews expire after 15 minutes.
type ReviewPayload = {
  mode?:"model"|"unassessed";
  candidate: EvidenceCandidate;
  originalText: string;
  attachments: EvidenceAttachment[];
};
const ReviewPayloadSchema = z.object({
  mode:z.enum(["model","unassessed"]).default("model"),
  candidate: EvidenceCandidateSchema,
  originalText: z.string().max(MAX_SUBMISSION_CHARS),
  attachments: z.array(EvidenceAttachmentSchema).max(MAX_ATTACHMENTS),
});

function database() {
  const connection = db();
  connection.exec(
    "CREATE TABLE IF NOT EXISTS evidence_reviews (id TEXT PRIMARY KEY, session TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, expires INTEGER NOT NULL, committed INTEGER NOT NULL DEFAULT 0)",
  );
  return connection;
}

export function createEvidenceReview(
  session: string,
  revision: number,
  payload: ReviewPayload,
) {
  const validated = ReviewPayloadSchema.parse(payload);
  const connection = database();
  const now = Date.now();
  connection.prepare("DELETE FROM evidence_reviews WHERE (committed=0 AND expires<=?) OR session NOT IN (SELECT id FROM sessions)").run(now);
  const pending = connection
    .prepare("SELECT count(*) AS n FROM evidence_reviews WHERE session=? AND committed=0")
    .get(session) as { n: number };
  if (pending.n >= MAX_PENDING_REVIEWS) throw new Error("EVIDENCE_LIMIT");
  const id = randomUUID();
  connection
    .prepare("INSERT INTO evidence_reviews(id,session,payload,revision,expires) VALUES(?,?,?,?,?)")
    .run(id, session, JSON.stringify(validated), revision, now + REVIEW_MINUTES * 60 * 1000);
  return { id, expiresAt: now + REVIEW_MINUTES * 60 * 1000 };
}

function attachmentKeyUsed(state: Workspace, key: string) {
  return (state.evidence?.entries || []).some((entry) =>
    entry.observed.attachments.some((attachment) => attachment.key === key),
  );
}

function reviewRow(
  connection: ReturnType<typeof database>,
  reviewId: string,
  session: string,
) {
  return connection
    .prepare("SELECT * FROM evidence_reviews WHERE id=? AND session=?")
    .get(reviewId, session) as
    | { payload: string; revision: number; expires: number; committed: number }
    | undefined;
}

// Commit is atomic and duplicate-safe: the review row carries a committed flag
// so a replay returns the saved workspace instead of adding a second entry.
// The student may edit the proposed fields; the original submission text and
// the attachment list cannot be swapped for different content.
//
// SQLite here is one shared synchronous connection. An await inside
// BEGIN IMMEDIATE/COMMIT would let a concurrent request run its own
// transaction on the same connection while this one is open (interleaving, or
// a nested BEGIN that rolls back this transaction). So every async step —
// the file existence checks — happens as a preflight BEFORE the transaction
// starts, and the transaction body is strictly synchronous: the review row,
// its expiry, the workspace revision and the full state are re-read inside it
// so the commit still sees the authoritative picture.
export async function commitEvidence(
  session: string,
  reviewId: string,
  candidate: EvidenceCandidate,
  activityDate: unknown,
  now = new Date().toISOString(),
) {
  const reviewed = EvidenceCandidateSchema.parse(candidate);
  const date = validActivityDate(activityDate);
  const connection = database();

  // Preflight: only for an uncommitted, unexpired review of this session.
  // A missing attachment file is refused before any transaction is opened.
  const preview = reviewRow(connection, reviewId, session);
  if (preview && !preview.committed && preview.expires > Date.now()) {
    let preflight: { attachments: EvidenceAttachment[] } | undefined;
    try {
      preflight = ReviewPayloadSchema.parse(JSON.parse(preview.payload));
    } catch {
      // A malformed payload is refused authoritatively inside the transaction
      // below; the preflight only accelerates the common missing-file case.
    }
    if (preflight) {
      const statuses = await Promise.all(
        preflight.attachments.map((attachment) =>
          evidenceExists(attachment.key, attachment.extension),
        ),
      );
      if (statuses.some((exists) => !exists))
        throw new Error("EVIDENCE_ATTACHMENT_MISSING");
    }
  }

  connection.exec("BEGIN IMMEDIATE");
  try {
    const row = reviewRow(connection, reviewId, session);
    if (!row || (!row.committed && row.expires <= Date.now())) throw new Error("EVIDENCE_REVIEW_INVALID");
    const state = getState(session);
    if (!state) throw new Error("SESSION_EXPIRED");
    if (!row.committed) {
      if (state.revision !== row.revision) throw new Error("EVIDENCE_STALE");
      const payload = ReviewPayloadSchema.parse(JSON.parse(row.payload));
      for (const attachment of payload.attachments) {
        if (attachmentKeyUsed(state, attachment.key))
          throw new Error("EVIDENCE_ATTACHMENT_MISSING");
      }
      // The model-owned fields are bound to the stored candidate: the client
      // may edit its own activity and explanation, but it cannot rewrite what
      // was reviewed as model output and have it saved as such.
      const owned = ["artifactShows", "modelFeedback", "uncertainty", "nextSuggestion"] as const;
      for (const field of owned)
        if (reviewed[field] !== payload.candidate[field])
          throw new Error("EVIDENCE_TAMPERED");
      if ((state.evidence?.entries.length || 0) >= MAX_EVIDENCE_ENTRIES)
        throw new Error("EVIDENCE_LIMIT");
      const entry: EvidenceEntry = {
        id: randomUUID(),
        createdAt: now,
        activityDate: date,
        kind: "evidence",
        assessment:payload.mode,
        reported: { activity: reviewed.activity, explanation: reviewed.studentExplanation },
        observed: { artifactShows: reviewed.artifactShows, attachments: payload.attachments },
        modelFeedback: reviewed.modelFeedback,
        uncertainty: reviewed.uncertainty,
        nextSuggestion: reviewed.nextSuggestion,
        ...(payload.originalText ? { originalSubmission: payload.originalText } : {}),
        ...(state.focus && !state.focus.closedAt ? { focusId: state.focus.id } : {}),
      };
      state.evidence = { entries: [...(state.evidence?.entries || []), entry] };
      state.revision++;
      invalidateRoleBridge(state);
      connection
        .prepare("UPDATE sessions SET state=?,updated=? WHERE id=?")
        .run(JSON.stringify(state), now, session);
      // Only an idempotency marker remains; the unconfirmed draft is discarded.
      connection
        .prepare("UPDATE evidence_reviews SET committed=1,payload='{}' WHERE id=?")
        .run(reviewId);
    }
    connection.exec("COMMIT");
    return state;
  } catch (error) {
    connection.exec("ROLLBACK");
    // A refusal because the journal is already full is terminal for this
    // preview: the reviewed words stay on screen and the student must remove an
    // entry before recording again. Discard the row so a refused commit cannot
    // occupy one of the few pending-review slots until it expires. Its files
    // become unreferenced and are handled by the existing cleanup grace period.
    if (error instanceof Error && error.message === "EVIDENCE_LIMIT") {
      connection
        .prepare("DELETE FROM evidence_reviews WHERE id=? AND session=? AND committed=0")
        .run(reviewId, session);
    }
    throw error;
  }
}

export async function deleteEvidenceEntry(state: Workspace, entryId: string) {
  const entry = (state.evidence?.entries || []).find((item) => item.id === entryId);
  if (!entry) throw new Error("NOT_FOUND");
  state.evidence = { entries: (state.evidence?.entries || []).filter((item) => item.id !== entryId) };
  state.revision++;
  invalidateRoleBridge(state);
  // A saved continuation that points at the deleted entry is derived from
  // evidence that no longer exists; it must not survive the delete.
  clearReturnCardIfStale(state);
  for (const attachment of entry.observed.attachments)
    await removeEvidence(attachment.key, attachment.extension);
}

// An attachment is readable only by the workspace that references it in a
// saved entry or in one of its own unexpired pending reviews.
export function attachmentAccess(session: string, key: string) {
  const connection = database();
  const state = getState(session);
  if (state) {
    for (const entry of state.evidence?.entries || [])
      for (const attachment of entry.observed.attachments)
        if (attachment.key === key)
          return { mime: attachment.mime, extension: attachment.extension };
  }
  const rows = connection
    .prepare("SELECT payload FROM evidence_reviews WHERE session=? AND committed=0 AND expires>?")
    .all(session, Date.now()) as { payload: string }[];
  for (const row of rows) {
    try {
      const payload = ReviewPayloadSchema.parse(JSON.parse(row.payload));
      for (const attachment of payload.attachments)
        if (attachment.key === key)
          return { mime: attachment.mime, extension: attachment.extension };
    } catch {
      // An expired or malformed row must never widen access.
    }
  }
  return null;
}

// Context for later features only ever includes entries that still exist;
// removing an entry is a hard delete, so removed evidence cannot re-enter.
// When the original submission text was preserved, it is the traceable source
// shown to later features even if the student later edited the explanation.
export function evidenceContext(state: Workspace, maxChars = 6000) {
  const entries = state.evidence?.entries || [];
  let budget = maxChars;
  const parts: string[] = [];
  for (const entry of [...entries].reverse()) {
    const explanation = entry.originalSubmission || entry.reported.explanation;
    const text = [
      `Activity (student-reported): ${entry.reported.activity}`,
      explanation
        ? `Student explanation (student-reported): ${explanation}`
        : "",
      entry.observed.artifactShows ? `Submission shows: ${entry.observed.artifactShows}` : "",
      entry.uncertainty ? `Uncertainty: ${entry.uncertainty}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    if (!text || text.length > budget) break;
    parts.push(text);
    budget -= text.length;
  }
  return parts.join("\n\n");
}
