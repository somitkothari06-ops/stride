import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
if (!process.argv.includes("--allow-live")) throw new Error("Pass --allow-live: one synthetic capture may call Nebius.");
const base=process.env.STRIDE_BASE_URL||"http://127.0.0.1:3100", ids=[];
async function guest() {
  const response=await fetch(base+"/api/workspace?fresh=1");
  assert.equal(response.status,200);
  const cookie=response.headers.get("set-cookie").split(";")[0];
  ids.push(createHash("sha256").update(cookie.split("=")[1]).digest("hex"));
  if(process.env.STRIDE_SMOKE_IDS_FILE)writeFileSync(process.env.STRIDE_SMOKE_IDS_FILE,JSON.stringify(ids),{mode:0o600});
  return cookie;
}
async function send(cookie,payload,origin=base) {
  const response=await fetch(base+"/api/companion",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  return {status:response.status,data:await response.json()};
}
const a=await guest(), b=await guest();
const text="My operating systems exam is on 2026-11-06. My personal interest is robotics. A thought to keep: maybe buy a small notebook.";
const reviewed=await send(a,{action:"review",text});
assert.equal(reviewed.status,200,JSON.stringify(reviewed.data));
const review=reviewed.data.review;
assert(review.proposals.length>=1&&review.proposals.length<=6);
assert(review.proposals.every(p=>text.includes(p.evidence)));
if(review.mode==="live") {
  const destinations=new Set(review.proposals.map(p=>p.destination));
  assert(destinations.has("work")&&destinations.has("profile")&&destinations.has("thought"));
  assert.equal(review.proposals.find(p=>p.destination==="work").dueDate,"2026-11-06");
} else {
  assert.equal(review.proposals.length,1);assert.equal(review.proposals[0].destination,"thought");assert.equal(review.proposals[0].text,text);
}
const commit={action:"commit",reviewId:review.id,proposals:review.proposals};
assert.equal((await send(b,commit)).status,400);
assert.equal((await send(a,commit,"https://unrelated.example")).status,403);
const saved=await send(a,commit);
assert.equal(saved.status,200,JSON.stringify(saved.data));
const repeated=await send(a,commit);assert.equal(repeated.status,200);
assert.deepEqual(repeated.data.state.works,saved.data.state.works);
assert.deepEqual(repeated.data.state.notes,saved.data.state.notes);
assert.deepEqual(repeated.data.state.profile,saved.data.state.profile);
const fresh=await fetch(base+"/api/workspace",{headers:{Cookie:a}}).then(r=>r.json());
assert.deepEqual(fresh.state,saved.data.state);
console.log(`Companion HTTP passed: ${review.mode} review, exact source excerpts, reviewed save, separate sessions, cross-origin refusal, persistence and duplicate-submit protection.`);
if(review.mode==="live")console.log("Live mixed capture proposed coursework, personal interest and thought, with the explicit exam date preserved.");
else console.log("AI sorting unavailable: original thought preserved; no live classification quality claimed.");
