import test from "node:test";
import assert from "node:assert/strict";
import { checkCourseDraft, sealCourseDraft } from "../lib/course-draft";
import type { MaterialDraft } from "../lib/course-types";
test("review proof binds extracted text and owner while allowing a renamed title", () => {
  const draft: MaterialDraft = { title: "Syllabus", subject: "DBMS", kind: "Syllabus", filename: "syllabus.txt", pages: [{ locator: "Page 1", text: "Synthetic syllabus with SQL joins." }], warnings: [] };
  const now = 1700000000000;
  const seal = sealCourseDraft("owner-a", draft, now);
  assert.doesNotThrow(() => checkCourseDraft("owner-a", { ...draft, title: "My renamed syllabus" }, seal.proof, seal.expiresAt, now));
  assert.throws(() => checkCourseDraft("owner-b", draft, seal.proof, seal.expiresAt, now), /COURSE_REVIEW_INVALID/);
  assert.throws(() => checkCourseDraft("owner-a", { ...draft, pages: [{ locator: "Page 1", text: "Fabricated replacement content" }] }, seal.proof, seal.expiresAt, now), /COURSE_REVIEW_INVALID/);
  assert.throws(() => checkCourseDraft("owner-a", draft, seal.proof, seal.expiresAt, now + 16 * 60 * 1000), /COURSE_REVIEW_INVALID/);
  assert.throws(() => checkCourseDraft("owner-a", draft, "bad", seal.expiresAt, now), /COURSE_REVIEW_INVALID/);
});
