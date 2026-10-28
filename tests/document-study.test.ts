import test from "node:test";
import assert from "node:assert/strict";
import { selectStudyPages,validateLesson,documentPageCount,type Lesson } from "../lib/document-study";
import type { CourseMaterial } from "../lib/course-types";
const material:CourseMaterial={id:"synthetic-doc",filename:"synthetic.pdf",title:"Synthetic course",subject:"Synthetic subject",kind:"Lecture notes",addedAt:"2026-10-27",warnings:[],coverage:{totalPages:191,processedPages:191,emptyPages:[],characters:400},pages:[{locator:"Page 1",text:"The first synthetic topic has its own mechanism."},{locator:"Page 190 · part 1",text:"A later synthetic topic uses a distinct mechanism."},{locator:"Page 190 · part 2",text:"The continuation preserves all reasoning steps."},{locator:"Page 191",text:"The final synthetic topic connects to a worked example."}]};
test("study can reach later PDF pages and includes all parts of the selected page",()=>{const selected=selectStudyPages(material,190,1);assert.equal(selected.pages.length,2);assert.equal(selected.total,191);assert.equal(selected.to,190);assert.ok(selected.pages.every(p=>p.locator.startsWith("Page 190")));assert.equal(documentPageCount(material),191);assert.throws(()=>selectStudyPages(material,200,1),/NOT_FOUND/);});
test("empty text and oversized teaching ranges fail without silently clipping",()=>{assert.throws(()=>selectStudyPages({...material,pages:[{locator:"Page 1",text:""}]},1,1),/STUDY_NO_TEXT/);assert.throws(()=>selectStudyPages({...material,pages:[{locator:"Page 1",text:"x".repeat(24001)}]},1,1),/STUDY_RANGE_TOO_LARGE/);});
test("lesson evidence must quote the selected pages, never other pages or invented text",()=>{const lesson={evidence:[{locator:"Page 190 · part 1",quote:"distinct mechanism"}]} as Lesson;assert.equal(validateLesson(lesson,selectStudyPages(material,190,1).pages),lesson);assert.throws(()=>validateLesson(lesson,selectStudyPages(material,1,1).pages),/STUDY_EVIDENCE_INVALID/);assert.throws(()=>validateLesson({evidence:[{locator:"Page 1",quote:"invented knowledge"}]} as Lesson,material.pages),/STUDY_EVIDENCE_INVALID/);});
test("visual claims require a supplied page image; scanned pages are not treated as readable text",()=>{
 const scanned={...material,pages:[{locator:"Page 1",text:""}]};assert.throws(()=>selectStudyPages(scanned,1,1),/STUDY_NO_TEXT/);assert.equal(selectStudyPages(scanned,1,1,true).pages.length,1);
 const visual={evidence:[{locator:"Page 1",quote:"A visible arrow joins two labelled boxes.",basis:"image"}]} as Lesson;
 assert.throws(()=>validateLesson(visual,scanned.pages),/STUDY_EVIDENCE_INVALID/);assert.equal(validateLesson(visual,scanned.pages,["Page 1"]),visual);
});

test("a long exact citation is validated in full before shortening its displayed excerpt",()=>{
 const text='A source sentence explains the mechanism. '.repeat(25);
 const lesson={evidence:[{locator:'Text section 1',quote:text,basis:'text'}]} as Lesson;
 const validated=validateLesson(lesson,[{locator:'Text section 1',text}]);
 assert.equal(validated.evidence[0].quote,text.slice(0,500));assert.equal(validated.evidence[0].excerptShortened,true);
 assert.equal(lesson.evidence[0].quote,text);
 const invented={evidence:[{locator:'Text section 1',quote:text.slice(0,550)+' invented tail',basis:'text'}]} as Lesson;
 assert.throws(()=>validateLesson(invented,[{locator:'Text section 1',text}]),/STUDY_EVIDENCE_INVALID/);
});
