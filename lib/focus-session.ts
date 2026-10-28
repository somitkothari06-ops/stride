import { randomUUID } from "node:crypto";
import type { Workspace } from "./types";
import type { EvidenceEntry } from "./evidence";
import { MAX_EVIDENCE_ENTRIES } from "./evidence";

// A focused session is a resumable marker in the workspace state, not a timer:
// it survives reloads because the state lives on the server, and closing it is
// always the student's own decision. Nothing here submits answers, runs code
// or claims anything about how much was learned.

export const MIN_FOCUS_MINUTES = 15;
export const MAX_FOCUS_MINUTES = 240;

export type FocusSession = {
  id: string;
  title: string;
  outcomeId: string | null;
  materialId: string | null;
  minutes: number;
  startedAt: string;
  pausedAt: string | null;
  closedAt: string | null;
};

export type Continuation = {
  id: string;
  createdAt: string;
  kind: "saved" | "transfer";
  prompt: string;
  note: string;
  sourceEntryIds: string[];
  variant: number;
  skipped: boolean;
};

export type ReturnCard =
  | { kind: "saved"; prompt: string; note: string }
  | { kind: "transfer"; question: string };

function trimmed(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function startFocus(
  state: Workspace,
  input: { title: string; minutes: number; outcomeId?: unknown; materialId?: unknown },
  now = new Date().toISOString(),
) {
  if (state.focus && !state.focus.closedAt) throw new Error("FOCUS_ACTIVE");
  const title = trimmed(input.title, 160);
  if (!title) throw new Error("INVALID_REQUEST");
  const minutes = input.minutes;
  if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < MIN_FOCUS_MINUTES || minutes > MAX_FOCUS_MINUTES)
    throw new Error("INVALID_REQUEST");
  const outcomeId = input.outcomeId ? String(input.outcomeId) : null;
  if (outcomeId && !state.works.some((work) => work.id === outcomeId))
    throw new Error("NOT_FOUND");
  const materialId = input.materialId ? String(input.materialId) : null;
  if (materialId && !(state.materials || []).some((material) => material.id === materialId))
    throw new Error("NOT_FOUND");
  state.returnCard=null;
  state.focus = {
    id: randomUUID(),
    title,
    outcomeId,
    materialId,
    minutes,
    startedAt: now,
    pausedAt: null,
    closedAt: null,
  };
  state.revision++;
  return state.focus;
}

// pause/resume/close all carry the focusId the client saw. A mismatch means
// the client is acting on a different (typically newer or already closed)
// session than the one in saved state, and must be refused instead of
// silently operating on whatever session happens to be open now.
function activeFocus(state: Workspace, focusId: unknown) {
  const focus = state.focus;
  if (!focus) throw new Error("FOCUS_NOT_FOUND");
  if (focus.id !== focusId) throw new Error("FOCUS_NOT_FOUND");
  return focus;
}

export function pauseFocus(state: Workspace, focusId: string, now = new Date().toISOString()) {
  const focus = activeFocus(state, focusId);
  if (focus.closedAt) throw new Error("FOCUS_NOT_FOUND");
  focus.pausedAt = now;
  state.revision++;
}

export function resumeFocus(state: Workspace, focusId: string) {
  const focus = activeFocus(state, focusId);
  if (focus.closedAt) throw new Error("FOCUS_NOT_FOUND");
  focus.pausedAt = null;
  state.revision++;
}

function sessionEntries(state: Workspace, focusId: string): EvidenceEntry[] {
  return (state.evidence?.entries || []).filter((entry) => entry.focusId === focusId);
}

