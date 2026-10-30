import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deskToolFor,deskTools,openDeskWindow,focusDeskWindow,panelHref,tileDeskWindows} from '../lib/desktop-tools';
test('desktop only opens recognised first-party routes',()=>{
 for(const href of ['https://evil.test/build','//evil.test/build','/\\evil.test','/api/account','/login','/workspace?view=bogus','/study/../../api/account'])assert.equal(deskToolFor(href),null,href);
 assert.equal(deskToolFor('/workspace?view=work')?.id,'work');
 assert.equal(deskToolFor('/workspace?themePreview=pearl')?.id,'preview-pearl-theme');
 assert.equal(deskToolFor('/workspace?open=integrations')?.id,'connections');
 assert.equal(deskToolFor('/study/material_123')?.id,'/study/material_123');
 assert.equal(deskToolFor('/build?desktopPanel=1')?.href,'/build');
});
test('reopening an app restores the same mounted window and layout',()=>{
 const b={width:1200,height:650};let ws=openDeskWindow([],deskTools[0],b);ws=openDeskWindow(ws,deskTools[3],b);
 ws=ws.map(w=>w.id==='today'?{...w,x:42,minimised:true}:w);
 const restored=openDeskWindow(ws,deskTools[0],b);
 assert.equal(restored.length,2);assert.equal(restored[0].x,42);assert.equal(restored[0].minimised,false);assert.ok(restored[0].z>restored[1].z);
 assert.equal(restored[1],ws[1]);
});
test('window focus leaves other tools intact and bounds accommodate a short viewport',()=>{
 const b={width:700,height:300};let ws=openDeskWindow([],deskTools[0],b);ws=openDeskWindow(ws,deskTools[1],b);
 for(const w of ws){assert.ok(w.x>=0&&w.y>=0);assert.ok(w.x+w.width<=b.width);assert.ok(w.y+w.height<=b.height);}
 assert.equal(focusDeskWindow(ws,'today')[1],ws[1]);
 assert.equal(panelHref('/workspace?view=work'),'/workspace?view=work&desktopPanel=1');
});
test('embedded navigation opens an owned tool through the parent without replacing its page',async()=>{
 const {openAppTool}=await import('../lib/desktop-tools');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');const sent:unknown[]=[];
 const parent={postMessage:(data:unknown,origin:string)=>sent.push({data,origin})};
 Object.defineProperty(globalThis,'window',{configurable:true,value:{self:{},top:parent,parent,location:{origin:'https://stride.test'}}});
 try{assert.equal(openAppTool('/pip'),true);assert.equal(openAppTool('https://outside.test/pip'),false);assert.deepEqual(sent,[{data:{channel:'stride-desk',type:'open',href:'/pip'},origin:'https://stride.test'}]);}finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});

test('four-window tiling keeps all four tools open, bounded and independently addressable',()=>{
 const b={width:1400,height:720};let ws=openDeskWindow([],deskTools[0],b);
 for(const t of deskTools.slice(1,4))ws=openDeskWindow(ws,t,b);
 const tiled=tileDeskWindows(ws,b,4);assert.equal(tiled.filter(w=>!w.minimised).length,4);
 for(const w of tiled){assert.ok(w.x>=0&&w.y>=0&&w.x+w.width<=b.width&&w.y+w.height<=b.height);assert.equal(w.href,ws.find(v=>v.id===w.id)?.href);}
 assert.equal(new Set(tiled.map(w=>`${w.x},${w.y}`)).size,4);
 const two=tileDeskWindows(tiled,b,2);assert.equal(two.filter(w=>!w.minimised).length,2);assert.equal(two.length,4);
});
