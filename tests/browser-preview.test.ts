import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {browserPreview} from '../lib/browser-preview';
test('JS preview keeps user source inside worker data and blocks network access',()=>{
 const doc=browserPreview('console.log("</script><img src=x onerror=alert(1)>")','JavaScript','test-channel');
 assert.equal((doc.match(/<script>/g)||[]).length,1);assert.equal((doc.match(/<\/script>/g)||[]).length,1);assert.match(doc,/connect-src 'none'/);assert.match(doc,/worker\.terminate/);assert.match(doc,/2000/);assert.ok(!doc.includes('<img src=x'));
});
test('HTML preview has restrictive policy and leaves content to a script-disabled sandbox',()=>{const doc=browserPreview('<h1>My work</h1>','HTML / CSS','x');assert.match(doc,/default-src 'none'/);assert.match(doc,/form-action 'none'/);assert.match(doc,/<h1>My work<\/h1>/);assert.ok(!doc.includes("script-src 'unsafe-inline'"));});

test('worker output is bounded and a successful synchronous run finishes once',()=>{
 const doc=browserPreview('for(let i=0;i<100;i++)console.log(i)','JavaScript','channel');
 const literal=doc.match(/new Blob\(\[("(?:\\.|[^"\\])*")\]/)?.[1];assert.ok(literal);
 const messages:{line:string;done:boolean}[]=[];runInNewContext(JSON.parse(literal),{console:{},postMessage:(message:{line:string;done:boolean})=>messages.push(message)});
 assert.equal(messages.length,31);assert.equal(messages[0].line,'0');assert.equal(messages[29].line,'29');assert.equal(messages.at(-1)?.done,true);
});

test('console supports BigInt, circular values and common log methods without crashing valid code',()=>{const doc=browserPreview('const obj={};obj.self=obj;console.log(1n,obj);console.warn("warning");console.info("info");console.debug("debug");console.log("still running");','JavaScript','console-test');const literal=doc.match(/new Blob\(\[("(?:\\.|[^"\\])*")\]/)?.[1];assert.ok(literal);const lines:{line:string;done:boolean}[]=[];runInNewContext(JSON.parse(literal),{console:{},postMessage:(message:{line:string;done:boolean})=>lines.push(message)});assert.ok(lines.some(line=>line.line==='still running'));assert.ok(lines.some(line=>line.line==='warning'));assert.ok(lines.some(line=>line.line==='debug'));assert.equal(lines.at(-1)?.done,true);});
