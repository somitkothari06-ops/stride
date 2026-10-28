import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(), "stride-evidence-"));
process.env.NEBIUS_API_KEY = "synthetic-test-key";
process.env.NEBIUS_MODEL_FAST = "synthetic-model";
process.env.NEBIUS_MODEL_VISION = "synthetic-vision-model";
import {
  MAX_ATTACHMENTS,
  MAX_COMBINED_TEXT_CHARS,
  MAX_EVIDENCE_ENTRIES,
  EvidenceCandidateSchema,
  assertCombinedTextLimit,
  attachmentAccess,
  checkGrounding,
  commitEvidence,
  createEvidenceReview,
  deleteEvidenceEntry,
  evidenceContext,
  evidenceModelData,
  evidenceTextExcerpt,
  prepareAttachment,
  validActivityDate,
} from "../lib/evidence";
import { evidenceExists, evidenceFile, readEvidence, removeEvidence, retainEvidence } from "../lib/evidence-files";
import { closeFocus, startFocus } from "../lib/focus-session";
import { createSession, db, getState, mutate } from "../lib/store";
import { model } from "../lib/ai";
import { z } from "zod";

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 1, 1, 1, 0,
]);
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 1, 2, 3, 4]);
const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 1, 2]);
const textBytes = new TextEncoder().encode("# Notes\n\nSorting costs O(n log n).\n");

function attachmentFixture(name: string, bytes: Uint8Array) {
  const attachment = prepareAttachment(name, bytes, "2026-10-28T09:00:00.000Z");
  return attachment;
}

test("image attachments are accepted by signature and stored privately", async () => {
  for (const [name, bytes] of [
    ["screenshot.png", pngBytes],
    ["photo.jpg", jpegBytes],
    ["diagram.webp", webpBytes],
  ] as const) {
    const attachment = attachmentFixture(name, bytes);
    assert.equal(attachment.kind, "image");
    await retainEvidence(attachment.key, attachment.extension, bytes);
    assert.equal(await evidenceExists(attachment.key, attachment.extension), true);
    assert.deepEqual(await readEvidence(attachment.key, attachment.extension), bytes);
  }
});

test("text attachments accept txt and markdown and reject binary content", () => {
  const txt = attachmentFixture("notes.txt", textBytes);
  assert.equal(txt.kind, "text");
  assert.equal(txt.mime, "text/plain");
  const md = attachmentFixture("writeup.md", textBytes);
  assert.equal(md.mime, "text/markdown");
  const binary = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
  assert.throws(() => prepareAttachment("program.txt", binary), /EVIDENCE_MISMATCH/);
});

test("SVG, executables, documents and unknown types are never accepted", () => {
  const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");
  assert.throws(() => prepareAttachment("image.svg", svg), /EVIDENCE_UNSUPPORTED/);
  assert.throws(() => prepareAttachment("image.svg", pngBytes), /EVIDENCE_UNSUPPORTED/);
  assert.throws(() => prepareAttachment("tool.exe", pngBytes), /EVIDENCE_UNSUPPORTED/);
  assert.throws(() => prepareAttachment("essay.pdf", pngBytes), /EVIDENCE_UNSUPPORTED/);
  assert.throws(() => prepareAttachment("page.html", textBytes), /EVIDENCE_UNSUPPORTED/);
  assert.throws(() => prepareAttachment("archive.zip", pngBytes), /EVIDENCE_UNSUPPORTED/);
  assert.throws(() => prepareAttachment("no-extension", pngBytes), /EVIDENCE_UNSUPPORTED/);
  const elf = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 1, 1]);
  assert.throws(() => prepareAttachment("disguise.png", elf), /EVIDENCE_UNSUPPORTED/);
  const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.throws(() => prepareAttachment("disguise.png", exe), /EVIDENCE_UNSUPPORTED/);
});

