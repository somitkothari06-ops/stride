import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace} from '../lib/demo-workspace';
import {buildSnapshot} from '../lib/student-build';

test('each judge gets separate sample IDs and a coherent project with retained sources',()=>{
 const a=demoWorkspace(new Date('2026-10-29T08:00:00Z')),b=demoWorkspace(new Date('2026-10-29T08:00:00Z'));
 assert.equal(a.demo,true);assert.equal(a.sample,false);
 assert.notEqual(a.works[0].id,b.works[0].id);
 assert.notEqual(a.build?.project?.id,b.build?.project?.id);
 assert.equal(a.works[0].dueDate,'2026-10-30');
 assert.ok(a.materials?.some(m=>m.id===a.works[0].materialId));
 assert.ok(a.evidence?.entries.some(e=>e.id===a.build?.project?.attempts[0].evidenceId));
 assert.equal(buildSnapshot(a).build.project?.attempts.length,1);
 assert.equal(a.dailyPreferences?.enabled,false,'visiting a demo must not enable scheduled inference');
});

test('sample records disclose illustration and do not pretend to supply a real PDF or executed work',()=>{
 const s=demoWorkspace();
 assert.ok(s.materials?.every(m=>!m.storageKey));
 assert.ok(s.materials?.[0].warnings.some(w=>w.includes('not a college PDF')));
 assert.ok(s.pipThreads?.items.every(t=>t.chat.messages.filter(m=>m.role==='assistant').every(m=>m.text.startsWith('Example conversation:'))));
 assert.equal(s.evidence?.entries[0].assessment,'unassessed');
 assert.equal(s.evidence?.entries[0].observed.attachments.length,0);
});
