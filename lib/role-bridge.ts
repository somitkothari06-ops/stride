import { z } from "zod";
import type { RoleSource, Workspace } from "./types";
import { personalContext } from "./personal-context";

// A source-grounded bridge between what the student has actually done and a
// role they are aiming at. Nothing in this module calls a model: it builds
// the bounded context a model plans from, and checks a model's returned plan
// against that same context. Recorded work is student-reported, never
// verified knowledge, and an empty history is a beginner context, not a
// diagnosis of missing ability.

export const BRIDGE_FACTS_PER_SOURCE = 3;
export const BRIDGE_MIN_FACT_CHARS = 8;
export const BRIDGE_MAX_FACT_CHARS = 220;
export const BRIDGE_MAX_RECORDS = 6;
// Overall safety bound on how many characters of source facts may enter one
// prompt context, whatever the source list size is.
const BRIDGE_FACT_CHAR_BUDGET = 6000;
const MAX_RECORD_ACTIVITY_CHARS = 160;
const MAX_RECORD_DETAIL_CHARS = 320;
const MAX_TOPIC_MATERIALS = 6;

// The model must cite facts by ID, not recopy the quote text; recopying
// exact excerpts is a known failure mode, so the context hands out stable
// unique IDs instead.
export type BridgeFact = {
  id: string;
  // 1-based index into the sources array passed to buildBridgeContext.
  sourceIndex: number;
  // An exact literal substring of that source's excerpt, 8..220 characters.
  text: string;
};

export type BridgeRecord = {
  id: string;
  activity: string;
  detail: string;
  createdAt: string;
  origin: "observation" | "work-journal";
  // Every record is student-reported context, never verified knowledge.
  status: "student-reported";
  verified: false;
};

// Coursework titles are topic labels only, kept separate from learner
// records and facts so a unit name can never look like a demonstration.
export type BridgeTopic = {
  materialId: string;
  title: string;
  subject: string;
  kind: string;
  note: string;
};

export type BridgeContext = {
  sourceFacts: BridgeFact[];
  learnerRecords: BridgeRecord[];
  hasRecords: boolean;
  courseTopics: BridgeTopic[];
  personalContext: ReturnType<typeof personalContext> | null;
  availableMinutes: number;
};