test("spoofed names, oversized files and empty files are refused", () => {
  assert.throws(() => prepareAttachment("fake.png", jpegBytes), /EVIDENCE_MISMATCH/);
  assert.throws(() => prepareAttachment("fake.jpg", pngBytes), /EVIDENCE_MISMATCH/);
  assert.throws(() => prepareAttachment("fake.webp", textBytes), /EVIDENCE_MISMATCH/);
  const oversized = new Uint8Array(3_000_001).fill(0x89);
  oversized[1] = 0x50;
  assert.throws(() => prepareAttachment("big.png", oversized), /EVIDENCE_TOO_LARGE/);
  assert.throws(() => prepareAttachment("empty.txt", new Uint8Array(0)), /EVIDENCE_TOO_LARGE/);
  const bigText = new TextEncoder().encode("x".repeat(262145));
  assert.throws(() => prepareAttachment("big.txt", bigText), /EVIDENCE_TOO_LARGE/);
});

test("attachment paths cannot escape the private evidence directory", () => {
  assert.throws(() => evidenceFile("../escape", "png"), /Invalid/);
  assert.throws(() => evidenceFile("not-a-uuid", "png"), /Invalid/);
  assert.throws(() => evidenceFile("00000000-0000-4000-8000-000000000000", "../x"), /EVIDENCE_UNSUPPORTED/);
});

test("remove is idempotent and missing files are not errors", async () => {
  const attachment = attachmentFixture("temp.txt", textBytes);
  await retainEvidence(attachment.key, attachment.extension, textBytes);
  await removeEvidence(attachment.key, attachment.extension);
  assert.equal(await evidenceExists(attachment.key, attachment.extension), false);
  await removeEvidence(attachment.key, attachment.extension);
});

test("activity dates are validated or explicitly empty", () => {
  assert.equal(validActivityDate(null), null);
  assert.equal(validActivityDate(""), null);
  assert.equal(validActivityDate("2026-10-21"), "2026-10-21");
  assert.throws(() => validActivityDate("2026-13-40"), /EVIDENCE_INVALID_DATE/);
  assert.throws(() => validActivityDate("21 October"), /EVIDENCE_INVALID_DATE/);
  assert.throws(() => validActivityDate(123), /EVIDENCE_INVALID_DATE/);
});

test("model feedback that claims verification, mastery or authorship is rejected", () => {
  const base = {
    activity: "Wrote a merge sort",
    artifactShows: "The submission contains a Python merge sort function.",
    studentExplanation: "I split the list and merged halves.",
  };
  checkGrounding(EvidenceCandidateSchema.parse({ ...base, modelFeedback: "Nice structure overall." }));
  for (const claim of [
    "I verified your test passed.",
    "You have mastered this topic.",
    "This proves you are proficient.",
    "Authorship is confirmed.",
    "I ran your code and the tests passed.",
  ]) {
    assert.throws(
      () => checkGrounding(EvidenceCandidateSchema.parse({ ...base, modelFeedback: claim })),
      /EVIDENCE_CLAIM_INVALID/,
    );
  }
  assert.throws(
    () => checkGrounding(EvidenceCandidateSchema.parse({ ...base, artifactShows: "The mastered solution", modelFeedback: "" })),
    /EVIDENCE_CLAIM_INVALID/,
  );
});

test("a reviewed proposal commits once, keeps originals traceable and replays safely", async () => {
  const session = createSession(false);
  const attachment = attachmentFixture("notes.txt", textBytes);
  await retainEvidence(attachment.key, attachment.extension, textBytes);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote sorting notes",
    artifactShows: "The note explains merge sort costs.",
    studentExplanation: "I think merge sort is O(n log n) because of the halves.",
    modelFeedback: "Consider where the extra memory goes.",
    uncertainty: "Why the merge step is linear is not explained.",
    nextSuggestion: "Trace one merge by hand.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "I think merge sort is O(n log n) because of the halves.",
    attachments: [attachment],
  });
  const state = await commitEvidence(session.id, review.id, candidate, "2026-10-21");
  assert.equal(state.evidence?.entries.length, 1);
  const entry = state.evidence!.entries[0];
  assert.equal(entry.reported.explanation, "I think merge sort is O(n log n) because of the halves.");
  assert.equal(entry.observed.attachments[0].key, attachment.key);
  assert.equal(entry.observed.attachments[0].uploadedAt, "2026-10-28T09:00:00.000Z");
  assert.equal(entry.activityDate, "2026-10-21");
  assert.equal(entry.modelFeedback, "Consider where the extra memory goes.");
  // Upload timestamp and student activity date are recorded separately.
  assert.notEqual(entry.createdAt, entry.activityDate);

  // Replay returns the saved state without a second entry.
  const replayed = await commitEvidence(session.id, review.id, candidate, "2026-10-21");
  assert.equal(replayed.evidence?.entries.length, 1);
  assert.equal(replayed.revision, state.revision);
});

