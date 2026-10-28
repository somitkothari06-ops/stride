import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(), "stride-focus-"));
import {
  changeReturn,
  clearReturnCardIfStale,
  closeFocus,
  continueReturn,
  pauseFocus,
  resumeFocus,
  returnCard,
  skipReturn,
  startFocus,
} from "../lib/focus-session";
import { MAX_EVIDENCE_ENTRIES } from "../lib/evidence";
import { createSession, getState, mutate } from "../lib/store";
import type { Workspace } from "../lib/types";

const banned = [/master/i, /proficien/i, /verified/i, /guarantee/i, /\bscore\b/i, /mastery/i];

function noFalseClaims(text: string, label: string) {
  for (const pattern of banned)
    assert.equal(pattern.test(text), false, `${label} must not claim proficiency: ${text}`);
}

test("a focused session starts with a chosen outcome, coursework and time", () => {
  const state = getState(createSession(false).id)! as Workspace;
  state.works = [
    { id: "work-1", title: "DBMS assignment", subject: "DBMS", kind: "assignment", dueDate: null, summary: "", uncertainty: "", source: "", sourceType: "", createdAt: "2026-10-27T00:00:00.000Z", completed: false },
  ];
  state.materials = [
    { id: "mat-1", addedAt: "2026-10-27T00:00:00.000Z", title: "Lecture notes", subject: "DBMS", kind: "Lecture notes", filename: "notes.pdf", pages: [{ locator: "Page 1", text: "Text" }], warnings: [] },
  ];
  // An unknown outcome or coursework reference is refused before anything starts.
  assert.throws(() => startFocus(state, { title: "X", minutes: 40, outcomeId: "missing" }), /NOT_FOUND/);
  assert.throws(() => startFocus(state, { title: "X", minutes: 40, materialId: "missing" }), /NOT_FOUND/);
  const focus = startFocus(state, { title: "Understand joins", minutes: 40, outcomeId: "work-1", materialId: "mat-1" });
  assert.equal(focus.title, "Understand joins");
  assert.equal(focus.outcomeId, "work-1");
  assert.equal(focus.closedAt, null);
});

test("the time is the student's choice, not a fixed timer", () => {
  const state = getState(createSession(false).id)! as Workspace;
  assert.throws(() => startFocus(state, { title: "Too short", minutes: 14 }), /INVALID_REQUEST/);
  assert.throws(() => startFocus(state, { title: "Too long", minutes: 241 }), /INVALID_REQUEST/);
  assert.throws(() => startFocus(state, { title: "Fractional", minutes: 40.5 }), /INVALID_REQUEST/);
  startFocus(state, { title: "My own pace", minutes: 25 });
  assert.equal(state.focus?.minutes, 25);
});

test("an open session resumes instead of starting a second one", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "First", minutes: 30 });
  assert.throws(() => startFocus(state, { title: "Second", minutes: 30 }), /FOCUS_ACTIVE/);
  pauseFocus(state, state.focus!.id);
  assert.ok(state.focus?.pausedAt);
  resumeFocus(state, state.focus!.id);
  assert.equal(state.focus?.pausedAt, null);
});

test("pause, resume and close require the focusId the client saw", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Session A", minutes: 30 });
  const focusId = state.focus!.id;
  // A mismatched id — or a missing one — must never act on the newer session.
  assert.throws(() => pauseFocus(state, "different-session"), /FOCUS_NOT_FOUND/);
  assert.throws(() => resumeFocus(state, "different-session"), /FOCUS_NOT_FOUND/);
  assert.throws(
    () => closeFocus(state, { focusId: "different-session", summary: "Hi" }),
    /FOCUS_NOT_FOUND/,
  );
  assert.throws(
    () => pauseFocus(state, undefined as unknown as string),
    /FOCUS_NOT_FOUND/,
  );
  assert.equal(state.focus?.closedAt, null, "a mismatched id must not close the open session");
  assert.equal(state.focus?.pausedAt, null);
  // The matching id still works.
  pauseFocus(state, focusId);
  resumeFocus(state, focusId);
  closeFocus(state, { focusId, summary: "Done." });
  assert.ok(typeof state.focus?.closedAt === "string");
});

