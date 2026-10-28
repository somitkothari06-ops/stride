import test from 'node:test';import assert from 'node:assert/strict';
import {courseSourceAllowed,sealReference,checkReference} from '../lib/course-references';
test('course discovery only accepts HTTPS educational sources, without credentials or alternate ports',()=>{
 for(const u of ['https://ocw.mit.edu/courses/x/','https://nptel.ac.in/courses/1','https://www.cs.ox.ac.uk/teaching/'])assert.equal(courseSourceAllowed(u),true);
 for(const u of ['https://mit.edu.attacker.com/course','https://example.com/course','http://mit.edu/course','https://name:secret@mit.edu/course','https://mit.edu:3000/course','http://127.0.0.1'])assert.equal(courseSourceAllowed(u),false);
});
test('a discovered reference is bound to session, subject, exact text and a short expiry',()=>{
 const source={url:'https://ocw.mit.edu/courses/example/',title:'Synthetic networks course',excerpt:'Computer networks topics include protocols, packet routing and transport.',retrievedAt:'2026-10-28T00:00:00Z'};
 const sealed=sealReference('workspace-a','Computer networks',source,0,1000)!;
 assert.ok(sealed);assert.equal(checkReference('workspace-a',' computer NETWORKS ',sealed,1001).name,source.title);
 assert.throws(()=>checkReference('workspace-b','Computer networks',sealed,1001),/COURSE_REFERENCE_EXPIRED/);
 assert.throws(()=>checkReference('workspace-a','Operating systems',sealed,1001),/COURSE_REFERENCE_EXPIRED/);
 assert.throws(()=>checkReference('workspace-a','Computer networks',{...sealed,reference:{...sealed.reference,focus:'Invented text substituted for the source excerpt.'}},1001),/COURSE_REFERENCE_EXPIRED/);
 assert.throws(()=>checkReference('workspace-a','Computer networks',sealed,1000+15*60*1000+1),/COURSE_REFERENCE_EXPIRED/);
 assert.equal(sealReference('a','Networks',{...source,url:'https://example.com/lesson'},0),null);
 assert.equal(sealReference('a','Networks',{...source,url:'https://ocw.mit.edu/'+ 'x'.repeat(2100)},0),null);
});
