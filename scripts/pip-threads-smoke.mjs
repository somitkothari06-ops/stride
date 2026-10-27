import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
if(!process.argv.includes('--allow-write'))throw new Error('Pass --allow-write to create disposable synthetic workspaces. No inference calls are made.');
const base=process.env.STRIDE_BASE_URL||'http://127.0.0.1:3100';
async function boot(){const response=await fetch(base+'/api/workspace?fresh=1');assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];if(process.env.STRIDE_SMOKE_IDS_FILE){const file=process.env.STRIDE_SMOKE_IDS_FILE,ids=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];ids.push(createHash('sha256').update(cookie.split('=')[1]).digest('hex'));writeFileSync(file,JSON.stringify(ids),{mode:0o600});}return cookie;}
const cookie=await boot();
async function request(payload,withCookie=cookie,origin=base){const response=await fetch(base+'/api/pip-chat',{method:'POST',headers:{Cookie:withCookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(payload)});return {status:response.status,data:await response.json()};}
async function read(threadId,withCookie=cookie){const response=await fetch(base+'/api/pip-chat'+(threadId?'?threadId='+threadId:''),{headers:{Cookie:withCookie}});return {status:response.status,data:await response.json()};}
const a=randomUUID(),b=randomUUID();let result=await request({action:'create',id:a,revision:0});assert.equal(result.status,200);let snapshot=result.data;
assert.equal((await request({action:'create',id:a,revision:0})).data.threads.length,2);
result=await request({action:'send',threadId:a,turnId:randomUUID(),version:0,text:'what model are you',allowSearch:false});assert.equal(result.status,200);assert.equal(result.data.chat.messages.length,2);snapshot=result.data;
result=await request({action:'create',id:b,revision:snapshot.threadRevision});assert.equal(result.status,200);snapshot=result.data;assert.equal(snapshot.chat.messages.length,0);
const normal=await fetch(base+'/api/workspace',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal('pipThreads' in normal.state,false);const exported=await fetch(base+'/api/workspace?export=1',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(exported.state.pipThreads.items.find(thread=>thread.id===a).chat.messages.length,2);
assert.equal((await read(a)).data.chat.messages.length,2);assert.equal((await read(b)).data.chat.messages.length,0);
const other=await boot();assert.equal((await read(a,other)).status,404);
result=await request({action:'rename',threadId:b,title:'Career questions',revision:snapshot.threadRevision});assert.equal(result.status,200);snapshot=result.data;assert.ok(snapshot.threads.some(thread=>thread.id===b&&thread.title==='Career questions'));
assert.equal((await request({action:'rename',threadId:b,title:'Foreign write',revision:snapshot.threadRevision},cookie,'https://unrelated.example')).status,403);
result=await request({action:'delete',threadId:a,version:1,revision:snapshot.threadRevision});assert.equal(result.status,200);snapshot=result.data;
assert.equal((await request({action:'send',threadId:a,turnId:randomUUID(),version:1,text:'what model are you',allowSearch:false})).status,404);
assert.ok((await read(b)).data.threads.some(thread=>thread.title==='Career questions'));
result=await request({action:'select',threadId:b});assert.equal(result.status,200);assert.equal((await read()).data.threadId,b);
console.log(JSON.stringify({status:'passed',threadIsolation:true,createIdempotence:true,crossWorkspaceRefusal:true,renamePersistence:true,deletionBlocksLateWrites:true,selectedThreadPersists:true,modelCalls:0}));
