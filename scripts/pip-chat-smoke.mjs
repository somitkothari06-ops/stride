import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {writeFileSync,readFileSync,existsSync} from "node:fs";
if(!process.argv.includes("--allow-live"))throw new Error("Pass --allow-live: this uses real Nebius calls and one Tavily search with synthetic messages.");
const base=process.env.STRIDE_BASE_URL||"http://127.0.0.1:3100";
const boot=await fetch(base+"/api/workspace?fresh=1");assert.equal(boot.status,200);
const bootData=await boot.json(),cookie=boot.headers.get("set-cookie").split(";")[0],initial=bootData.state;
if(process.env.STRIDE_SMOKE_IDS_FILE){const file=process.env.STRIDE_SMOKE_IDS_FILE;const ids=existsSync(file)?JSON.parse(readFileSync(file,"utf8")):[];ids.push(createHash("sha256").update(cookie.split("=")[1]).digest("hex"));writeFileSync(file,JSON.stringify(ids),{mode:0o600});}
async function send(input,origin=base){const response=await fetch(base+"/api/pip-chat",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(input)});return {status:response.status,data:await response.json()};}
const first={action:"send",turnId:randomUUID(),version:0,text:"Teach me Students LEFT JOIN Courses with a tiny example. Keep Students as the left table. Ask me one question after the explanation.",allowSearch:false};
assert.equal((await send(first,"https://unrelated.example")).status,403);
let result=await send(first);assert.equal(result.status,200,JSON.stringify(result.data));let chat=result.data.chat;assert.equal(chat.messages.length,2);assert.equal(chat.messages[1].intent,"teach");assert.ok(chat.messages[1].text.length>40);
const replay=await send(first);assert.deepEqual(replay.data.chat,chat);
result=await send({action:"send",turnId:randomUUID(),version:chat.version,text:"I think a student without a matching course disappears. Is my understanding right?",allowSearch:false});assert.equal(result.status,200,JSON.stringify(result.data));chat=result.data.chat;assert.equal(chat.messages.length,4);
console.log("Teaching follow-up:",chat.messages.at(-1).text.slice(0,700));
const after=(await fetch(base+"/api/workspace",{headers:{Cookie:cookie}}).then(r=>r.json())).state;
assert.deepEqual(after.profile,initial.profile);assert.deepEqual(after.works,initial.works);assert.deepEqual(after.notes,initial.notes);assert.equal(after.revision,initial.revision);
const reload=await fetch(base+"/api/pip-chat",{headers:{Cookie:cookie}}).then(r=>r.json());assert.deepEqual(reload.chat,chat);
result=await send({action:"clear",version:chat.version});assert.equal(result.status,200);chat=result.data.chat;assert.equal(chat.messages.length,0);
result=await send({action:"send",turnId:randomUUID(),version:chat.version,text:"hey bruh, wassup",allowSearch:false});assert.equal(result.status,200);chat=result.data.chat;
result=await send({action:"send",turnId:randomUUID(),version:chat.version,text:"what model are you",allowSearch:true});assert.equal(result.status,200);chat=result.data.chat;assert.ok(chat.messages.at(-1).text.includes(bootData.providers.model),"Identity must name the configured model, not repeat a greeting");
result=await send({action:"send",turnId:randomUUID(),version:chat.version,text:"Explain what a foreign key does, with a tiny example.",allowSearch:false});assert.equal(result.status,200);chat=result.data.chat;assert.match(chat.messages.at(-1).text,/foreign|referenc/i,"A new topic must not receive another greeting");console.log("Changed-topic reply:",chat.messages.at(-1).text.slice(0,700));
result=await send({action:"send",turnId:randomUUID(),version:chat.version,text:"Find an official beginner-friendly SQL joins learning resource on the web and tell me where to start.",allowSearch:true});assert.equal(result.status,200,JSON.stringify(result.data));chat=result.data.chat;const answer=chat.messages.at(-1);assert.equal(answer.searchStatus,"used","Pip must really search for this request");assert.ok(answer.sources.some(source=>source.id.startsWith("web-")&&/^https?:/.test(source.url)));
console.log(JSON.stringify({status:"passed",persistentFollowUp:true,duplicateSafe:true,noImplicitProfileOrTaskChanges:true,webSources:answer.sources.filter(source=>source.url).map(source=>source.url),clearVersion:chat.version}));
