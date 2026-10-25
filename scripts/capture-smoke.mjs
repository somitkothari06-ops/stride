import assert from "node:assert/strict";
const base = process.env.STRIDE_BASE_URL || "http://127.0.0.1:3000";
const first = await fetch(`${base}/api/workspace?fresh=1`);
const cookie = first.headers.get("set-cookie").split(";")[0];
const initial = (await first.json()).state;
async function action(payload, as = cookie) {
 return fetch(`${base}/api/action`, { method:"POST", headers:{Cookie:as,Origin:base,"Content-Type":"application/json"},body:JSON.stringify(payload) });
}
const save = await action({action:"saveNote",text:"Synthetic thought: try a small game."});
assert.equal(save.status,200);
const saved = (await save.json()).state;
assert.equal(saved.notes.length,1); assert.equal(saved.works.length,0); assert.equal(saved.observations.length,0); assert.equal(saved.revision,initial.revision);
const reload = await fetch(`${base}/api/workspace`,{headers:{Cookie:cookie}}).then(r=>r.json());
assert.equal(reload.state.notes[0].text,saved.notes[0].text);
const second = await fetch(`${base}/api/workspace?fresh=1`), otherCookie=second.headers.get("set-cookie").split(";")[0];
assert.equal((await second.json()).state.notes?.length || 0,0);
assert.notEqual((await action({action:"deleteNote",id:saved.notes[0].id},otherCookie)).status,200);
assert.equal((await action({action:"saveNote",text:" "})).status,400);
assert.equal((await action({action:"saveNote",text:"x".repeat(6001)})).status,400);
const removed=await action({action:"deleteNote",id:saved.notes[0].id}); assert.equal((await removed.json()).state.notes.length,0);
await action({action:"saveNote",text:"Synthetic reset check"});
const reset=await action({action:"reset",sample:false}); assert.equal((await reset.json()).state.notes.length,0);
console.log("Capture HTTP passed: persistence, session isolation, limits, separate notes, removal and reset.");
