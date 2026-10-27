import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readPipLaunch,completePipLaunch,launchPipChat} from "../lib/pip-navigation";
test("automatic lesson handoffs expire, reject broken drafts and only clear their own request",()=>{
 const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
 Object.defineProperty(globalThis,"sessionStorage",{value:storage,configurable:true});
 const id=randomUUID(),other=randomUUID();
 storage.setItem("stride-pip-launch",JSON.stringify({id,text:"Explain SQL joins",autoSend:true,createdAt:Date.now()}));
 assert.equal(readPipLaunch()?.id,id);completePipLaunch(other);assert.equal(readPipLaunch()?.id,id);completePipLaunch(id);assert.equal(readPipLaunch(),undefined);
 for(const value of ["not JSON",JSON.stringify({id:"bad",text:"X",createdAt:Date.now()}),JSON.stringify({id,text:"Old",createdAt:Date.now()-1000000})]){storage.setItem("stride-pip-launch",value);assert.equal(readPipLaunch(),undefined);}
});

test("expanding quick chat carries an editable draft without sending it",()=>{
 const values=new Map<string,string>();let destination="";
 Object.defineProperty(globalThis,"sessionStorage",{value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},configurable:true});
 Object.defineProperty(globalThis,"window",{value:{location:{assign:(url:string)=>{destination=url;}}},configurable:true});
 launchPipChat("My unsent thought",false);
 assert.equal(destination,"/pip");assert.equal(readPipLaunch()?.text,"My unsent thought");assert.equal(readPipLaunch()?.autoSend,false);
 launchPipChat("Explain SQL joins");assert.equal(readPipLaunch()?.autoSend,true);
});

test("blocked storage keeps an unsent quick-chat draft on the current page",()=>{
 let navigated=false;
 Object.defineProperty(globalThis,"sessionStorage",{value:{setItem:()=>{throw new Error("blocked");}},configurable:true});
 Object.defineProperty(globalThis,"window",{value:{location:{assign:()=>{navigated=true;}}},configurable:true});
 assert.equal(launchPipChat("Keep this draft",false),false);assert.equal(navigated,false);
});
