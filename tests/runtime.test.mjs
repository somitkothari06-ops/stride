import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
const run=promisify(execFile);
const linux=process.platform === "linux";
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),"stride-runtime-"));
 await mkdir(join(root,"scripts"));
 const script=join(root,"scripts/run-server.sh");
 await copyFile(new URL("../scripts/run-server.sh",import.meta.url),script);
 const entry=join(root,"fake-server.mjs");
 await writeFile(entry,'process.on("SIGTERM",()=>process.exit(0)); setInterval(()=>{},1000);');
 return {root,script,env:{...process.env,STRIDE_NODE:process.execPath,STRIDE_SERVER_ENTRY:entry}};
}
test("runtime stop ends only its server; a clean start can replace a stale PID",{skip:!linux},async()=>{
 const f=await fixture(); let child;
 try {
  for(let cycle=0;cycle<2;cycle++){
   child=spawn("sh",[f.script,"start"],{env:f.env,stdio:"ignore"});
   const done=new Promise(resolve=>child.once("exit",resolve));
   let pid;
   for(let n=0;n<60;n++){
    try{pid=Number((await readFile(join(f.root,".runtime/server.pid"),"utf8")).trim().split(/\s+/)[0]); if(pid===child.pid) break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,25));
   }
   assert.equal(pid,child.pid);
   await new Promise(resolve=>setTimeout(resolve,100));
   await assert.rejects(run("sh",[f.script,"start"],{env:f.env}),/already running/);
   await run("sh",[f.script,"stop"],{env:f.env});
   await done;
   await writeFile(join(f.root,".runtime/server.pid"),"999999999 1 old-boot\n");
  }
 } finally { child?.kill("SIGKILL"); await rm(f.root,{recursive:true,force:true}); }
});
test("runtime refuses to kill an unrelated live process or a malformed PID",{skip:!linux},async()=>{
 const f=await fixture(); const other=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{cwd:tmpdir(),stdio:"ignore"});
 try {
  await mkdir(join(f.root,".runtime"));
  const boot=(await readFile("/proc/sys/kernel/random/boot_id","utf8")).trim();
  const stamp=(await readFile(`/proc/${other.pid}/stat`,"utf8")).replace(/^.*\) /,"").split(" ")[19];
  await writeFile(join(f.root,".runtime/server.pid"),`${other.pid} ${stamp} ${boot}\n`);
  await assert.rejects(run("sh",[f.script,"stop"],{env:f.env}),/outside this application/);
  assert.equal(other.exitCode,null);
  await writeFile(join(f.root,".runtime/server.pid"),`${other.pid} 0 ${boot}\n`);
  await run("sh",[f.script,"stop"],{env:f.env});
  assert.equal(other.exitCode,null,"A reused PID identity must not be signalled");
  await writeFile(join(f.root,".runtime/server.pid"),"-1\n");
  const repaired=await run("sh",[f.script,"stop"],{env:f.env});
  assert.match(repaired.stdout,/Quarantined/);
  assert.equal(other.exitCode,null);
  assert.equal((await readFile(join(f.root,".runtime/server.pid.invalid"),"utf8")).trim(),"-1");
 } finally {other.kill("SIGKILL"); await rm(f.root,{recursive:true,force:true});}
});