// Closing records a compact, student-reviewed progress entry in the journal
// and one continuation point. The summary is the student's own words; the
// continuation only points back to what was actually recorded.
export function closeFocus(
  state: Workspace,
  input: { focusId: string; summary: string; nextStep?: unknown },
  now = new Date().toISOString(),
): Continuation | null {
  const focus = activeFocus(state, input.focusId);
  // Replaying close on the SAME already-closed focusId returns the recorded
  // outcome without adding a second entry; only a mismatched id is refused.
  if (focus.closedAt) return state.returnCard ?? null;
  const summary = trimmed(input.summary, 600);
  if (!summary) throw new Error("INVALID_REQUEST");
  const nextStep = trimmed(input.nextStep, 300);
  // The journal cap applies to session closes exactly as it does to evidence
  // commits: a full journal cannot silently gain a 61st entry.
  if ((state.evidence?.entries.length || 0) >= MAX_EVIDENCE_ENTRIES)
    throw new Error("EVIDENCE_LIMIT");
  const entries = sessionEntries(state, focus.id);
  const entry: EvidenceEntry = {
    id: randomUUID(),
    createdAt: now,
    activityDate: null,
    kind: "session",
    reported: { activity: `Focused session: ${focus.title}`, explanation: summary },
    observed: { artifactShows: "", attachments: [] },
    modelFeedback: "",
    uncertainty: "",
    nextSuggestion: nextStep,
    focusId: focus.id,
  };
  state.evidence = { entries: [...(state.evidence?.entries || []), entry] };
  const carry = nextStep || entries.findLast((item) => item.nextSuggestion)?.nextSuggestion || "";
  const card: Continuation = {
    id: randomUUID(),
    createdAt: now,
    kind: "saved",
    prompt: `Next time, start by picking up “${focus.title}”.`,
    note: carry
      ? carry
      : "Open your journal entry from this session and read your own explanation once before continuing.",
    sourceEntryIds: [...entries.map((item) => item.id), entry.id],
    variant: 0,
    skipped: false,
  };
  state.returnCard = card;
  focus.closedAt = now;
  state.revision++;
  return card;
}

const transferTemplates = [
  (topic: string) => `Explain “${topic}” in your own words, as if to a classmate who missed the class.`,
  (topic: string) => `Try one new example using “${topic}” without opening your notes, then check one detail against them.`,
  (topic: string) => `Write the one sentence you would put at the top of a revision card for “${topic}”.`,
];

function topicOf(entry: EvidenceEntry) {
  const topic = entry.reported.activity.replace(/^focused session:\s*/i, "").trim();
  return topic.length > 80 ? topic.slice(0, 77) + "…" : topic || "what you studied";
}

// The return view shows either the one saved continuation or a small ungraded
// transfer question drawn from the student's confirmed record. There is no
// proficiency score and no memory guarantee anywhere in this output. A skipped
// card is hidden outright, and an empty journal shows nothing at all rather
// than inventing generic practice the student never recorded.
export function returnCard(state: Workspace): ReturnCard | null {
  const card = state.returnCard;
  if (card===null || card?.skipped) return null;
  if (card?.kind === "saved") return { kind: "saved", prompt: card.prompt, note: card.note };
  const latest = (state.evidence?.entries || []).at(-1);
  if (!latest) return null;
  const variant = Number.isInteger(card?.variant) ? card!.variant : 0;
  const template = transferTemplates[variant % transferTemplates.length];
  return { kind: "transfer", question: template(topicOf(latest)) };
}

export function skipReturn(state: Workspace) {
  const latest=(state.evidence?.entries||[]).at(-1);
  const card = state.returnCard || (latest?{id:randomUUID(),createdAt:new Date().toISOString(),kind:"transfer" as const,prompt:"",note:"",sourceEntryIds:[latest.id],variant:0,skipped:false}:null);
  if (!card) return;
  state.returnCard = { ...card, skipped: true };
  state.revision++;
}

// Change always produces a safe, valid transfer state: it re-activates a
// skipped card as a genuine transfer question and rotates the variant, so a
// stored generic transfer card keeps working even after reloads or restores.
export function changeReturn(state: Workspace) {
  const latest=(state.evidence?.entries||[]).at(-1);
  const card = state.returnCard || (latest?{id:randomUUID(),createdAt:new Date().toISOString(),kind:"transfer" as const,prompt:"",note:"",sourceEntryIds:[latest.id],variant:0,skipped:false}:null);
  if (!card) return;
  const current = Number.isInteger(card.variant) ? card.variant : 0;
  state.returnCard = {
    ...card,
    skipped: false,
    kind: "transfer",
    // Variant 0 was already shown as the fallback; move to a different one.
    variant: card.kind === "saved" ? 1 : (current + 1) % transferTemplates.length,
  };
  state.revision++;
}

// A saved continuation points at recorded work. When a referenced entry is
// deleted, the pointer must not dangle: the derived card is cleared.
export function clearReturnCardIfStale(state: Workspace) {
  const card = state.returnCard;
  if (!card) return;
  const surviving = new Set((state.evidence?.entries || []).map((entry) => entry.id));
  if (!card.sourceEntryIds.some((id) => !surviving.has(id))) return;
  state.returnCard = null;
  state.revision++;
}

// Continuing clears the card; the previous focus title is offered as a
// starting point without inventing any progress claim.
export function continueReturn(state: Workspace) {
  const title = state.focus?.title || "";
  state.returnCard = null;
  state.revision++;
  return { title };
}
