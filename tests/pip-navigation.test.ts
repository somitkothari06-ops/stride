import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readPipLaunch,completePipLaunch} from "../lib/pip-navigation";
test("automatic lesson handoffs expire, reject broken drafts and only clear their own request",()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
 Object.defineProperty(globalThis,"sessionStorage",{value:storage,configurable:true});
 const id=randomUUID(),other=randomUUID();
 storage.setItem("stride-pip-launch",JSON.stringify({id,text:"Explain SQL joins",autoSend:true,createdAt:Date.now()}));
 assert.equal(readPipLaunch()?.id,id);completePipLaunch(other);assert.equal(readPipLaunch()?.id,id);completePipLaunch(id);assert.equal(readPipLaunch(),undefined);
 for(const value of ["not JSON",JSON.stringify({id:"bad",text:"X",createdAt:Date.now()}),JSON.stringify({id,text:"Old",createdAt:Date.now()-1000000})]){storage.setItem("stride-pip-launch",value);assert.equal(readPipLaunch(),undefined);}
});