test("a commit cannot substitute different text or attachment content", async () => {
  const session = createSession(false);
  const attachment = attachmentFixture("notes.txt", textBytes);
  await retainEvidence(attachment.key, attachment.extension, textBytes);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote notes",
    artifactShows: "The note explains costs.",
    studentExplanation: "Original explanation.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Original explanation.",
    attachments: [attachment],
  });
  // A different review id (never issued for this candidate) is refused.
  await assert.rejects(
    commitEvidence(session.id, "ffffffff-ffff-4fff-8fff-ffffffffffff", candidate, null),
    /EVIDENCE_REVIEW_INVALID/,
  );
  // The attachment must still exist on disk at commit time.
  const second = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Original explanation.",
    attachments: [attachment],
  });
  await removeEvidence(attachment.key, attachment.extension);
  await assert.rejects(commitEvidence(session.id, second.id, candidate, null), /EVIDENCE_ATTACHMENT_MISSING/);
});

test("a workspace change during review makes the commit stale, not silently applied", async () => {
  const session = createSession(false);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Practised SQL joins",
    artifactShows: "The submission lists three join queries.",
    studentExplanation: "Inner join keeps matching rows.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Inner join keeps matching rows.",
    attachments: [],
  });
  mutate(session.id, (current) => {
    current.notes = [...(current.notes || []), { id: "x", text: "changed elsewhere", createdAt: new Date().toISOString() }];
    current.revision++;
  });
  await assert.rejects(commitEvidence(session.id, review.id, candidate, null), /EVIDENCE_STALE/);
});

test("an expired review is refused instead of committed", async () => {
  const session = createSession(false);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Read the chapter",
    artifactShows: "The submission summarises the chapter.",
    studentExplanation: "Buffers sit between disk and CPU.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Buffers sit between disk and CPU.",
    attachments: [],
  });
  const { db } = await import("../lib/store");
  db().prepare("UPDATE evidence_reviews SET expires=? WHERE id=?").run(Date.now() - 1000, review.id);
  await assert.rejects(commitEvidence(session.id, review.id, candidate, null), /EVIDENCE_REVIEW_INVALID/);
});

test("the journal has an entry limit and pending reviews are bounded", async () => {
  const session = createSession(false);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Filled the journal",
    artifactShows: "The submission is a placeholder.",
    studentExplanation: "Placeholder explanation.",
  });
  for (let index = 0; index < MAX_EVIDENCE_ENTRIES; index++) {
    const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
      candidate,
      originalText: "Placeholder explanation.",
      attachments: [],
    });
    await commitEvidence(session.id, review.id, candidate, null);
  }
  const overflow = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Placeholder explanation.",
    attachments: [],
  });
  await assert.rejects(commitEvidence(session.id, overflow.id, candidate, null), /EVIDENCE_LIMIT/);
  for (let index = 0; index < 6; index++)
    createEvidenceReview(session.id, getState(session.id)!.revision, {
      candidate,
      originalText: "Placeholder explanation.",
      attachments: [],
    });
  assert.throws(
    () =>
      createEvidenceReview(session.id, getState(session.id)!.revision, {
        candidate,
        originalText: "Placeholder explanation.",
        attachments: [],
      }),
    /EVIDENCE_LIMIT/,
  );
});

