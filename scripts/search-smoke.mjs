import assert from "node:assert/strict";
if (!process.argv.includes("--allow-live")) {
  console.error("This check uses one Tavily search and, when configured, one model call. Pass --allow-live to run it.");
  process.exit(1);
}
const base=process.env.STRIDE_BASE_URL || "http://127.0.0.1:3000";
const boot=await fetch(`${base}/api/workspace?fresh=1`);
assert.equal(boot.status,200);
const cookie=boot.headers.get("set-cookie")?.split(";")[0];
const initial=await boot.json();
assert.ok(cookie); assert.equal(initial.providers.tavily,true);
const response=await fetch(`${base}/api/action`,{
  method:"POST",headers:{Cookie:cookie,Origin:base,"Content-Type":"application/json"},
  body:JSON.stringify({action:"direction",role:"backend software engineering internship for college students"}),
});
const result=await response.json();
assert.equal(response.status,200,result.error?.message || "Search failed");
const direction=result.state.direction;
assert.ok(direction.sources.length>0,"No public sources were returned");
for(const source of direction.sources){
 assert.match(source.url,/^https?:\/\//);
 assert.ok(source.title.length>0);
 assert.ok(Number.isFinite(Date.parse(source.retrievedAt)));
}
assert.ok(direction.requirements.every(item=>item.evidenceIds.length===0),"Fresh workspace must not invent observed evidence");
const reloaded=await fetch(`${base}/api/workspace`,{headers:{Cookie:cookie}}).then(r=>r.json());
assert.equal(reloaded.state.direction.sources.length,direction.sources.length);
console.log(JSON.stringify({status:"passed",sources:direction.sources.map(({url,title})=>({url,title})),mode:direction.mode,persisted:true,unearnedEvidence:false},null,2));