test("the session survives a reload because it lives in saved state", () => {
  const session = createSession(false);
  mutate(session.id, (current) => startFocus(current, { title: "Resumable", minutes: 45 }));
  // A fresh read, as after a page reload.
  const after = getState(session.id)! as Workspace;
  assert.equal(after.focus?.title, "Resumable");
  assert.equal(after.focus?.closedAt, null);
});

test("closing records a reviewed session entry and one continuation point", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Merge sort", minutes: 40 });
  state.evidence = {
    entries: [
      {
        id: "entry-1",
        createdAt: "2026-10-28T10:00:00.000Z",
        activityDate: null,
        kind: "evidence",
        reported: { activity: "Traced a merge", explanation: "I merged two halves by hand." },
        observed: { artifactShows: "The trace shows eight elements merging.", attachments: [] },
        modelFeedback: "",
        uncertainty: "",
        nextSuggestion: "Try it on odd-length lists.",
        focusId: state.focus!.id,
      },
    ],
  };
  const card = closeFocus(state, { focusId: state.focus!.id, summary: "Got the merge step, unsure about memory use.", nextStep: "Try one past-paper question." });
  assert.ok(card);
  assert.equal(card.kind, "saved");
  assert.ok(card.prompt.includes("Merge sort"));
  assert.equal(card.note, "Try one past-paper question.");
  const entry = state.evidence!.entries.at(-1)!;
  assert.equal(entry.kind, "session");
  assert.equal(entry.reported.explanation, "Got the merge step, unsure about memory use.");
  assert.ok(typeof state.focus?.closedAt === "string", "closedAt is set");
  // The continuation falls back to the session's own recorded next step.
  const fallbackState = getState(createSession(false).id)! as Workspace;
  startFocus(fallbackState, { title: "Joins", minutes: 30 });
  const fallbackCard = closeFocus(fallbackState, { focusId: fallbackState.focus!.id, summary: "Practised joins." });
  assert.ok(fallbackCard);
  assert.equal(fallbackCard.note, "Open your journal entry from this session and read your own explanation once before continuing.");
  // Closing the SAME already-closed focusId replays the recorded outcome
  // without adding a second entry or moving the revision.
  const beforeReplay = { entries: state.evidence!.entries.length, revision: state.revision, card: state.returnCard };
  const replayed = closeFocus(state, { focusId: state.focus!.id, summary: "Again" });
  assert.deepEqual(replayed, beforeReplay.card);
  assert.equal(state.evidence!.entries.length, beforeReplay.entries);
  assert.equal(state.revision, beforeReplay.revision);
  // A different focusId is refused and cannot close anything.
  assert.throws(() => closeFocus(state, { focusId: "another-session", summary: "Again" }), /FOCUS_NOT_FOUND/);
});

test("closing honors the journal entry cap", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Overflow", minutes: 30 });
  state.evidence = {
    entries: Array.from({ length: MAX_EVIDENCE_ENTRIES }, (_, index) => ({
      id: `entry-${index}`,
      createdAt: "2026-10-28T10:00:00.000Z",
      activityDate: null,
      kind: "evidence" as const,
      reported: { activity: "Work", explanation: "Words." },
      observed: { artifactShows: "", attachments: [] },
      modelFeedback: "",
      uncertainty: "",
      nextSuggestion: "",
    })),
  };
  assert.throws(
    () => closeFocus(state, { focusId: state.focus!.id, summary: "Too full." }),
    /EVIDENCE_LIMIT/,
  );
  assert.equal(state.evidence!.entries.length, MAX_EVIDENCE_ENTRIES);
  assert.equal(state.focus?.closedAt, null, "a refused close leaves the session open");
});

