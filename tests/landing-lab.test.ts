import test from 'node:test';
import assert from 'node:assert/strict';
import {LandingLabInput,LandingLabFeedback,landingLabTask,landingFeedbackOutput} from '../lib/landing-lab';
import {browserPreview} from '../lib/browser-preview';
import {landingStarter,landingPlayerRows} from '../lib/landing-example';
import {runInNewContext} from 'node:vm';
test('landing feedback accepts bounded code and output, rejects oversized abuse',()=>{
 assert.ok(LandingLabInput.safeParse({code:'console.log(1)',output:['1']}).success);
 assert.equal(LandingLabInput.safeParse({code:'a'.repeat(6001),output:[]}).success,false);
 assert.equal(LandingLabInput.safeParse({code:'x',output:Array(31).fill('x')}).success,false);
 assert.equal(LandingLabFeedback.safeParse({explanation:'',tryNext:'x'}).success,false);
 assert.match(landingLabTask,/untrusted data/);assert.match(landingLabTask,/Do not execute code/);
});
test('landing example genuinely computes the unmatched player in the isolated runner',()=>{
 const code=landingStarter;
 const doc=browserPreview(code,'JavaScript','landing-test');
 const literal=doc.match(/new Blob\(\[("(?:\\.|[^"\\])*")\]/)?.[1];assert.ok(literal);
 const lines:{line:string;done:boolean}[]=[];
 runInNewContext(JSON.parse(literal),{console:{},postMessage:(message:{line:string;done:boolean})=>lines.push(message)});
 assert.equal(lines[0].line,'[{"name":"Dev","team":null}]');assert.equal(lines.at(-1)?.done,true);
});

test('visual result cards use actual bounded console rows and preserve unknown output',()=>{assert.deepEqual(landingPlayerRows(['[{"name":"Dev","team":null}]','Finished.']),[{name:'Dev',team:null}]);assert.equal(landingPlayerRows(['42']),null);assert.equal(landingPlayerRows(['[{"name":"Dev"}]']),null);assert.deepEqual(landingPlayerRows(['[]']),[]);});

test('long run output is bounded before feedback, with an honest truncation flag',()=>{const bounded=landingFeedbackOutput(Array(20).fill('x'.repeat(2000)));assert.equal(bounded.output.length,8);assert.equal(bounded.output[0].length,500);assert.equal(bounded.outputTruncated,true);assert.ok(LandingLabInput.safeParse({code:'x',...bounded}).success);assert.deepEqual(landingFeedbackOutput(['1','Finished.']),{output:['1'],outputTruncated:false});});
