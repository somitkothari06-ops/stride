// Run against a running, disposable development instance.
import assert from "node:assert/strict";
const base = process.env.STRIDE_TEST_URL || "http://127.0.0.1:3000";
async function session() {
  const r = await fetch(base + "/api/workspace");
  assert.equal(r.status, 200);
  return {
    cookie: r.headers.get("set-cookie").split(";")[0],
    data: await r.json(),
  };
}
async function action(s, payload) {
  const r = await fetch(base + "/api/action", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: s.cookie,
      Origin: base,
    },
    body: JSON.stringify(payload),
  });
  const d = await r.json();
  assert.equal(r.status, 200, JSON.stringify(d));
  return d.state;
}
const a = await session(),
  b = await session();
const saved = await action(a, {
  action: "profile",
  name: "Smoke A",
  year: "3rd year",
  goal: "",
  minutes: 15,
});
assert.equal(saved.profile.minutes, 15);
const unchanged = await fetch(base + "/api/workspace", {
  headers: { Cookie: b.cookie },
}).then((r) => r.json());
assert.equal(unchanged.state.profile.name, "Alex");
let state = await action(a, { action: "reset", sample: false });
assert.equal(state.works.length, 0);
const work = {
  title: "DBMS viva",
  subject: "Database systems",
  kind: "exam",
  dueDate: "2026-10-26",
  source: "Explain INNER JOIN versus LEFT JOIN in a DBMS viva.",
  sourceType: "Class notes",
  summary: "Join practice",
  uncertainty: "",
};
state = await action(a, { action: "add", work });
const id = state.works[0].id;
state = await action(a, { action: "plan" });
assert.equal(state.plan.workId, id);
state = await action(a, { action: "prepare", id });
assert.ok(state.prepared.question);
state = await action(a, {
  action: "attempt",
  id,
  answer:
    "An inner join keeps matching rows. A left join keeps all rows on the left.",
});
assert.equal(state.observations.length, 1);
state = await action(a, { action: "deleteWork", id });
assert.equal(state.observations.length, 0);
assert.equal(state.plan, null);
const forbidden = await fetch(base + "/api/action", {
  method: "POST",
  headers: {
    Cookie: a.cookie,
    Origin: "https://unrelated.invalid",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ action: "plan" }),
});
assert.equal(forbidden.status, 403);
console.log(
  "PASS: persisted flow, independent sessions, attempt recording, deletion invalidation, and origin checks",
);
