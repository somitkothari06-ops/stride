import test from "node:test";
import assert from "node:assert/strict";
import { introductionDraft } from "../lib/introduction";
import { emptyLifeContext } from "../lib/personal-context";
test("intro groups only exact words, preserves existing context and never invents a goal", () => {
 const source="I built a calculator. I enjoy robotics.";
 const existing={...emptyLifeContext,constraints:"I commute daily."};
 const result=introductionDraft(source,existing,{facts:[{field:"experience",quote:"I built a calculator."},{field:"interests",quote:"I enjoy robotics."}]});
 assert.equal(result.story,source);assert.equal(result.constraints,existing.constraints);assert.equal(result.direction,"exploring");assert.equal(result.ambitions,"");assert.equal(existing.story,"");
 assert.throws(()=>introductionDraft(source,existing,{facts:[{field:"ambitions",quote:"I want to work at Google"}]}),/INTRO_EVIDENCE_INVALID/);
});
test("repeated extraction does not duplicate facts, and full fields cannot silently lose text",()=>{
 const source="I enjoy robotics.";const first=introductionDraft(source,emptyLifeContext,{facts:[{field:"interests",quote:source}]});
 assert.equal(introductionDraft(source,first,{facts:[{field:"interests",quote:source}]}).interests,source);
 assert.throws(()=>introductionDraft(source,{...emptyLifeContext,interests:"x".repeat(2000)},{facts:[{field:"interests",quote:source}]}));
});