test("the return view shows the saved continuation; skip hides it; change builds a safe transfer state", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Normalization", minutes: 30 });
  closeFocus(state, { focusId: state.focus!.id, summary: "Went through 2NF with my own tables." });
  const saved = returnCard(state);
  assert.ok(saved, "a closed session has a saved continuation");
  assert.equal(saved.kind, "saved");
  noFalseClaims(saved.prompt + " " + saved.note, "saved continuation");
  skipReturn(state);
  // Skipping actually hides the card: no fallback practice appears instead,
  // and repeated reads stay hidden.
  assert.equal(returnCard(state), null);
  assert.equal(returnCard(state), null);
  // Change still works and produces a safe, genuine transfer state.
  changeReturn(state);
  const transfer = returnCard(state);
  assert.ok(transfer, "change re-activates a safe transfer card");
  assert.equal(transfer.kind, "transfer");
  assert.ok(transfer.question.includes("Normalization"));
  noFalseClaims(transfer.question, "transfer question");
  const first = transfer.question;
  changeReturn(state);
  const second = returnCard(state);
  assert.ok(second);
  assert.equal(second.kind, "transfer");
  assert.notEqual(second.question, first);
  changeReturn(state);
  changeReturn(state);
  const cycled = returnCard(state);
  assert.ok(cycled);
  assert.equal(cycled.kind, "transfer");
  assert.equal(cycled.question, first, "variants cycle back");
});

test("transfer questions come from the confirmed record; an empty journal shows none", () => {
  const empty = getState(createSession(false).id)! as Workspace;
  // No record, no card: an initial empty journal must not show invented
  // generic practice.
  assert.equal(returnCard(empty), null);
  empty.evidence = {
    entries: [
      {
        id: "entry-1",
        createdAt: "2026-10-28T10:00:00.000Z",
        activityDate: "2026-10-27",
        kind: "evidence",
        reported: { activity: "Wrote a B-tree insert", explanation: "Split on overflow." },
        observed: { artifactShows: "", attachments: [] },
        modelFeedback: "",
        uncertainty: "",
        nextSuggestion: "",
      },
    ],
  };
  const question = returnCard(empty);
  assert.ok(question);
  assert.equal(question.kind, "transfer");
  assert.ok(question.question.includes("B-tree insert"));
});

test("continuing clears the card and offers the previous session title", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Pointer arithmetic", minutes: 20 });
  closeFocus(state, { focusId: state.focus!.id, summary: "Practised pointer swaps." });
  const prefill = continueReturn(state);
  assert.equal(prefill.title, "Pointer arithmetic");
  assert.equal(state.returnCard, null);
  const after = returnCard(state);
  assert.equal(after,null,"Continue dismisses the return card rather than immediately replacing it");
});

test("continuation text never claims a proficiency score or verified memory", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Deadlocks", minutes: 60 });
  closeFocus(state, { focusId: state.focus!.id, summary: "Read the four conditions.", nextStep: "Draw the resource graph for the tutorial problem." });
  const card = returnCard(state);
  assert.ok(card);
  noFalseClaims(("prompt" in card ? card.prompt : "") + ("note" in card ? card.note : "") + ("question" in card ? card.question : ""), "return card");
});

test("a saved continuation survives unreferenced deletes but not referenced ones", () => {
  const state = getState(createSession(false).id)! as Workspace;
  startFocus(state, { title: "Sorting", minutes: 30 });
  state.evidence = {
    entries: [
      {
        id: "entry-1",
        createdAt: "2026-10-28T10:00:00.000Z",
        activityDate: null,
        kind: "evidence",
        reported: { activity: "Traced a merge", explanation: "I merged two halves by hand." },
        observed: { artifactShows: "", attachments: [] },
        modelFeedback: "",
        uncertainty: "",
        nextSuggestion: "",
        focusId: state.focus!.id,
      },
      {
        id: "entry-unrelated",
        createdAt: "2026-10-28T10:05:00.000Z",
        activityDate: null,
        kind: "evidence",
        reported: { activity: "Unrelated note", explanation: "Nothing to do with the card." },
        observed: { artifactShows: "", attachments: [] },
        modelFeedback: "",
        uncertainty: "",
        nextSuggestion: "",
      },
    ],
  };
  const card = closeFocus(state, { focusId: state.focus!.id, summary: "Closed." });
  assert.ok(card);
  assert.ok(state.returnCard);
  // Deleting an entry the card does not reference keeps the card.
  state.evidence = { entries: state.evidence!.entries.filter((entry) => entry.id !== "entry-unrelated") };
  clearReturnCardIfStale(state);
  assert.ok(state.returnCard, "an unreferenced delete keeps the card");
  // Deleting a referenced entry clears it.
  state.evidence = { entries: state.evidence!.entries.filter((entry) => entry.id !== "entry-1") };
  clearReturnCardIfStale(state);
  assert.equal(state.returnCard, null, "the derived card must not dangle");
});
