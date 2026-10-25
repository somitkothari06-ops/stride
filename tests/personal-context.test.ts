import test from "node:test";
import assert from "node:assert/strict";
import { LifeContextSchema, emptyLifeContext, personalContext } from "../lib/personal-context";
import { ActionSchema } from "../lib/types";
test("a student can begin with no career goal and no personal story", () => {
  const result = ActionSchema.safeParse({ action: "aboutYou", name: "Student", year: "2nd year", goal: "", minutes: 20, context: { ...emptyLifeContext } });
  assert.equal(result.success, true);
  assert.equal(personalContext(undefined), null);
  assert.equal(personalContext(emptyLifeContext)?.direction, "exploring");
});
test("personal context rejects oversized input and bounds what goes to model prompts", () => {
  assert.equal(LifeContextSchema.safeParse({ ...emptyLifeContext, story: "a".repeat(10001) }).success, false);
  const result = personalContext({ ...emptyLifeContext, story: "a".repeat(10000), experience: "b".repeat(4000) });
  assert.equal(result?.story.length, 2500);
  assert.equal(result?.experience.length, 1500);
  assert.match(result!.basis, /not independently verified/);
});
