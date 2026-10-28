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
test("source-backed briefs reject invented quotes and invalid source numbers", async()=>{
 const sources=[{excerpt:"Requirements include SQL and Python."}];
 const base={summary:"A role working with data.",courseConnection:"Database coursework covers a related topic, not demonstrated ability.",nextMove:"Try a small SQL query.",requirements:[{requirement:"SQL",evidenceIds:[],nextStep:"Practise a join.",sourceQuotes:[{sourceIndex:1,quote:"SQL and Python"}]}]};
 assert.equal((await roleComparison(1,[],async()=>base,sources)).mode,"live");
 for(const ref of [{sourceIndex:1,quote:"requires a PhD"},{sourceIndex:2,quote:"SQL"},{sourceIndex:1,quote:""}]) {
  const bad={...base,requirements:[{...base.requirements[0],sourceQuotes:[ref]}]};
  assert.equal((await roleComparison(1,[],async()=>bad,sources)).mode,"guided");
 }
 const missing={...base,requirements:[{requirement:"SQL",evidenceIds:[],nextStep:"Try joins"}]};
 assert.equal((await roleComparison(1,[],async()=>missing,sources)).mode,"guided");
});

test("a genuine excerpt cannot support an unrelated inferred requirement",async()=>{
 const result=await roleComparison(1,[],async()=>({summary:"A role involving services.",requirements:[{requirement:"REST API",evidenceIds:[],nextStep:"Try an endpoint",sourceQuotes:[{sourceIndex:1,quote:"Develop services with Node.js"}]}]}),[{excerpt:"Develop services with Node.js"}]);
 assert.equal(result.mode,"guided");
});

test("one unsupported requirement does not hide other source-checked guidance",async()=>{
 const valid={requirement:"SQL",friendlyLabel:"Query a small table",evidenceIds:[],nextStep:"Try one join",sourceQuotes:[{sourceIndex:1,quote:"SQL and Python"}]};
 const bad={...valid,requirement:"Kubernetes",sourceQuotes:[{sourceIndex:1,quote:"invented requirement"}]};
 const result=await roleComparison(1,[],async()=>({summary:"Work with data.",requirements:[valid,bad]}),[{excerpt:"Requirements include SQL and Python."}]);
 assert.equal(result.mode,"live");assert.deepEqual(result.requirements,[valid]);
});
