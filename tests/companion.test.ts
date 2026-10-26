import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession, db, getState, mutate } from "../lib/store";
import { ownedWorkspace } from "../lib/account-store";
import { checkCaptureEvidence, conservativeCapture, createCaptureReview, commitCapture, ProposalsSchema, type Proposal } from "../lib/companion";
import { emptyLifeContext } from "../lib/personal-context";
process.env.STRIDE_DATA_DIR = mkdtempSync(join(tmpdir(),"stride-companion-"));
const source = "My OS exam is on 2026-11-06. I like robotics. A robot idea to remember.";
const proposals: Proposal[] = [
  {destination:"work",evidence:"My OS exam is on 2026-11-06.",title:"OS exam",subject:"Operating systems",kind:"exam",dueDate:"2026-11-06",text:"Revise scheduling.",uncertainty:""},
  {destination:"profile",evidence:"I like robotics.",field:"interests",text:"Robotics"},
  {destination:"thought",evidence:"A robot idea to remember.",text:"A robot idea to remember."},
];
test("mixed capture saves the selected destinations once and preserves unrelated personal context",()=>{
  const session = createSession(false);
  mutate(session.id,state=>{state.profile.lifeContext={...emptyLifeContext,interests:"Art"};state.profile.goal="Keep my goal";});
  const before=getState(session.id)!, review=createCaptureReview(session.id,before.revision,source,proposals,"live");
  const saved=commitCapture(session.id,review.id,proposals);
  assert.equal(saved.works.length,1); assert.equal(saved.notes?.length,1);
  assert.equal(saved.profile.lifeContext?.interests,"Art\nRobotics");
  assert.equal(saved.profile.goal,"Keep my goal"); assert.equal(saved.profile.name,before.profile.name);
  assert.equal(saved.revision,before.revision+1);
  assert.equal(commitCapture(session.id,review.id,proposals).works.length,1);
  const row=db().prepare("SELECT source,payload FROM companion_reviews WHERE id=?").get(review.id);
  assert.equal(row?.source,""); assert.equal(row?.payload,"[]");
});
test("another browser cannot confirm a capture review or write to a claimed guest identity",()=>{
  const a=createSession(false),b=createSession(false);
  const review=createCaptureReview(a.id,a.state.revision,source,proposals,"guided");
  assert.throws(()=>commitCapture(b.id,review.id,proposals),/CAPTURE_EXPIRED/);
  assert.equal(getState(b.id)?.works.length,0);
  const owned=ownedWorkspace("synthetic-capture-owner",a.token);
  assert.throws(()=>commitCapture(owned.id,review.id,proposals),/CAPTURE_EXPIRED/);
  assert.throws(()=>commitCapture(a.id,review.id,proposals),/SESSION_EXPIRED/);
});
test("a full profile field rolls back the entire batch, including an earlier work addition",()=>{
  const a=createSession(false);
  mutate(a.id,state=>{state.profile.lifeContext={...emptyLifeContext,learningPreferences:"x".repeat(1000)};});
  const items:Proposal[]=[proposals[0],{destination:"profile",field:"learningPreferences",text:"More examples",evidence:"I like robotics."}];
  const review=createCaptureReview(a.id,a.state.revision,source,items,"guided");
  assert.throws(()=>commitCapture(a.id,review.id,items),/CAPTURE_PROFILE_FULL/);
  assert.equal(getState(a.id)?.works.length,0); assert.equal(getState(a.id)?.revision,a.state.revision);
  assert.equal(commitCapture(a.id,review.id,[items[0]]).works.length,1);
  assert.equal(getState(a.id)?.profile.lifeContext?.learningPreferences.length,1000);
});
test("stale and expired reviews preserve the current workspace without adding entries",()=>{
  const a=createSession(false),review=createCaptureReview(a.id,a.state.revision,source,proposals,"guided");
  mutate(a.id,state=>{state.revision++;});
  assert.throws(()=>commitCapture(a.id,review.id,proposals),/CAPTURE_STALE/);
  db().prepare("UPDATE companion_reviews SET expires=1 WHERE id=?").run(review.id);
  assert.throws(()=>commitCapture(a.id,review.id,proposals),/CAPTURE_EXPIRED/);
  assert.equal(getState(a.id)?.works.length,0);
});
test("capture validation rejects impossible dates, unsupported profile fields and invented evidence",()=>{
  assert.equal(ProposalsSchema.safeParse([{...proposals[0],dueDate:"2026-02-30"}]).success,false);
  assert.equal(ProposalsSchema.safeParse([{destination:"profile",field:"goal",text:"Invented goal",evidence:"I like robotics."}]).success,false);
  assert.throws(()=>checkCaptureEvidence(source,[{destination:"thought",text:"Invented",evidence:"Not in the source"}]),/CAPTURE_EVIDENCE_INVALID/);
});
test("guided capture preserves the original words as a thought and bounds pending reviews",()=>{
  const a=createSession(false),words="Umm, not sure what I want to do yet.";
  const items=conservativeCapture(words);
  assert.equal(items[0].destination,"thought"); assert.equal(items[0].text,words);
  for(let i=0;i<12;i++)createCaptureReview(a.id,a.state.revision,words,items,"guided");
  assert.throws(()=>createCaptureReview(a.id,a.state.revision,words,items,"guided"),/CAPTURE_LIMIT/);
});
test("a thought-only commit is idempotent even though planning context is unchanged",()=>{
  const a=createSession(false), words="Keep this passing thought.";
  const proposals=conservativeCapture(words),review=createCaptureReview(a.id,a.state.revision,words,proposals,"guided");
  assert.equal(commitCapture(a.id,review.id,proposals).revision,a.state.revision);
  assert.equal(commitCapture(a.id,review.id,proposals).notes?.length,1);
});
test("a long story addition is preserved rather than silently truncated",()=>{
  const a=createSession(false),words="A detailed student story. ".repeat(70);
  const items:Proposal[]=[{destination:"profile",field:"story",text:words.trim(),evidence:words.slice(0,100)}];
  const review=createCaptureReview(a.id,a.state.revision,words,items,"guided");
  assert.equal(commitCapture(a.id,review.id,items).profile.lifeContext?.story,words.trim());
});
