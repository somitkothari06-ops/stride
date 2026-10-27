import test from "node:test";
import assert from "node:assert/strict";
import { MaterialSchema, courseExcerpts, type CourseMaterial } from "../lib/course-types";
import { initialWorkspace } from "../lib/planner";
const material: CourseMaterial = { id: "course-a", title: "SQL syllabus", subject: "DBMS", kind: "Syllabus", filename: "syllabus.txt", addedAt: "2026-10-25", warnings: [], pages: [{ locator: "Page 1", text: "Database systems: SQL joins, grouping and query plans." }] };
test("course context keeps subjects separate, accepts DBMS alias and bounds prompt size", () => {
  const unrelated = { ...material, id: "course-b", subject: "Operating systems", pages: [{ locator: "Page 1", text: "Operating systems include scheduling and SQL is not taught here." }] };
  const result = courseExcerpts([material, unrelated], "Database systems", "SQL joins");
  assert.equal(result.length, 1);
  assert.equal(result[0].materialId, material.id);
  assert.deepEqual(courseExcerpts([unrelated], "Database systems"), []);
  const long = { ...material, pages: Array.from({ length: 10 }, (_, i) => ({ locator: `Page ${i + 1}`, text: "SQL ".repeat(1000) })) };
  assert.ok(courseExcerpts([long], "DBMS").reduce((sum, p) => sum + p.text.length, 0) <= 10000);
});
test("material validation rejects oversized or empty document context", () => {
  assert.ok(MaterialSchema.safeParse(material).success);
  assert.equal(MaterialSchema.safeParse({ ...material, pages: [] }).success, false);
  assert.equal(MaterialSchema.safeParse({ ...material, pages: Array.from({ length: 151 }, (_, i) => ({ locator: `Page ${i}`, text: "x".repeat(4000) })) }).success, false);
});
test("starting fresh clears confirmed course materials as well as coursework", () => {
  const current = initialWorkspace();
  current.materials = [material];
  Object.assign(current, initialWorkspace(false));
  assert.deepEqual(current.materials, []);
  assert.deepEqual(current.works, []);
});
