import test from "node:test";
import assert from "node:assert/strict";
import {
  guidedIntake,
  guidedPlan,
  initialWorkspace,
  daysUntil,
} from "../lib/planner";
import { ConfirmSchema } from "../lib/types";

const now = new Date("2026-10-25T08:00:00Z");
test("relative dates remain unresolved without original message context", () => {
  const result = guidedIntake(
    "DBMS assignment due tomorrow. Please explain joins.",
  );
  assert.equal(result.dueDate, null);
  assert.match(result.uncertainty, /original message date/);
});
test("impossible dates do not become deadlines", () => {
  assert.equal(guidedIntake("Assignment due 2026-02-30").dueDate, null);
  assert.equal(
    ConfirmSchema.safeParse({
      title: "A",
      subject: "B",
      kind: "assignment",
      dueDate: "2026-02-30",
      summary: "",
      uncertainty: "",
      source: "source",
      sourceType: "Assignment",
    }).success,
    false,
  );
});
test("an urgent new exam changes the chosen work and fits available time", () => {
  const state = initialWorkspace(true, now);
  const first = guidedPlan(state, now)!;
  const exam = state.works.find((w) => w.kind === "exam")!;
  exam.dueDate = "2026-10-25";
  state.profile.minutes = 15;
  state.revision++;
  const next = guidedPlan(state, now)!;
  assert.notEqual(first.workId, next.workId);
  assert.equal(next.workId, exam.id);
  assert.ok(next.minutes <= 15);
  assert.equal(next.contextRevision, state.revision);
});
test("completed work is excluded and unknown deadlines do not outrank urgent confirmed work", () => {
  const state = initialWorkspace(true, now);
  state.works[0].dueDate = null;
  const next = guidedPlan(state, now)!;
  assert.notEqual(next.workId, state.works[0].id);
  state.works.forEach((w) => {
    w.completed = true;
  });
  assert.equal(guidedPlan(state, now), null);
});
test("the academic loop works without history or career preferences", () => {
  const state = initialWorkspace(false, now);
  state.profile.goal = "";
  assert.equal(guidedPlan(state, now), null);
  state.works.push({
    ...guidedIntake("DSA practice due 2026-10-26"),
    id: "work-a",
    source: "DSA",
    sourceType: "Class notes",
    completed: false,
    createdAt: now.toISOString(),
  });
  assert.equal(guidedPlan(state, now)?.workId, "work-a");
});
test("calendar deadlines use the student's timezone, not server UTC", () => {
  assert.equal(
    daysUntil("2026-10-26", "Asia/Kolkata", new Date("2026-10-25T20:00:00Z")),
    0,
  );
});
