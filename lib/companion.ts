import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, getState } from "./store";
import { ConfirmSchema, type Workspace } from "./types";
import { emptyLifeContext, LifeContextSchema } from "./personal-context";

const evidence = z.string().trim().min(1).max(1000);
export const ProposalSchema = z.discriminatedUnion("destination", [
  z.object({ destination: z.literal("work"), evidence, title: z.string().trim().min(1).max(160), subject: z.string().trim().min(1).max(80), kind: z.enum(["assignment","exam","project","revision"]), dueDate: ConfirmSchema.shape.dueDate, text: z.string().max(1000), uncertainty: z.string().max(500) }),
  z.object({ destination: z.literal("thought"), evidence, text: z.string().trim().min(1).max(6000) }),
  z.object({ destination: z.literal("profile"), evidence, field: z.enum(["story","experience","interests","ambitions","constraints","learningPreferences"]), text: z.string().trim().min(1).max(6000) }),
]);
export const ProposalsSchema = z.array(ProposalSchema).min(1).max(6);
export type Proposal = z.infer<typeof ProposalSchema>;
export function conservativeCapture(source: string): Proposal[] {
  return [{ destination: "thought", text: source.trim(), evidence: source.trim().slice(0,1000) }];
}
export function checkCaptureEvidence(source: string, proposals: Proposal[]) {
  if (proposals.some(proposal => !source.includes(proposal.evidence))) throw new Error("CAPTURE_EVIDENCE_INVALID");
}
export function applyCapture(state: Workspace, proposals: Proposal[], source: string, now = new Date().toISOString()) {
  let changesContext = false;
  for (const proposal of proposals) {
    if (proposal.destination === "work") {
      if (state.works.length >= 60) throw new Error("INPUT_TOO_LARGE");
      state.works.push({ id: randomUUID(), title: proposal.title, subject: proposal.subject, kind: proposal.kind, dueDate: proposal.dueDate, summary: proposal.text, uncertainty: proposal.uncertainty, source, sourceType: "Companion", completed: false, createdAt: now });
      changesContext = true;
    } else if (proposal.destination === "thought") {
      if ((state.notes || []).length >= 100) throw new Error("INPUT_TOO_LARGE");
      state.notes = [...(state.notes || []), { id: randomUUID(), text: proposal.text, createdAt: now }];
    } else {
      const context = { ...emptyLifeContext, ...state.profile.lifeContext };
      const previous = context[proposal.field].trim();
      if (!previous.split("\n").some(line => line.trim() === proposal.text.trim())) context[proposal.field] = previous ? `${previous}\n${proposal.text}` : proposal.text;
      const result = LifeContextSchema.safeParse(context);
      if (!result.success) throw new Error("CAPTURE_PROFILE_FULL");
      state.profile.lifeContext = result.data;
      changesContext = true;
    }
  }
  if (changesContext) { state.revision++; state.prepared = null; state.direction = null; }
}
function database() {
  const connection = db();
  connection.exec("CREATE TABLE IF NOT EXISTS companion_reviews (id TEXT PRIMARY KEY, session TEXT NOT NULL, source TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, expires INTEGER NOT NULL, committed INTEGER NOT NULL DEFAULT 0)");
  return connection;
}
export function createCaptureReview(session: string, revision: number, source: string, proposals: Proposal[], mode: "live" | "guided") {
  checkCaptureEvidence(source, proposals);
  const connection = database(), now = Date.now();
  connection.prepare("DELETE FROM companion_reviews WHERE expires<=?").run(now);
  const pending = connection.prepare("SELECT count(*) AS n FROM companion_reviews WHERE session=? AND committed=0").get(session) as { n: number };
  if (pending.n >= 12) throw new Error("CAPTURE_LIMIT");
  const id = randomUUID();
  connection.prepare("INSERT INTO companion_reviews(id,session,source,payload,revision,expires) VALUES(?,?,?,?,?,?)").run(id,session,source,JSON.stringify(proposals),revision,now+900000);
  return { id, proposals, mode };
}
export function commitCapture(session: string, reviewId: string, proposed: Proposal[]) {
  const proposals = ProposalsSchema.parse(proposed), connection = database();
  connection.exec("BEGIN IMMEDIATE");
  try {
    const row = connection.prepare("SELECT * FROM companion_reviews WHERE id=? AND session=?").get(reviewId,session) as { source: string; payload:string; revision: number; expires: number; committed: number } | undefined;
    if (!row || row.expires <= Date.now()) throw new Error("CAPTURE_EXPIRED");
    const state = getState(session);
    if (!state) throw new Error("SESSION_EXPIRED");
    if (!row.committed) {
      if (state.revision !== row.revision) throw new Error("CAPTURE_STALE");
      const remaining=ProposalsSchema.parse(JSON.parse(row.payload));
      for(const proposal of proposals){const index=remaining.findIndex(original=>original.evidence===proposal.evidence);if(index<0)throw Error("CAPTURE_EVIDENCE_INVALID");remaining.splice(index,1);}
      // Destinations and fields stay editable; original source spans cannot be invented or duplicated.
      checkCaptureEvidence(row.source, proposals);
      applyCapture(state, proposals, row.source);
      connection.prepare("UPDATE sessions SET state=?,updated=? WHERE id=?").run(JSON.stringify(state),new Date().toISOString(),session);
      // Only an idempotency marker remains; discard unsaved original draft content.
      connection.prepare("UPDATE companion_reviews SET committed=1,source='',payload='[]' WHERE id=?").run(reviewId);
    }
    connection.exec("COMMIT");
    return state;
  } catch (error) { connection.exec("ROLLBACK"); throw error; }
}
