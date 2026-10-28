import test from "node:test";
import assert from "node:assert/strict";
import {requestJson,connectionMessage} from "../lib/client-request";
test("only explicitly replay-safe requests retry transport failures; API errors do not retry",async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async()=>{calls++;if(calls===1)throw new TypeError("Load failed");return Response.json({saved:true});};
  assert.deepEqual(await requestJson("/settings",{method:"PUT"},{retryNetwork:true}),{saved:true});assert.equal(calls,2);
  calls=0;globalThis.fetch=async()=>{calls++;return Response.json({error:{message:"conflict"}},{status:409});};
  await assert.rejects(requestJson("/settings",{},{retryNetwork:true}),/conflict/);assert.equal(calls,1);
  calls=0;globalThis.fetch=async()=>{calls++;throw new TypeError("Load failed");};
  await assert.rejects(requestJson("/action",{method:"POST"}),/Load failed/);assert.equal(calls,1);
  assert.equal(connectionMessage(new TypeError("Load failed"),"Try again"),"Try again");
 }finally{globalThis.fetch=original;}
});
