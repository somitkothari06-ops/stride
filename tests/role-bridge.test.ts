import test from "node:test";
import assert from "node:assert/strict";
import { initialWorkspace } from "../lib/planner";
import { buildBridgeContext, RoleBridgeModelSchema, RoleBridgeSchema, validateBridge, invalidateRoleBridge, type RoleBridge } from "../lib/role-bridge";
import type { Observation, RoleSource, Workspace } from "../lib/types";
import type { EvidenceEntry } from "../lib/evidence";

function workspace(): Workspace {
  const state = initialWorkspace(false);
  state.profile.minutes = 45;
  state.profile.lifeContext = {
    story: "Second-year student.",
    experience: "",
    interests: "SQL",
    ambitions: "",
    constraints: "",
    learningPreferences: "",
    direction: "some-ideas",
  };
  return state;
}

function observation(id: string, createdAt: string, removed = false): Observation {
  return {
    id,
    workId: `work-${id}`,
    title: "SQL join analysis",
    answer: "Compared INNER and LEFT JOIN on my coursework data.",
    feedback: "Consider unmatched rows.",
    method: "self-report",
    createdAt,
    removed,
  };
}

function journalEntry(id: string, createdAt: string): EvidenceEntry {
  return {
    id,
    createdAt,
    activityDate: null,
    kind: "evidence",
    assessment: "unassessed",
    reported: { activity: "SQL joins practice", explanation: "My attempt at joins." },
    observed: { artifactShows: "A query is shown.", attachments: [] },
    modelFeedback: "Consider unmatched rows.",
    uncertainty: "",
    nextSuggestion: "",
  };
}

const sources: RoleSource[] = [
  {
    url: "https://example.com/junior-analyst",
    title: "Junior data analyst role",
    excerpt:
      "Requirements include writing SQL queries against relational tables. You summarize findings for a small team. Bonuses: exposure to dashboards or reporting tools.",
    retrievedAt: "2026-10-27",
  },
  {
    url: "https://example.com/junior-backend",
    title: "Junior backend role",
    excerpt: "Build and maintain REST services with Node.js.",
    retrievedAt: "2026-10-27",
  },
];

function bridgeFor(factId: string, recordIds: string[] = []): RoleBridge {
  const step = {
    title: "Try one join",
    description: "Run one small join query on your own coursework data.",
    deliverable: "One join query file",
    why: "Matches the SQL requirement in the sources.",
    factIds: [factId],
    recordIds,
  };
  return {
    summary: "Bridge from SQL coursework toward analyst roles.",
    startingPoint: "You described small SQL practice; nothing here is verified, and a beginner start is fine.",
    recordIds: [...recordIds],
    steps: [
      step,
      { ...step, title: "Explain one result", description: "Explain why unmatched rows disappear in a LEFT JOIN.", deliverable: "Three sentences", why: "Observed practice points at the same requirement." },
      { ...step, title: "Summarize one finding", description: "Describe one query result in plain language.", deliverable: "One paragraph", why: "Sources ask for summarizing findings." },
    ],
  };
}

const asBridge = (value: unknown) => value as RoleBridge;

test("source facts are exact substrings of their own sources, bounded and ID-based", () => {
  const context = buildBridgeContext(workspace(), sources);
  assert.equal(new Set(context.sourceFacts.map((fact) => fact.id)).size, context.sourceFacts.length);
  for (const fact of context.sourceFacts) {
    assert.match(fact.id, /^fact-\d+-\d+$/);
    assert.ok(fact.sourceIndex >= 1 && fact.sourceIndex <= sources.length);
    assert.ok(sources[fact.sourceIndex - 1].excerpt.includes(fact.text), "fact text must be a substring of its source");
    assert.ok(fact.text.length >= 8 && fact.text.length <= 220);
  }
  assert.deepEqual(
    context.sourceFacts.filter((fact) => fact.sourceIndex === 1).map((fact) => fact.text),
    [
      "Requirements include writing SQL queries against relational tables.",
      "You summarize findings for a small team.",
      "Bonuses: exposure to dashboards or reporting tools.",
    ],
  );
  assert.deepEqual(
    context.sourceFacts.filter((fact) => fact.sourceIndex === 2).map((fact) => fact.text),
    ["Build and maintain REST services with Node.js."],
  );
});

test("at most three facts are taken per source", () => {
  const wide: RoleSource = {
    url: "https://example.com/wide",
    title: "Wide listing",
    excerpt:
      "First requirement one. Second requirement about dashboards weekly. Third requirement around SQL joins. Fourth requirement on reporting. Fifth never enters context.",
    retrievedAt: "2026-10-27",
  };
  const context = buildBridgeContext(workspace(), [wide]);
  assert.deepEqual(context.sourceFacts.map((fact) => fact.sourceIndex), [1, 1, 1]);
  assert.equal(context.sourceFacts.length, 3);
  assert.ok(!context.sourceFacts.some((fact) => fact.text.includes("Fifth")));
});