test("attachments belong to one workspace only", async () => {
  const owner = createSession(false);
  const stranger = createSession(false);
  const attachment = attachmentFixture("screenshot.png", pngBytes);
  await retainEvidence(attachment.key, attachment.extension, pngBytes);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Drew a diagram",
    artifactShows: "The screenshot shows a data-flow diagram.",
    studentExplanation: "Data flows from the buffer to the cache.",
  });
  const review = createEvidenceReview(owner.id, getState(owner.id)!.revision, {
    candidate,
    originalText: "Data flows from the buffer to the cache.",
    attachments: [attachment],
  });
  // Before commit, only the owner's pending review grants access.
  assert.ok(attachmentAccess(owner.id, attachment.key));
  assert.equal(attachmentAccess(stranger.id, attachment.key), null);
  await commitEvidence(owner.id, review.id, candidate, null);
  assert.ok(attachmentAccess(owner.id, attachment.key));
  assert.equal(attachmentAccess(stranger.id, attachment.key), null);
  assert.equal(attachmentAccess(owner.id, "00000000-0000-4000-8000-000000000000"), null);
});

test("deleting an entry removes its files and keeps removed evidence out of context", async () => {
  const session = createSession(false);
  const attachment = attachmentFixture("notes.txt", textBytes);
  await retainEvidence(attachment.key, attachment.extension, textBytes);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote a summary",
    artifactShows: "The submission summarises chapter three.",
    studentExplanation: "Paging moves fixed-size blocks.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Paging moves fixed-size blocks.",
    attachments: [attachment],
  });
  await commitEvidence(session.id, review.id, candidate, null);
  assert.ok(evidenceContext(getState(session.id)!).includes("Paging"));
  const state = getState(session.id)!;
  await deleteEvidenceEntry(state, state.evidence!.entries[0].id);
  assert.equal(await evidenceExists(attachment.key, attachment.extension), false);
  assert.equal(evidenceContext(state), "");
});

test("the extraction request separates student words, attachments and limits", () => {
  const data = evidenceModelData("My own words", [
    { filename: "notes.txt", kind: "text", excerpt: "first 8000 characters" },
    { filename: "shot.png", kind: "image" },
  ]);
  assert.equal(data.submission, "My own words");
  assert.equal(data.attachments[0].textExcerpt, "first 8000 characters");
  assert.equal("textExcerpt" in data.attachments[1], false);
  assert.ok(MAX_ATTACHMENTS === 5, "the shared model takes at most five images per request");
  assert.ok(MAX_COMBINED_TEXT_CHARS === 24000);
});

test("inherited prototype keys are never accepted file types", () => {
  for (const name of ["payload.constructor", "notes.toString", "x.valueOf", "y.hasOwnProperty"]) {
    assert.throws(() => prepareAttachment(name, textBytes), /EVIDENCE_UNSUPPORTED/, name);
  }
});

test("text attachments decode in full and combined text is bounded explicitly", () => {
  const long = "x".repeat(20000);
  const excerpt = evidenceTextExcerpt(new TextEncoder().encode(long));
  assert.equal(excerpt.length, 20000, "text is never silently clipped");
  assert.throws(() => evidenceTextExcerpt(new Uint8Array([0xff, 0xfe])), /EVIDENCE_MISMATCH/);
  assert.doesNotThrow(() => assertCombinedTextLimit("a".repeat(12000), ["b".repeat(12000)]));
  assert.throws(
    () => assertCombinedTextLimit("a".repeat(12000), ["b".repeat(12001)]),
    /EVIDENCE_TEXT_TOO_LONG/,
  );
});

test("model-owned fields are bound to the stored candidate; only student fields are editable", async () => {
  const session = createSession(false);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote notes",
    artifactShows: "The note explains costs.",
    studentExplanation: "Original explanation.",
    modelFeedback: "Consider where memory goes.",
    uncertainty: "Why linear is unclear.",
    nextSuggestion: "Trace one merge.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Original explanation.",
    attachments: [],
  });
  for (const field of ["artifactShows", "modelFeedback", "uncertainty", "nextSuggestion"] as const) {
    const tampered = { ...candidate, [field]: candidate[field] + " (edited)" };
    await assert.rejects(
      commitEvidence(session.id, review.id, tampered, null),
      /EVIDENCE_TAMPERED/,
      `editing ${field} must be refused`,
    );
  }
  // Editing the student's own activity and explanation is still allowed, and
  // the saved entry keeps the model-owned fields exactly as reviewed.
  const edited = {
    ...candidate,
    activity: "Wrote merge sort notes",
    studentExplanation: "My own edited explanation.",
  };
  const state = await commitEvidence(session.id, review.id, edited, null);
  const entry = state.evidence!.entries[0];
  assert.equal(entry.reported.activity, "Wrote merge sort notes");
  assert.equal(entry.reported.explanation, "My own edited explanation.");
  assert.equal(entry.observed.artifactShows, "The note explains costs.");
  assert.equal(entry.modelFeedback, "Consider where memory goes.");
  assert.equal(entry.uncertainty, "Why linear is unclear.");
  assert.equal(entry.nextSuggestion, "Trace one merge.");
});

