// Explicitly disruptive development check. Never runs in CI.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
const run=promisify(execFile);
const value=(flag)=>process.argv[process.argv.indexOf(flag)+1];
if(!process.argv.includes("--allow-restart") || !process.argv.includes("--host") || !process.argv.includes("--identity") || !process.argv.includes("--container")){
 console.error("Usage: recovery-smoke.mjs --allow-restart --host user@host --identity /private/key/path --container container-id"); process.exit(1);
}
const host=value("--host"), identity=value("--identity"), container=value("--container");
assert.match(host,/^[A-Za-z0-9_.@-]+$/); assert.match(container,/^[A-Za-z0-9_-]+$/);
const base=process.env.STRIDE_BASE_URL || "http://127.0.0.1:3100";
const quote=(s)=>`'${s.replaceAll("'", "'\\''")}'`;
async function ssh(command){const result=await run("ssh",["-i",identity,"-o","BatchMode=yes",host,command],{timeout:8000});return result.stdout.trim();}
const inContainer=(script)=>["sudo","docker","exec","--user","coder",container,"/home/coder/.local/node/bin/node","-e",script].map(quote).join(" ");
const pidScript='const fs=require("node:fs"); process.stdout.write(fs.readFileSync("/home/coder/stride/.runtime/server.pid","utf8").trim().split(/\\s+/)[0]);';
const crashScript='const fs=require("node:fs"); const pid=Number(fs.readFileSync("/home/coder/stride/.runtime/server.pid","utf8").trim().split(/\\s+/)[0]); if(pid<=1 || fs.readlinkSync(`/proc/${pid}/cwd`)!=="/home/coder/stride") process.exit(2); process.kill(pid,"SIGKILL");';
async function recover(previous){
 const deadline=Date.now()+40000;
 while(Date.now()<deadline){
  try{
   const current=await ssh(inContainer(pidScript));
   const health=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(2000)});
   if(current && current!==previous && health.status===200) return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw new Error("App did not recover with a new process and healthy storage within 40 seconds");
}
const boot=await fetch(`${base}/api/workspace?fresh=1`);
const cookie=boot.headers.get("set-cookie")?.split(";")[0]; assert.ok(cookie);
const text=`Synthetic recovery marker ${randomUUID()}`;
async function action(payload){
 const response=await fetch(`${base}/api/action`,{method:"POST",headers:{Cookie:cookie,Origin:base,"Content-Type":"application/json"},body:JSON.stringify(payload)});
 assert.equal(response.status,200); return (await response.json()).state;
}
const state=await action({action:"saveNote",text}); const note=state.notes.find(item=>item.text===text); assert.ok(note);
for(const [label,command] of [["app crash",inContainer(crashScript)],["supervisor-client crash","sudo systemctl kill --kill-whom=main --signal=SIGKILL stride.service"]]){
 const previous=await ssh(inContainer(pidScript));
 await ssh(command); await recover(previous);
 const restored=await fetch(`${base}/api/workspace`,{headers:{Cookie:cookie}}).then(response=>response.json());
 assert.ok(restored.state.notes.some(item=>item.id===note.id && item.text===text));
 console.log(`PASS: ${label} recovered with a new server process; saved workspace persisted`);
}
await action({action:"deleteNote",id:note.id});
console.log("Recovery checks passed. Synthetic marker removed; no model calls were made.");
