import test from "node:test";
import assert from "node:assert/strict";
import { roleComparison } from "../lib/role-comparison";
test("retrieved sources remain usable if AI comparison fails or reaches its allowance", async()=>{
 for (const code of ["MODEL_UNAVAILABLE","DAILY_LIMIT"]) {
  const result=await roleComparison(3,[],async()=>{throw new Error(code);});
  assert.equal(result.mode,"guided"); assert.deepEqual(result.requirements,[]);
  assert.match(result.summary,/Retrieved 3 public sources/);
  assert.match(result.summary,/no assessment/);
 }
});
test("foreign evidence IDs never turn search results into an assessed comparison",async()=>{
 const result=await roleComparison(2,[],async()=>({summary:"Unsupported claim",requirements:[{requirement:"SQL",evidenceIds:["invented-observation"],nextStep:"Practise joins"}]}));
 assert.equal(result.mode,"guided"); assert.deepEqual(result.requirements,[]);
});
test("valid comparisons are preserved and unexpected programming errors propagate",async()=>{
 const comparison={summary:"Related work exists",requirements:[{requirement:"SQL",evidenceIds:["known-observation"],nextStep:"Practise joins"}]};
 const result=await roleComparison(2,["known-observation"],async()=>comparison);
 assert.equal(result.mode,"live"); assert.deepEqual(result.requirements,comparison.requirements);
 await assert.rejects(roleComparison(2,[],async()=>{throw new Error("unexpected");}),/unexpected/);
});
