import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonSourceContract} from '../lib/lesson-sources';
import {validateLesson} from '../lib/document-study';
const fields={title:'Joins',prerequisite:'A table',explanation:'x'.repeat(100),workedExample:'x'.repeat(60),commonMistake:'Do not drop unmatched rows.',question:'Which player stays?',visualUncertainty:[]};
test('model-selected IDs resolve to literal passages and ignore fabricated replacement text',()=>{
 const pages=[{locator:'Slide 2',text:'A LEFT JOIN keeps every player, including those with no team.'}];
 const contract=lessonSourceContract(pages,['Page 2']);
 const value=contract.schema.parse({...fields,evidence:[{sourceId:contract.sources[0].id,description:'This is an invented quote.'}]});
 const resolved=validateLesson(contract.resolve(value),pages,['Page 2']);
 assert.equal(resolved.evidence[0].quote,pages[0].text);assert.equal(resolved.evidence[0].locator,'Slide 2');
 assert.equal(contract.schema.safeParse({...fields,evidence:[{sourceId:'foreign-source',description:''}]}).success,false);
});
test('visual descriptions remain labelled interpretations and need an actual supplied image',()=>{
 const contract=lessonSourceContract([],['Page 5']),source=contract.sources[0];
 const resolved=contract.resolve({...fields,evidence:[{sourceId:source.id,description:'Two labelled boxes connected by an arrow.'}]});
 assert.equal(resolved.evidence[0].basis,'image');assert.equal(validateLesson(resolved,[],['Page 5']),resolved);
 assert.throws(()=>validateLesson(resolved,[],[]),/STUDY_EVIDENCE_INVALID/);
 assert.throws(()=>lessonSourceContract([]),/STUDY_NO_TEXT/);
});