test("a long unpunctuated source is truncated but stays an exact substring", () => {
  const long: RoleSource = {
    url: "https://example.com/long",
    title: "Long text",
    excerpt: "Reviews applicant data pipelines, reports and small automation scripts ".repeat(8),
    retrievedAt: "2026-10-27",
  };
  const [fact] = buildBridgeContext(workspace(), [long]).sourceFacts;
  assert.ok(fact);
  assert.ok(fact.text.length >= 8 && fact.text.length <= 220);
  assert.ok(long.excerpt.includes(fact.text));
});

test("a source with no usable excerpt yields no facts instead of invented ones", () => {
  const context = buildBridgeContext(workspace(), [{ url: "https://example.com/x", title: "Stub", excerpt: "Short.", retrievedAt: "2026-10-27" }]);
  assert.deepEqual(context.sourceFacts, []);
});

test("records come from visible observations and the journal, never removed work", () => {
  const state = workspace();
  state.observations = [
    observation("obs-late", "2026-10-28T09:00:00.000Z"),
    observation("obs-early", "2026-10-20T09:00:00.000Z"),
    observation("obs-removed", "2026-10-29T09:00:00.000Z", true),
  ];
  state.evidence = { entries: [journalEntry("entry-1", "2026-10-26T08:00:00.000Z")] };
  const context = buildBridgeContext(state, sources);
  assert.deepEqual(
    context.learnerRecords.map((record) => record.id),
    ["obs-late", "journal-entry-1", "obs-early"],
  );
  const journal = context.learnerRecords.find((record) => record.origin === "work-journal");
  assert.ok(journal);
  assert.equal(journal.activity,"SQL joins practice");
  assert.match(journal.detail,/Student explanation:/);
  assert.match(journal.detail,/Unassessed submission:/);
  assert.ok(context.learnerRecords.every((record) => record.status === "student-reported" && record.verified === false));
  assert.ok(context.learnerRecords.every((record) => record.activity.length <= 160 && record.detail.length <= 320));
});

test("learner records are capped to the recent bound", () => {
  const state = workspace();
  state.observations = Array.from({ length: 7 }, (_, index) =>
    observation(`obs-${index}`, `2026-10-${10 + index}T09:00:00.000Z`),
  );
  const context = buildBridgeContext(state, sources);
  assert.equal(context.learnerRecords.length, 6);
  assert.equal(context.learnerRecords[0].id, "obs-6");
});

test("an empty history is a beginner context: no records, valid empty references", () => {
  const context = buildBridgeContext(workspace(), sources);
  assert.deepEqual(context.learnerRecords, []);
  assert.equal(context.hasRecords, false);
  assert.equal(validateBridge(bridgeFor(context.sourceFacts[0].id), context).recordIds.length, 0);
  assert.throws(() => validateBridge(asBridge({ ...bridgeFor("fact-1-1"), recordIds: ["fact-1-1"] }), context), /BRIDGE_INVALID/);
});

test("the schema enforces the documented bounds", () => {
  const base = bridgeFor("fact-1-1");
  assert.doesNotThrow(() => RoleBridgeSchema.parse(base));
  for (const broken of [
    { ...base, summary: "x".repeat(1201) },
    { ...base, startingPoint: "x".repeat(1201) },
    { ...base, recordIds: ["a", "b", "c", "d", "e", "f", "g"] },
    { ...base, recordIds: [""] },
    { ...base, steps: base.steps.slice(0, 2) },
    { ...base, steps: [...base.steps, base.steps[0]] },
    { ...base, steps: base.steps.map((step) => ({ ...step, factIds: ["a", "b", "c", "d"] })) },
    { ...base, steps: base.steps.map((step) => ({ ...step, factIds: [] })) },
    { ...base, steps: base.steps.map((step) => ({ ...step, recordIds: ["r1", "r2", "r3", "r4", "r5"] })) },
    { ...base, steps: base.steps.map((step) => ({ ...step, title: "x".repeat(141) })) },
    { ...base, steps: base.steps.map((step) => ({ ...step, description: "x".repeat(1401) })) },
    { ...base, steps: base.steps.map((step) => ({ ...step, deliverable: "x".repeat(501) })) },
    { ...base, steps: base.steps.map((step) => ({ ...step, why: "x".repeat(601) })) },
  ]) assert.throws(() => RoleBridgeSchema.parse(broken));
});

test("unknown extra fields, including invented source references, are refused", () => {
  const sneaked = { ...bridgeFor("fact-1-1"), sourceQuotes: [{ sourceIndex: 1, quote: "SQL queries" }] };
  assert.throws(() => RoleBridgeSchema.parse(sneaked));
  assert.throws(() => RoleBridgeSchema.parse({ ...bridgeFor("fact-1-1"), sources: ["https://example.com"] }));
});

