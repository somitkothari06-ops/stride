// Explicit opt-in: creates two temporary confirmed Supabase users, sends no email,
// exercises only synthetic work, then deletes those users. Never run in CI.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (!process.argv.includes("--allow-live")) throw new Error("Pass --allow-live for temporary synthetic account testing.");
const base = process.env.STRIDE_BASE_URL || "http://127.0.0.1:3100";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = process.env.STRIDE_TEST_SUPABASE_ADMIN_KEY;
if (!supabase || !admin) throw new Error("Private Supabase URL and temporary admin credential required.");
const created = [];
async function adminRequest(path, method, body) {
  const response = await fetch(`${supabase}/auth/v1/admin/${path}`, { method, headers: { apikey: admin, Authorization: `Bearer ${admin}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Test user administration failed (${response.status}); no credentials logged.`);
  return response.status === 204 ? null : response.json();
}
function browser() {
  const jar = new Map();
  return { jar, async request(path, input, origin = base) {
    const response = await fetch(base + path, { method: input ? "POST" : "GET", headers: { Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join("; "), ...(input ? { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) } : {}) }, body: input ? JSON.stringify(input) : undefined, signal: AbortSignal.timeout(30000) });
    for (const line of response.headers.getSetCookie()) {
      const [entry] = line.split(";"); const split = entry.indexOf("="); const k = entry.slice(0,split), v = entry.slice(split+1);
      if (!v) jar.delete(k); else jar.set(k,v);
    }
    return { status: response.status, data: await response.json() };
  } };
}
try {
  for (let i=0; i<2; i++) {
    const email = `stride-smoke-${randomUUID()}@example.com`, password = randomBytes(24).toString("base64url");
    const user = await adminRequest("users", "POST", { email, password, email_confirm: true });
    created.push({ id: user.id, email, password });
    if (process.env.STRIDE_TEST_IDS_FILE) writeFileSync(process.env.STRIDE_TEST_IDS_FILE, JSON.stringify(created.map(x=>x.id)), { mode: 0o600 });
  }
  const a = browser(), secondDevice = browser(), b = browser(), staleGuest = browser();
  assert.equal((await a.request("/api/workspace?fresh=1")).status,200);
  const oldGuest = a.jar.get("stride_session");
  assert.equal((await a.request("/api/action", { action: "saveNote", text: "Synthetic account isolation marker A" })).status,200);
  assert.equal((await a.request("/api/account", { action: "signin", email: created[0].email, password: created[0].password })).data.claimed,true);
  assert(a.jar.has("stride_account")); assert(!a.jar.has("stride_session"));
  staleGuest.jar.set("stride_session",oldGuest);
  assert.equal((await staleGuest.request("/api/action",{action:"saveNote",text:"Must not write to claimed account"})).status,401);
  assert.equal(((await staleGuest.request("/api/workspace?fresh=1")).data.state.notes || []).length,0);
  assert.equal((await secondDevice.request("/api/account", { action: "signin", email: created[0].email, password: created[0].password })).status,200);
  assert.equal((await secondDevice.request("/api/workspace")).data.state.notes[0].text,"Synthetic account isolation marker A");
  if (process.env.STRIDE_TEST_SSH_HOST && process.env.STRIDE_TEST_SSH_KEY) {
    // Force only these synthetic sessions near expiry to test real refresh and concurrency.
    const ids = created.map(x=>x.id);
    assert(ids.every(x=>/^[a-f0-9-]{36}$/.test(x)));
    const js = `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/home/coder/stride/.data/stride.sqlite');for(const id of ${JSON.stringify(ids)})db.prepare('UPDATE account_sessions SET expires_at=0 WHERE user_id=?').run(id);`;
    execFileSync("ssh", ["-i",process.env.STRIDE_TEST_SSH_KEY,"-o","BatchMode=yes",process.env.STRIDE_TEST_SSH_HOST,"sudo docker exec --user coder bde82d941963 /home/coder/.local/node/bin/node -e '"+js.replaceAll("'","'\"'\"'")+"'"], { stdio: "pipe" });
    const simultaneous = await Promise.all([1,2,3].map(()=>secondDevice.request("/api/workspace")));
    assert(simultaneous.every(x=>x.status===200));
    console.log("PASS: concurrent live Supabase refresh preserves the account session.");
  }
  await secondDevice.request("/api/action",{action:"saveNote",text:"Second-device update"});
  assert.equal((await a.request("/api/workspace")).data.state.notes.length,2);
  b.jar.set("stride_session",oldGuest);
  assert.equal((await b.request("/api/account",{action:"signin",email:created[1].email,password:created[1].password})).status,200);
  assert.equal(((await b.request("/api/workspace")).data.state.notes || []).length,0);
  assert.equal((await b.request("/api/account",{action:"signout"},"https://unrelated.example")).status,403);
  assert.equal((await b.request("/api/account",{action:"signout"},null)).status,403);
  const revoked = a.jar.get("stride_account");
  assert.equal((await a.request("/api/account",{action:"signout"})).status,200);
  a.jar.set("stride_account",revoked);a.jar.set("stride_session",oldGuest);
  assert.equal((await a.request("/api/workspace")).status,401);
  assert.equal((await secondDevice.request("/api/workspace")).data.state.notes.length,2);
  const ids = created.map(x=>x.id);
  if (process.env.STRIDE_TEST_IDS_FILE) writeFileSync(process.env.STRIDE_TEST_IDS_FILE, JSON.stringify(ids), { mode: 0o600 });
  console.log("PASS: live Supabase login, one-time guest claim, old guest refusal, two-device reads/writes, two-user isolation, CSRF refusal and immediate per-device logout/replay refusal.");
} finally {
  for (const user of created) await adminRequest(`users/${user.id}`,"DELETE");
  console.log("Temporary Supabase test users removed. Remove their local synthetic workspace rows using the private test IDs file.");
}
