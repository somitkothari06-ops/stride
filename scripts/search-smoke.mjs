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
const searchStarted=performance.now();
const response=await fetch(`${base}/api/action`,{
  method:"POST",headers:{Cookie:cookie,Origin:base,"Content-Type":"application/json"},
  body:JSON.stringify({action:"direction",role:process.env.STRIDE_ROLE_QUERY || "backend software engineering internship for college students"}),
});
const result=await response.json();
assert.equal(response.status,200,result.error?.message || "Search failed");
let direction=result.state.direction;
const sourcesMs=Math.round(performance.now()-searchStarted);
assert.ok(direction.searchId);assert.equal(direction.mode,"guided");
const post=async(payload,auth=cookie)=>{const r=await fetch(`${base}/api/action`,{method:"POST",headers:{Cookie:auth,Origin:base,"Content-Type":"application/json"},body:JSON.stringify(payload)});return{status:r.status,data:await r.json()};};
const secondBoot=await fetch(`${base}/api/workspace?fresh=1`);const foreignCookie=secondBoot.headers.get("set-cookie").split(";")[0];
assert.equal((await post({action:"explainDirection",searchId:direction.searchId},foreignCookie)).status,409);
const cachedStarted=performance.now();const cached=await post({action:"direction",role:direction.role});assert.equal(cached.status,200);assert.equal(cached.data.state.direction.searchId,direction.searchId);const cachedMs=Math.round(performance.now()-cachedStarted);
const persisted=await fetch(`${base}/api/workspace`,{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(persisted.state.direction.searchId,direction.searchId);
const explanationStarted=performance.now();const explained=await post({action:"explainDirection",searchId:direction.searchId});assert.equal(explained.status,200,JSON.stringify(explained.data));direction=explained.data.state.direction;assert.equal(direction.explanationPending,false);const explanationMs=Math.round(performance.now()-explanationStarted);
const replay=await post({action:"explainDirection",searchId:direction.searchId});assert.deepEqual(replay.data.state.direction,direction);

assert.ok(direction.sources.length>0,"No public sources were returned");
for(const source of direction.sources){
 assert.match(source.url,/^https?:\/\//);
 assert.ok(source.title.length>0);
 assert.ok(Number.isFinite(Date.parse(source.retrievedAt)));
}
assert.ok(direction.requirements.every(item=>item.evidenceIds.length===0),"Fresh workspace must not invent observed evidence");
if(direction.mode==="live") {
 assert.ok(direction.courseConnection && direction.nextMove);
 assert.ok(direction.requirements.length<=3);
 assert.ok(direction.summary.length<=350);
 for(const item of direction.requirements) {
  assert.ok(item.sourceQuotes?.length);
  assert.ok(item.sourceQuotes.some(ref=>ref.quote.toLowerCase().includes(item.requirement.toLowerCase())));
  for(const ref of item.sourceQuotes)assert.ok(direction.sources[ref.sourceIndex-1]?.excerpt.includes(ref.quote));
 }
}

const reloaded=await fetch(`${base}/api/workspace`,{headers:{Cookie:cookie}}).then(r=>r.json());
assert.equal(reloaded.state.direction.sources.length,direction.sources.length);
console.log(JSON.stringify({status:"passed",sourcesMs,cachedMs,explanationMs,separateSourceDelivery:true,cachedSearch:true,foreignSearchRefused:true,explanationReplaySafe:true,sources:direction.sources.map(({url,title})=>({url,title})),mode:direction.mode,persisted:true,unearnedEvidence:false},null,2));