test("validateBridge refuses unknown fact and learner references", () => {
  const context = buildBridgeContext(workspace(), sources);
  const unknownFact = asBridge({
    ...bridgeFor("fact-1-1"),
    steps: bridgeFor("fact-1-1").steps.map((step) => ({ ...step, factIds: ["fact-9-9"] })),
  });
  assert.throws(() => validateBridge(unknownFact, context), /BRIDGE_INVALID/);
  assert.throws(() => validateBridge(bridgeFor("fact-1-1", ["ghost-record"]), context), /BRIDGE_INVALID/);
  assert.throws(() => validateBridge(bridgeFor("fact-1-1", ["journal-deleted"]), context), /BRIDGE_INVALID/);
  const duplicated = asBridge({
    ...bridgeFor("fact-1-1"),
    steps: bridgeFor("fact-1-1").steps.map((step) => ({ ...step, factIds: ["fact-1-1", "fact-1-1"] })),
  });
  assert.throws(() => validateBridge(duplicated, context), /BRIDGE_INVALID/);
});

test("a removed observation ID is refused as unknown history", () => {
  const state = workspace();
  state.observations = [observation("obs-gone", "2026-10-28T09:00:00.000Z", true)];
  const context = buildBridgeContext(state, sources);
  assert.equal(context.hasRecords, false);
  assert.throws(() => validateBridge(bridgeFor("fact-1-1", ["obs-gone"]), context), /BRIDGE_INVALID/);
});

test("a fully grounded plan with known references validates unchanged", () => {
  const state = workspace();
  state.observations = [observation("obs-1", "2026-10-28T09:00:00.000Z")];
  state.evidence = { entries: [journalEntry("entry-1", "2026-10-27T08:00:00.000Z")] };
  const context = buildBridgeContext(state, sources);
  assert.equal(context.hasRecords, true);
  const bridge = bridgeFor("fact-1-1", ["obs-1", "journal-entry-1"]);
  assert.deepEqual(validateBridge(bridge, context), bridge);
});

test("course topics, personal context and minutes are separate from proof", () => {
  const state = workspace();
  state.materials = [
    {
      id: "mat-1",
      addedAt: "2026-10-01",
      title: "Database Systems: SQL and joins",
      subject: "DBMS",
      kind: "Lecture notes",
      filename: "dbms-notes.pdf",
      pages: [{ locator: "p1", text: "Joins" }],
      warnings: [],
    },
  ];
  const context = buildBridgeContext(state, sources);
  const topic = context.courseTopics.find((item) => item.materialId === "mat-1");
  assert.ok(topic);
  assert.equal(topic.title, "Database Systems: SQL and joins");
  assert.match(topic.note, /not evidence of ability/);
  assert.ok(!context.learnerRecords.some((record) => record.id === "mat-1"));
  assert.equal(context.availableMinutes, 45);
  assert.equal(context.personalContext?.direction, "some-ideas");
});


test("journal changes clear derived claims while preserving reusable sources",()=>{
 const state=workspace();const context=buildBridgeContext(state,sources);
 state.direction={searchId:"saved-search",role:"Data",sources,summary:"Old",requirements:[],mode:"live",updatedAt:"2026-10-29",bridge:bridgeFor("fact-1-1"),bridgeFacts:context.sourceFacts,bridgeRecords:[{id:"deleted",activity:"Old record"}],bridgeContextKey:"old"};
 invalidateRoleBridge(state);
 assert.equal(state.direction.bridge,undefined);assert.equal(state.direction.bridgeRecords,undefined);assert.equal(state.direction.bridgeContextKey,undefined);assert.equal(state.direction.mode,"guided");assert.equal(state.direction.explanationPending,true);assert.deepEqual(state.direction.sources,sources);
});

test("a useful explanation modestly above the prompt target remains intact",()=>{const bridge=bridgeFor("fact-1-1");bridge.steps[0].description="Explain a repeated failed login. ".repeat(18);assert.equal(validateBridge(bridge,buildBridgeContext(workspace(),sources)).steps[0].description,bridge.steps[0].description.trim());});

test("absent or null optional learner references become empty without invented work",()=>{const bridge=bridgeFor("fact-1-1");const parsed=RoleBridgeSchema.parse({...bridge,recordIds:null,steps:bridge.steps.map(step=>({...step,recordIds:undefined}))});assert.deepEqual(parsed.recordIds,[]);assert.ok(parsed.steps.every(step=>step.recordIds.length===0));assert.doesNotThrow(()=>validateBridge(parsed,buildBridgeContext(workspace(),sources)));});

test("internal source and journal identifiers never leak into student prose",()=>{const b=bridgeFor("fact-1-1");b.startingPoint="Build on journal‑abcd1234 and journal-test-123.";b.steps[0].description="See fact‑1‑1 or fact-1-1.";const clean=validateBridge(b,buildBridgeContext(workspace(),sources));assert.doesNotMatch(clean.startingPoint,/journal/i);assert.doesNotMatch(clean.steps[0].description,/fact[-‑]/i);assert.deepEqual(clean.steps[0].factIds,["fact-1-1"]);});

test("provider-only extra fields are dropped, never trusted or persisted",()=>{const b=bridgeFor("fact-1-1");const parsed=RoleBridgeModelSchema.parse({...b,sources:["https://invented.example"],steps:b.steps.map(step=>({...step,sourceUrl:"https://invented.example"}))});assert.equal("sources"in parsed,false);assert.ok(parsed.steps.every(step=>!("sourceUrl"in step)));assert.doesNotThrow(()=>validateBridge(parsed,buildBridgeContext(workspace(),sources)));});
