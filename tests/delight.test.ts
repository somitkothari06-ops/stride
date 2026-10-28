import test from 'node:test';import assert from 'node:assert/strict';
import {pocketSchedule,pocketDescription,pocketMinutes} from '../lib/time-pocket';
import {exampleParts} from '../lib/example-parts';import {ActionSchema} from '../lib/types';
test('time pockets allocate the actual selected budget without claiming elapsed work',()=>{for(const minutes of pocketMinutes){const steps=pocketSchedule(minutes);assert.equal(steps.reduce((total,step)=>total+step.minutes,0),minutes);assert.ok(steps.every(step=>step.minutes>0));assert.match(pocketDescription(minutes),/leave your next step/);assert.equal(ActionSchema.parse({action:'setTime',minutes}).action,'setTime');}assert.equal(ActionSchema.safeParse({action:'setTime',minutes:999}).success,false);});
test('progressive example retains all prose and fenced code',()=>{const text='First, take the queue. Next, run the first process. Finally, check the waiting time.';assert.equal(exampleParts(text).join(' '),text);const code='```js\nconst a = 1;\n\nconsole.log(a);\n```';assert.equal(exampleParts(code).length,1);assert.equal(exampleParts(code)[0],code);const long=Array.from({length:30},(_,i)=>`Part ${i}.`).join('\n\n');assert.equal(exampleParts(long).length,12);assert.equal(exampleParts(long).join('\n\n'),long);});

test('canvas pins deduplicate exact content and never silently evict an existing pin',async()=>{
 const {addCanvasPin,MAX_PINS}=await import('../lib/pip-canvas');let pins:import('../lib/pip-canvas').PipPin[]=[];
 for(let i=0;i<MAX_PINS;i++){const result=addCanvasPin(pins,{id:String(i),messageId:String(i),kind:'message',text:`Explanation ${i}`});assert.equal(result.status,'added');pins=result.pins;}
 const original=[...pins];assert.equal(addCanvasPin(pins,{...pins[0],id:'another-id'}).status,'duplicate');
 const full=addCanvasPin(pins,{id:'new',messageId:'new',kind:'code',text:'<script>plain text only</script>'});assert.equal(full.status,'full');assert.deepEqual(full.pins,original);assert.deepEqual(pins,original);
});

test('numbered example lines become separate reveals without dropping reasoning',()=>{const text='Start with two processes.\n\n1. P1 runs.\n2. P2 runs.\n3. P1 completes.\n\nNow calculate waiting times.';const parts=exampleParts(text);assert.equal(parts.length,5);assert.equal(parts.join(' ').replace(/\s+/g,' '),text.replace(/\s+/g,' '));});