test("the original submission text stays traceable after draft edits", async () => {
  const session = createSession(false);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote notes",
    artifactShows: "The note explains costs.",
    studentExplanation: "Edited explanation.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "The student's exact original submission text.",
    attachments: [],
  });
  const state = await commitEvidence(session.id, review.id, candidate, null);
  const entry = state.evidence!.entries[0];
  assert.equal(entry.originalSubmission, "The student's exact original submission text.");
  assert.notEqual(entry.reported.explanation, entry.originalSubmission);
  // The original words still reach later context, labelled as student-reported.
  assert.ok(evidenceContext(state).includes("The student's exact original submission text."));
});

test("concurrent commits of one review cannot interleave the transaction or duplicate the entry", async () => {
  const session = createSession(false);
  const attachment = attachmentFixture("notes.txt", textBytes);
  await retainEvidence(attachment.key, attachment.extension, textBytes);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote sorting notes",
    artifactShows: "The note explains merge sort costs.",
    studentExplanation: "I think merge sort is O(n log n) because of the halves.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "I think merge sort is O(n log n) because of the halves.",
    attachments: [attachment],
  });
  // Three racing confirmations of the same review. The transaction body is
  // synchronous, so exactly one commit lands, the replays return the saved
  // state, and no nested-transaction or interleaving error can occur.
  const results = await Promise.all([
    commitEvidence(session.id, review.id, candidate, null),
    commitEvidence(session.id, review.id, candidate, null),
    commitEvidence(session.id, review.id, candidate, null),
  ]);
  const final = getState(session.id)!;
  assert.equal(final.evidence?.entries.length, 1);
  assert.equal(new Set(results.map((result) => result.revision)).size, 1, "exactly one revision bump");
  assert.equal(final.evidence!.entries[0].observed.attachments[0].key, attachment.key);
  assert.equal(await evidenceExists(attachment.key, attachment.extension), true);
});

test("a concurrent workspace mutation cannot interleave with the commit or lose an update", async () => {
  const session = createSession(false);
  const attachment = attachmentFixture("notes.txt", textBytes);
  await retainEvidence(attachment.key, attachment.extension, textBytes);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote notes",
    artifactShows: "The note explains costs.",
    studentExplanation: "Original explanation.",
  });
  const review = createEvidenceReview(session.id, getState(session.id)!.revision, {
    candidate,
    originalText: "Original explanation.",
    attachments: [attachment],
  });
  const settled = await Promise.allSettled([
    commitEvidence(session.id, review.id, candidate, null),
    mutate(session.id, (current) => {
      current.notes = [
        ...(current.notes || []),
        { id: "parallel", text: "edited while confirming", createdAt: new Date().toISOString() },
      ];
    }),
  ]);
  const [committed, mutated] = settled;
  assert.equal(mutated.status, "fulfilled", "the parallel edit must not crash the shared connection");
  const final = getState(session.id)!;
  assert.ok(final.notes?.some((note) => note.text === "edited while confirming"), "the parallel edit is not lost");
  // No SQLite-level failure (a nested transaction) may occur on either side.
  for (const result of settled)
    if (result.status === "rejected")
      assert.doesNotMatch(String((result.reason as Error)?.message || ""), /transaction/i);
  // Whatever the ordering, the outcome is consistent: the commit either fully
  // applied (one entry, with the earlier edit preserved by the re-read state)
  // or was refused as stale — never a partial write or a lost update.
  if (committed.status === "fulfilled") {
    assert.equal(final.evidence?.entries.length, 1);
    assert.equal(final.evidence!.entries[0].observed.attachments[0].key, attachment.key);
  } else {
    assert.match(String((committed.reason as Error)?.message || ""), /EVIDENCE_STALE/);
    assert.equal(final.evidence?.entries.length, 0);
  }
});

