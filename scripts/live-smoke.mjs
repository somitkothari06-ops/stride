// Explicit opt-in: this exercises four paid model calls with synthetic coursework.
import assert from "node:assert/strict";
if (!process.argv.includes("--allow-live")) {
  console.error(
    "This test uses paid model inference. Re-run with --allow-live to opt in.",
  );
  process.exit(1);
}
const base = process.env.STRIDE_TEST_URL || "http://127.0.0.1:3000";
const boot = await fetch(base + "/api/workspace");
const cookie = boot.headers.get("set-cookie")?.split(";")[0];
const initial = await boot.json();
assert.ok(cookie, "Expected an isolated new test session");
assert.equal(initial.providers.nebius, true, "Configure live inference first");
async function post(route, data) {
  const start = Date.now();
  const response = await fetch(base + route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: base,
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    200,
    `${route}: ${result.error?.message || response.status}`,
  );
  return { ...result, latencyMs: Date.now() - start };
}
await post("/api/action", { action: "reset", sample: false });
const source =
  "DBMS joins assignment\nDue date: 2026-10-28. Explain INNER JOIN and LEFT JOIN. Toy data: Students has (1, Asha), (2, Kabir); Submissions has (1, DBMS). Explain what happens to Kabir, who has no submission.";
const intake = await post("/api/intake", { source });
assert.equal(intake.mode, "live");
assert.equal(intake.candidate.dueDate, "2026-10-28");
console.log(`PASS: live extraction (${intake.latencyMs} ms)`);
let result = await post("/api/action", {
  action: "add",
  work: { ...intake.candidate, source, sourceType: "Assignment" },
});
const id = result.state.works[0].id;
result = await post("/api/action", { action: "plan" });
assert.equal(result.state.plan.mode, "live");
assert.equal(result.state.plan.workId, id);
assert.ok(result.state.plan.minutes <= result.state.profile.minutes);
assert.ok(result.state.plan.sourceIds.includes(id));
console.log(`PASS: source-linked live planning (${result.latencyMs} ms)`);
result = await post("/api/action", { action: "prepare", id });
assert.equal(result.state.prepared.mode, "live");
assert.ok(result.state.prepared.steps.length >= 2);
console.log(`PASS: live practice preparation (${result.latencyMs} ms)`);
result = await post("/api/action", {
  action: "attempt",
  id,
  answer:
    "INNER JOIN excludes Kabir because he has no matching submission; LEFT JOIN keeps Kabir and uses NULL for submission fields. I would check this with the two-row toy data.",
});
assert.equal(result.state.observations[0].method, "model-assessment");
assert.ok(result.state.observations[0].feedback.length > 20);
console.log(
  `PASS: explicitly labeled model assessment (${result.latencyMs} ms)`,
);
console.log(
  "Live workflow passed with synthetic inputs. No code/test execution or mastery certification is claimed.",
);