// Exact sentence spans of the original text. Whitespace inside each sentence
// is untouched and trailing/leading whitespace removed by trim leaves a
// contiguous inner substring, so substring membership in the source is
// preserved for every returned candidate.
function factCandidates(text: string): string[] {
  if (text.trim().length === 0) return [];
  const spans: [number, number][] = [];
  let start = 0;
  let index = 0;
  while (index < text.length) {
    const ch = text[index];
    if ((ch === "." || ch === "!" || ch === "?") && (index + 1 === text.length || /\s/.test(text[index + 1]))) {
      spans.push([start, index + 1]);
      index++;
      while (index < text.length && /\s/.test(text[index])) index++;
      start = index;
    } else {
      index++;
    }
  }
  if (start < text.length) spans.push([start, text.length]);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [from, to] of spans) {
    const candidate = text.slice(from, to).slice(0, BRIDGE_MAX_FACT_CHARS).trim();
    if (candidate.length < BRIDGE_MIN_FACT_CHARS || seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  // A class-note style excerpt with no sentence punctuation still yields at
  // most its own trimmed text, never any invented wording.
  if (!out.length) {
    const whole = text.trim().slice(0, BRIDGE_MAX_FACT_CHARS);
    if (whole.length >= BRIDGE_MIN_FACT_CHARS) out.push(whole);
  }
  return out;
}

function sourceFacts(sources: RoleSource[]): BridgeFact[] {
  const facts: BridgeFact[] = [];
  let budget = BRIDGE_FACT_CHAR_BUDGET;
  for (let index = 0; index < sources.length && budget >= BRIDGE_MIN_FACT_CHARS; index++) {
    const sourceIndex = index + 1;
    let picked = 0;
    for (const text of factCandidates(sources[index].excerpt)) {
      if (picked >= BRIDGE_FACTS_PER_SOURCE || budget < text.length) break;
      facts.push({ id: `fact-${sourceIndex}-${picked + 1}`, sourceIndex, text });
      picked++;
      budget -= text.length;
    }
  }
  return facts;
}

function observationRecords(state: Workspace): BridgeRecord[] {
  // Observation.removed is a hard deletion: removed work never re-enters.
  return state.observations
    .filter((observation) => !observation.removed)
    .map((observation): BridgeRecord | null => {
      const detail = [
        observation.answer ? `Attempt summary: ${observation.answer.slice(0, 180)}` : "",
        observation.feedback ? `${observation.method === "model-assessment" ? "Prior model feedback (not a grade)" : "Recorded note"}: ${observation.feedback.slice(0, 160)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, MAX_RECORD_DETAIL_CHARS);
      if (!detail) return null;
      return {
        id: observation.id,
        activity: observation.title.slice(0, MAX_RECORD_ACTIVITY_CHARS),
        detail,
        createdAt: observation.createdAt,
        origin: "observation" as const,
        status: "student-reported" as const,
        verified: false as const,
      };
    })
    .filter((record): record is BridgeRecord => record !== null);
}

function journalRecords(state: Workspace): BridgeRecord[] {
  return [...(state.evidence?.entries || [])].reverse().map((entry) => {
    const artifactNote = entry.observed.artifactShows
      ? `${entry.assessment === "unassessed" ? "Unassessed submission" : "Model interpretation of submission (not verified)"}: ${entry.observed.artifactShows.slice(0, 140)}`
      : "";
    const detail = [
      entry.reported.explanation ? `Student explanation: ${entry.reported.explanation.slice(0, 100)}` : "",
      artifactNote,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, MAX_RECORD_DETAIL_CHARS);
    return {
      id: `journal-${entry.id}`,
      activity: entry.reported.activity.slice(0, MAX_RECORD_ACTIVITY_CHARS),
      detail,
      createdAt: entry.createdAt,
      origin: "work-journal" as const,
      status: "student-reported" as const,
      verified: false as const,
    };
  });
}

function learnerRecords(state: Workspace, maxChars = 3600): BridgeRecord[] {
  const candidates = [...observationRecords(state), ...journalRecords(state)].sort(
    (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
  );
  const out: BridgeRecord[] = [];
  let budget = maxChars;
  for (const record of candidates) {
    if (out.length >= BRIDGE_MAX_RECORDS || budget < 80) break;
    const size = record.activity.length + record.detail.length;
    if (size > budget) continue;
    out.push(record);
    budget -= size;
  }
  return out;
}

function courseTopics(state: Workspace): BridgeTopic[] {
  return [...(state.materials || []).slice(-4).map((material) => ({
    materialId: material.id, title: material.title.slice(0,160), subject: material.subject.slice(0,80), kind: material.kind,
    note: "Coursework topic title, not evidence of ability",
  })), ...state.works.slice(-4).map(work => ({
    materialId: `work-${work.id}`, title: work.title.slice(0,160), subject: work.subject.slice(0,80), kind: work.kind,
    note: "Coursework topic title, not evidence of ability",
  }))].slice(0,MAX_TOPIC_MATERIALS);
}

export function buildBridgeContext(state: Workspace, sources: RoleSource[]): BridgeContext {
  const facts = sourceFacts(sources);
  const records = learnerRecords(state);
  return {
    sourceFacts: facts,
    learnerRecords: records,
    hasRecords: records.length > 0,
    courseTopics: courseTopics(state),
    personalContext: personalContext(state.profile.lifeContext),
    availableMinutes: state.profile.minutes,
  };
}

const BridgeStepSchema = z.strictObject({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(1400),
  deliverable: z.string().trim().min(1).max(500),
  why: z.string().trim().min(1).max(600),
  // One to three source-fact references per step; IDs only, never quotes.
  factIds: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
  recordIds: z.array(z.string().trim().min(1).max(120)).max(4).nullish().transform(ids=>ids??[]),
});

export const RoleBridgeSchema = z.strictObject({
  summary: z.string().trim().min(1).max(1200),
  startingPoint: z.string().trim().min(1).max(1200),
  recordIds: z.array(z.string().trim().min(1).max(120)).max(6).nullish().transform(ids=>ids??[]),
  steps: z.array(BridgeStepSchema).length(3),
});
// Provider output may include harmless extra fields. Drop them before applying
// the strict persisted contract; never display or trust generated source URLs.
export const RoleBridgeModelSchema=RoleBridgeSchema.strip().extend({steps:z.array(BridgeStepSchema.strip()).length(3)});
export type RoleBridge = z.infer<typeof RoleBridgeSchema>;

// Checks a model's plan against the same context that produced it. Unknown
// fact IDs (including any invented source reference sneaked in as a field), and
// unknown or removed learner record IDs are refused. Empty recordIds are
// always valid: an empty history is a beginner context, never treated here as
// missing ability.
export function validateBridge(result: RoleBridge, context: BridgeContext): RoleBridge {
  const parsed = RoleBridgeSchema.safeParse(result);
  if (!parsed.success) throw new Error("BRIDGE_INVALID");
  const bridge = parsed.data;
  const knownFacts = new Set(context.sourceFacts.map((fact) => fact.id));
  const knownRecords = new Set(context.learnerRecords.map((record) => record.id));
  for (const step of bridge.steps) {
    if (new Set(step.factIds).size !== step.factIds.length) throw new Error("BRIDGE_INVALID");
    if (step.factIds.some((id) => !knownFacts.has(id))) throw new Error("BRIDGE_INVALID");
    if (new Set(step.recordIds).size !== step.recordIds.length) throw new Error("BRIDGE_INVALID");
  }
  const cited = [...bridge.recordIds, ...bridge.steps.flatMap((step) => step.recordIds)];
  if (new Set(bridge.recordIds).size !== bridge.recordIds.length) throw new Error("BRIDGE_INVALID");
  if (cited.some((id) => !knownRecords.has(id))) throw new Error("BRIDGE_INVALID");
  const prose=(text:string)=>text.replace(/\b(?:fact|journal)[-‑–][a-z0-9‑–-]+\b/gi,match=>match.toLowerCase().startsWith("fact")?"the linked source":"your saved work");
  return {...bridge,summary:prose(bridge.summary),startingPoint:prose(bridge.startingPoint),steps:bridge.steps.map(step=>({...step,title:prose(step.title),description:prose(step.description),deliverable:prose(step.deliverable),why:prose(step.why)}))};
}

export function invalidateRoleBridge(state: Workspace) {
  if(!state.direction)return;
  state.direction={...state.direction,bridge:undefined,bridgeFacts:undefined,bridgeRecords:undefined,bridgeContextKey:undefined,requirements:[],courseConnection:undefined,nextMove:undefined,mode:"guided",explanationPending:true,summary:"Your work changed. Let’s update your path."};
}