test("deleting referenced evidence clears the derived return card", async () => {
  const session = createSession(false);
  const candidate = EvidenceCandidateSchema.parse({
    activity: "Wrote a summary",
    artifactShows: "The submission summarises chapter three.",
    studentExplanation: "Paging moves fixed-size blocks.",
  });
  mutate(session.id, (current) => startFocus(current, { title: "Sorting", minutes: 30 }));
  const opened = getState(session.id)!;
  const review = createEvidenceReview(session.id, opened.revision, {
    candidate,
    originalText: "Paging moves fixed-size blocks.",
    attachments: [],
  });
  await commitEvidence(session.id, review.id, candidate, null);
  const afterCommit = getState(session.id)!;
  const card = closeFocus(afterCommit, { focusId: afterCommit.focus!.id, summary: "Closed." });
  assert.ok(card);
  assert.equal(card.kind, "saved");
  // The saved continuation references the evidence entry and the close entry;
  // deleting the referenced evidence must clear it.
  const evidenceEntryId = afterCommit.evidence!.entries[0].id;
  await deleteEvidenceEntry(afterCommit, evidenceEntryId);
  assert.equal(afterCommit.returnCard, null, "the derived card must not dangle");
});

test("the vision path accepts JPEG and WebP data URLs, not only PNG", async () => {
  const original = globalThis.fetch;
  const session = createSession(false);
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }),
        { status: 200 },
      );
    const jpegUrl = `data:image/jpeg;base64,${Buffer.from(jpegBytes).toString("base64")}`;
    assert.deepEqual(await model(session.id, "Synthetic", {}, z.object({ ok: z.boolean() }), { images: [jpegUrl] }), { ok: true });
    const webpUrl = `data:image/webp;base64,${Buffer.from(webpBytes).toString("base64")}`;
    assert.deepEqual(await model(session.id, "Synthetic", {}, z.object({ ok: z.boolean() }), { images: [webpUrl] }), { ok: true });
    await assert.rejects(
      model(session.id, "Synthetic", {}, z.object({ ok: z.boolean() }), { images: ["data:text/html;base64,PGI+"] }),
      /INVALID_REQUEST/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('honest uncertainty about authorship or dates is not rejected as a verification claim',()=>{checkGrounding(EvidenceCandidateSchema.parse({activity:'Drew blocks',artifactShows:'A two-block image.',studentExplanation:'My drawing',modelFeedback:'Cannot confirm authorship or your work date from this submission.'}));});

test('positive verification claims in model uncertainty are refused, visible test output may be described',()=>{const c=EvidenceCandidateSchema.parse({activity:'Ran my tests',artifactShows:'The screenshot shows the text: 12 tests passed.',studentExplanation:'I ran them locally.'});checkGrounding(c);assert.throws(()=>checkGrounding({...c,uncertainty:'Mastery is confirmed.'}),/EVIDENCE_CLAIM_INVALID/);assert.throws(()=>checkGrounding({...c,modelFeedback:'I have verified this work.'}),/EVIDENCE_CLAIM_INVALID/);});
test('confirmed evidence remains duplicate-safe after preview expiry and later preview cleanup',async()=>{const s=createSession(false);const candidate=EvidenceCandidateSchema.parse({activity:'SQL practice',artifactShows:'A submitted explanation.',studentExplanation:'I worked through a join.'});const review=createEvidenceReview(s.id,s.state.revision,{candidate,originalText:'I worked through a join.',attachments:[]});const saved=await commitEvidence(s.id,review.id,candidate,null);db().prepare('UPDATE evidence_reviews SET expires=0 WHERE id=?').run(review.id);createEvidenceReview(s.id,saved.revision,{candidate,originalText:'Another synthetic preview',attachments:[]});const replay=await commitEvidence(s.id,review.id,candidate,null);assert.equal(replay.evidence!.entries.length,1);});
