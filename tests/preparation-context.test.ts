import test from "node:test";
import assert from "node:assert/strict";
import { initialWorkspace } from "../lib/planner";
import { preparationContext } from "../lib/preparation-context";

test("practice without uploads exposes no unrelated IDs as possible course sources", () => {
  const state = initialWorkspace(true);
  const work = state.works[0];
  state.observations.push({ id:"observation-not-a-course", workId:work.id, title:"Synthetic attempt", answer:"A sample explanation", feedback:"A sample comment", method:"self-report", createdAt:new Date().toISOString(), removed:false });
  const context = preparationContext(state, work, []);
  assert.deepEqual(context.validCourseSourceIds, []);
  assert.deepEqual(context.previousAttempts, [{answer:"A sample explanation",feedback:"A sample comment"}]);
  assert.equal("id" in context.work, false);
  assert.equal(JSON.stringify(context).includes("observation-not-a-course"), false);
  assert.equal(context.work.source, work.source);
});

test("practice source namespace is restricted to supplied excerpt IDs", () => {
  const state = initialWorkspace(true);
  const excerpt = { id:"course-1", materialId:"material-private-id", title:"Synthetic notes", kind:"Lecture notes", locator:"Page 1", text:"An INNER JOIN returns matching rows." };
  const context = preparationContext(state, state.works[0], [excerpt]);
  assert.deepEqual(context.validCourseSourceIds, ["course-1"]);
  assert.equal(context.courseExcerpts[0].id, "course-1");
  assert.equal(context.courseExcerpts[0].text, excerpt.text);
  assert.equal(JSON.stringify(context).includes("material-private-id"), false);
});
test('removed attempts are not sent to the teaching model',()=>{const state=initialWorkspace(true),work=state.works[0];state.observations=[{id:'removed',workId:work.id,title:'Removed',answer:'Private removed answer',feedback:'Removed feedback',method:'self-report',createdAt:new Date().toISOString(),removed:true}];assert.deepEqual(preparationContext(state,work,[]).previousAttempts,[]);});
