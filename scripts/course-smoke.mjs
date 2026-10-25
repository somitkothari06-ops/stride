import assert from "node:assert/strict";
const base = process.env.STRIDE_BASE_URL || "http://127.0.0.1:3000";
async function session() {
  const response = await fetch(`${base}/api/workspace`);
  assert.equal(response.status, 200);
  return { cookie: response.headers.get("set-cookie").split(";")[0], state: (await response.json()).state };
}
const a = await session(), b = await session();
async function request(path, method, body, cookie = a.cookie) {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie, Origin: base, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
const data = new FormData();
data.set("subject", "Database systems"); data.set("kind", "Syllabus");
data.set("file", new Blob(["Synthetic demonstration syllabus. Database systems unit 3 covers SQL inner joins, left joins, unmatched rows, NULL values and relational algebra. Assessment: explain query outputs and justify the choice of join. Past questions are examples, not predictions."], { type: "text/plain" }), "synthetic-course.txt");
const extracted = await request("/api/materials", "POST", data);
assert.equal(extracted.status, 200, JSON.stringify(extracted.data));
assert.match(extracted.data.candidate.pages[0].text, /relational algebra/);
const before = await fetch(`${base}/api/workspace`, { headers: { Cookie: a.cookie } }).then((r) => r.json());
assert.equal(before.state.materials?.length || 0, 0, "extraction is not confirmation");
const tampered = structuredClone(extracted.data);
tampered.candidate.pages[0].text += " Fabricated source content.";
assert.equal((await request("/api/materials", "PUT", tampered)).status, 400);
assert.equal((await request("/api/materials", "PUT", extracted.data, b.cookie)).status, 400);
const confirmed = await request("/api/materials", "PUT", extracted.data);
assert.equal(confirmed.status, 200);
const materialId = confirmed.data.state.materials[0].id;
const other = await fetch(`${base}/api/workspace`, { headers: { Cookie: b.cookie } }).then((r) => r.json());
assert.equal(other.state.materials?.length || 0, 0);
assert.equal((await request("/api/materials", "DELETE", { id: materialId }, b.cookie)).status, 404);
assert.equal((await request("/api/materials", "PUT", extracted.data)).data.state.materials.length, 1);
const crossOrigin = await fetch(`${base}/api/materials`, { method: "PUT", headers: { Cookie: a.cookie, Origin: "https://unrelated.invalid", "Content-Type": "application/json" }, body: JSON.stringify(extracted.data) });
assert.equal(crossOrigin.status, 403);
if (process.argv.includes("--allow-live")) {
  const work = confirmed.data.state.works.find((w) => w.subject === "Database systems");
  const prepared = await request("/api/action", "POST", { action: "prepare", id: work.id });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.data));
  assert.ok(prepared.data.state.prepared.courseSources.length, "relevant confirmed course source should be referenced");
  const bridge = await request("/api/course-bridge", "POST", { subject: "Database systems", benchmark: "berkeley-db" });
  assert.equal(bridge.status, 200, JSON.stringify(bridge.data));
  assert.ok(bridge.data.comparison.localFocus.length);
  console.log("Live synthetic check passed: source-linked practice and exact-quote-checked course comparison.");
}
const removed = await request("/api/materials", "DELETE", { id: materialId });
assert.equal(removed.status, 200);
assert.equal(removed.data.state.materials.length, 0);
assert.equal(removed.data.state.prepared, null);
console.log("Course HTTP check passed: extract, review-before-save, isolated sessions, foreign-delete refusal, origin check and deletion invalidation.");
