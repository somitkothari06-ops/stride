import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {appendFileSync} from 'node:fs';
import {sessionId,getState,mutate,db} from '../lib/store';
if(!process.argv.includes('--allow-live'))throw new Error('Requires --allow-live: one synthetic long-memory conversation.');
const base=process.env.STRIDE_BASE_URL||'http://127.0.0.1:3100';
async function main(){
const boot=await fetch(base+'/api/workspace?fresh=1');const cookie=boot.headers.get('set-cookie')!.split(';')[0];const id=sessionId(cookie.split('=')[1]);
assert.ok(getState(id),'Must run against the same local deployment database.');
assert.equal((db().prepare('SELECT user_id FROM sessions WHERE id=?').get(id) as {user_id:null}).user_id,null);
appendFileSync('.runtime/release-audit-guests.jsonl',JSON.stringify(id)+'\n');
const oldThread=randomUUID(),activeThread=randomUUID();
mutate(id,s=>{s.notes=[{id:'old-football',text:'My football organiser was called GoalNest. My unresolved design question was whether to keep a transfer_history table when a player changes teams.',createdAt:'2025-01-04T00:00:00Z'},...Array.from({length:70},(_,i)=>({id:'noise-'+i,text:'Synthetic unrelated pottery note '+i,createdAt:'2026-10-29T00:00:00Z'}))];s.pipThreads={revision:0,activeId:activeThread,items:[{id:oldThread,title:'GoalNest project discussion',createdAt:'2025-01-04T00:00:00Z',updatedAt:'2025-01-04T00:00:00Z',chat:{version:1,messages:[{id:randomUUID(),turnId:randomUUID(),role:'user',text:'I chose SQL for GoalNest because I wanted to practise joins between teams and players.',createdAt:'2025-01-04T00:00:00Z'}]}},{id:activeThread,title:'New chat',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),chat:{version:0,messages:[]}}]};});
const response=await fetch(base+'/api/pip-chat',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'send',threadId:activeThread,version:0,turnId:randomUUID(),text:'What was my football organiser called, and what transfer design question had I left unresolved? Please use my saved records.',allowSearch:false})});
const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));const answer=data.chat.messages.at(-1);assert.match(answer.text,/GoalNest/i);assert.match(answer.text,/transfer/i);assert.ok(answer.sources.some((source:{id:string})=>source.id.startsWith('memory-')),'Recall must cite supplied older memory');
console.log(JSON.stringify({passed:true,oldRecordAmong70Unrelated:true,crossChatRecall:true,citedOriginalMemory:true,response:answer.text}));

}
main().catch(error=>{console.error(error);process.exitCode=1;});
