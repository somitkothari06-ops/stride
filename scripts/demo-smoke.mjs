import assert from 'node:assert/strict';
const base=process.env.STRIDE_BASE_URL||'http://127.0.0.1:3000';
const boot=await fetch(base+'/api/workspace?fresh=1');assert.equal(boot.status,200);
const original=boot.headers.getSetCookie().find(x=>x.startsWith('stride_session=')).split(';')[0];
const before=(await boot.json()).state;
async function start(){const r=await fetch(base+'/api/demo',{method:'POST',headers:{Origin:base,Cookie:original,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,200);const cookies=r.headers.getSetCookie();assert.equal(cookies.some(c=>c.startsWith('stride_session=')),false);if(base.startsWith('https:'))assert.ok(cookies.every(c=>/; secure/i.test(c)));return cookies.map(c=>c.split(';')[0]).join('; ');}
const demo=await start();
const response=await fetch(base+'/api/workspace',{headers:{Cookie:original+'; '+demo}});assert.equal(response.status,200);assert.equal(response.headers.getSetCookie().some(c=>c.startsWith('stride_session=')),false);
const sample=(await response.json()).state;assert.equal(sample.demo,true);assert.equal(sample.profile.name,'Riya');assert.equal(sample.works.length,3);
const account=await fetch(base+'/api/account',{headers:{Cookie:original+'; '+demo}}).then(r=>r.json());assert.equal(account.account,null);assert.equal(account.demo,true);
const other=await start();const otherState=await fetch(base+'/api/workspace',{headers:{Cookie:other}}).then(r=>r.json());assert.notEqual(sample.build.project.id,otherState.state.build.project.id);
assert.equal(sample.evidence.entries.filter(e=>e.kind==='session').length,20);
const attachments=sample.evidence.entries.flatMap(e=>e.observed.attachments);
assert.equal(attachments.length,2);
for(const attachment of attachments){
 const own=await fetch(base+'/api/evidence/attachment?key='+attachment.key,{headers:{Cookie:demo}});assert.equal(own.status,200);assert.ok((await own.text()).length>30);
 const foreign=await fetch(base+'/api/evidence/attachment?key='+attachment.key,{headers:{Cookie:other}});assert.equal(foreign.status,404);
}

const bad=await fetch(base+'/api/workspace',{headers:{Cookie:original+'; stride_demo_mode=1; stride_demo_session='+'0'.repeat(64)}});assert.equal(bad.status,401);
const forbidden=await fetch(base+'/api/demo',{method:'DELETE',headers:{Origin:'https://example.com',Cookie:demo}});assert.equal(forbidden.status,403);
const leave=await fetch(base+'/api/demo',{method:'DELETE',headers:{Origin:base,Cookie:original+'; '+demo}});assert.equal(leave.status,200);assert.equal(leave.headers.getSetCookie().some(c=>c.startsWith('stride_session=')),false);
const after=await fetch(base+'/api/workspace',{headers:{Cookie:original}}).then(r=>r.json());assert.deepEqual(after.state,before);
console.log(JSON.stringify({passed:true,isolatedSamples:true,originalWorkspacePreserved:true,expiredDemoCannotFallThrough:true,noSharedAccount:true,csrfChecked:true}));
