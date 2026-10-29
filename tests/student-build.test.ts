import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialWorkspace} from '../lib/planner';
import {applyBuild,buildPlanContract,buildFeedbackContract,assertBuildInput,buildReplay,buildSnapshot,buildSources} from '../lib/student-build';
import type {BuildInputType} from '../lib/student-build';
const step={title:'Design your teams',task:'Draw the player and team relationship.',deliverable:'A small schema',question:'Can a player belong to two teams?',minutes:15,subject:'Databases'};
const plan={title:'Our match organiser',why:'Use your database coursework for your friends.',steps:[step,{...step,title:'Find players without teams'},{...step,title:'Handle a duplicate player'}]};
const feedback={noticed:'You described a foreign key.',improve:'Show how an unmatched player is represented.',question:'Can the team reference be empty?',next:{...step,title:'Try an unmatched player'},sourceIds:[]};
const create=():BuildInputType=>({action:'create',version:0,requestId:randomUUID(),idea:'A football organiser',subject:'Databases',minutes:15});
test('create, attempt, explicit next step, pause and export preserve the actual work',()=>{
 const s=initialWorkspace(false),input=create();applyBuild(s,input,plan);assert.equal(s.build?.project?.attempts.length,0);assert.equal(s.build?.version,1);
 const submit:BuildInputType={action:'submit',requestId:randomUUID(),version:1,text:'I put team_id in the player table.'};applyBuild(s,submit,feedback);
 assert.equal(s.build?.project?.current.title,step.title);assert.equal(s.build?.project?.awaitingNext,true);assert.equal(s.build?.project?.attempts[0].text,submit.text);
 assert.throws(()=>assertBuildInput(s,{...submit,version:2,requestId:randomUUID()}),/BUILD_ADVANCE/);
 applyBuild(s,{action:'advance',requestId:randomUUID(),version:2});assert.equal(s.build?.project?.current.title,feedback.next.title);
 assert.equal(s.build?.project?.attempts[0].step.title,step.title);
 applyBuild(s,{action:'pause',requestId:randomUUID(),version:3});assert.throws(()=>assertBuildInput(s,{...submit,version:4,requestId:randomUUID()}),/BUILD_PAUSED/);
 assert.ok(JSON.stringify(buildSnapshot(s)).includes(submit.text));assert.equal(s.observations.length,0,'feedback must not silently become an assessed skill');
});
test('replays do not create duplicate work; changed input and stale tabs are rejected',()=>{
 const s=initialWorkspace(false),input=create();applyBuild(s,input,plan);applyBuild(s,input,plan);assert.equal(s.build?.version,1);assert.equal(buildReplay(s,input),true);
 assert.throws(()=>buildReplay(s,{...input,idea:'Changed'} as BuildInputType),/BUILD_STALE/);
 assert.throws(()=>applyBuild(s,{action:'pause',requestId:randomUUID(),version:0}),/BUILD_STALE/);
 applyBuild(s,{action:'delete',requestId:randomUUID(),version:1});assert.equal(s.build?.project,null);applyBuild(s,input,plan);assert.equal(s.build?.project,null,'old create replay must not resurrect a deleted project');
});
test('foreign journal records and invented model source IDs cannot enter a build',()=>{
 const s=initialWorkspace(false);applyBuild(s,create(),plan);
 assert.throws(()=>buildSources(s,'teams','foreign-entry'),/BUILD_EVIDENCE_MISSING/);
 const submit:BuildInputType={action:'submit',requestId:randomUUID(),version:1,text:'A player belongs to a team.'};
 assert.throws(()=>applyBuild(s,submit,{...feedback,sourceIds:['invented']}),/BUILD_SOURCE_INVALID/);assert.equal(s.build?.version,1);assert.equal(s.build?.project?.attempts.length,0);
});

test('removing journal evidence clears copied references and dependent feedback without deleting a separate attempt',async()=>{
 const {removeBuildEvidence}=await import('../lib/student-build');
 const s=initialWorkspace(false);s.evidence={entries:[{id:'owned-entry',createdAt:'2026-10-29T00:00:00Z',activityDate:null,kind:'evidence',reported:{activity:'Private schema',explanation:'A private attachment description'},observed:{artifactShows:'A diagram',attachments:[]},modelFeedback:'Old interpretation',uncertainty:'',nextSuggestion:''}]};applyBuild(s,create(),plan);
 const sources=buildSources(s,'schema','owned-entry'),submit:BuildInputType={action:'submit',version:1,requestId:randomUUID(),text:'My separate attempt says a team has many players.',evidenceId:'owned-entry'};
 applyBuild(s,submit,{...feedback,sourceIds:['selected-owned-entry']},sources);
 assert.equal(s.build?.project?.attempts[0].sources[0].excerpt,'','source text should not be duplicated into project storage');
 assert.match(buildSnapshot(s).build.project!.attempts[0].sources[0].excerpt,/private attachment/);
 removeBuildEvidence(s,'owned-entry');s.evidence.entries=[];
 const after=buildSnapshot(s);assert.equal(after.build.project?.attempts[0].sources.length,0);assert.equal(after.build.project?.awaitingNext,false);assert.equal(after.build.project?.attempts[0].text,submit.text);assert.ok(!JSON.stringify(after).includes('private attachment description'));
});


test('generation contracts constrain chosen time and the available source IDs before inference',()=>{
 assert.equal(buildPlanContract(15).safeParse(plan).success,true);
 assert.equal(buildPlanContract(15).safeParse({...plan,steps:[{...step,minutes:30},step,step]}).success,false);
 assert.equal(buildFeedbackContract(15,[]).safeParse(feedback).success,true);
 assert.equal(buildFeedbackContract(15,[]).safeParse({...feedback,sourceIds:['invented']}).success,false);
 assert.equal(buildFeedbackContract(15,['real']).safeParse({...feedback,sourceIds:['real']}).success,true);
 assert.equal(buildFeedbackContract(15,['real']).safeParse({...feedback,next:{...step,minutes:30}}).success,false);
});
