"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { courseBenchmarks, type MaterialDraft, type CourseExcerpt } from "@/lib/course-types";
import type { Workspace } from "@/lib/types";

type Bridge = {
  comparison: { localFocus: { point: string; sourceId: string; quote: string }[]; externalFocus: { point: string; quote: string }[]; bridgeExercise: string; caution: string };
  excerpts: CourseExcerpt[];
  benchmark: { name: string; url: string; checkedAt: string };
};
export default function CourseLibrary({ state, onState }: { state: Workspace; onState: (state: Workspace) => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [seal, setSeal] = useState<{ proof: string; expiresAt: number } | null>(null);
  const [subject, setSubject] = useState("");
  const [benchmark, setBenchmark] = useState("berkeley-db");
  const [bridge, setBridge] = useState<Bridge | null>(null);
  async function send(url: string, options: RequestInit, label: string) {
    if (busy) return null;
    setBusy(label); setError("");
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "This request didn't complete. Try again.");
      return result;
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't connect."); return null; }
    finally { setBusy(""); }
  }
  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await send("/api/materials", { method: "POST", body: form }, "Reading the document text");
    if (result) { setDraft(result.candidate); setSeal({ proof: result.proof, expiresAt: result.expiresAt }); }
  }
  async function save() {
    const result = await send("/api/materials", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidate: draft, ...seal }) }, "Saving confirmed course context");
    if (result) { onState(result.state); setDraft(null); setBridge(null); }
  }
  return <div className="course-library"><datalist id="course-subjects">{[...new Set(state.works.map((w) => w.subject))].map((s) => <option key={s} value={s} />)}</datalist>
    <p className="modal-description">Add your syllabus, notes, slides or past questions. Review the extracted text before saving.</p>
    <p className="field-help">Scanned pages need OCR. Diagrams and equations may be missed.</p>
    <details className="upload-details"><summary>File formats, limits &amp; how your text is used</summary><p>Text PDFs, PPTX, DOCX, TXT and MD · 8 MB each · up to 100 pages/slides · 12 documents. Originals are temporary; only confirmed extracted text is saved. Relevant excerpts may be sent to Nebius during practice and comparison.</p></details>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {busy && <p className="progress-banner" role="status">{busy}…</p>}
    {draft ? <section className="document-review">
      <span className="eyebrow">REVIEW BEFORE USING</span>
      <label htmlFor="material-title">Document title</label><input id="material-title" value={draft.title} maxLength={160} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      <p className="field-help">{draft.subject} · {draft.kind} · {draft.pages.length} extracted sections</p>
      {draft.warnings.map((warning) => <p className="warning-text" key={warning}>{warning}</p>)}
      <div className="extracted-pages">{draft.pages.map((page) => <details key={page.locator}><summary>{page.locator}</summary><p>{page.text}</p></details>)}</div>
      <div className="form-actions"><button className="btn primary" disabled={!!busy || !draft.title.trim()} onClick={save}>Confirm and use this text <ArrowRight size={15} /></button><button className="text-button" disabled={!!busy} onClick={() => setDraft(null)}>Discard preview</button></div>
    </section> : <form onSubmit={extract} className="material-upload">
      <div className="form-grid"><div><label htmlFor="material-subject">Subject</label><input id="material-subject" list="course-subjects" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Database systems" maxLength={80} required /></div><div><label htmlFor="material-kind">What kind of material?</label><select id="material-kind" name="kind"><option>Syllabus</option><option>Lecture notes</option><option>Lecture slides</option><option>Past questions</option></select></div></div>
      <label htmlFor="course-file">Choose a document</label><input id="course-file" name="file" type="file" accept=".pdf,.pptx,.docx,.txt,.md" required />
      <button className="btn primary" disabled={!!busy} style={{ marginTop: 16 }}><Upload size={16} /> Extract and review text</button>
    </form>}
    <section className="saved-materials"><div className="section-title"><h3>Your confirmed materials</h3><span className="count">{state.materials?.length || 0}/12</span></div>
      {!state.materials?.length && <div className="empty-state"><FileText size={24} /><h3>Start with your actual course.</h3><p>One syllabus or set of class notes is enough. Nothing is assumed from the name of your college.</p></div>}
      {state.materials?.map((material) => <article className="saved-material" key={material.id}><div className="section-title"><div><h3>{material.title}</h3><p className="field-help">{material.subject} · {material.kind} · {material.filename}</p></div><button className="icon-btn danger" aria-label={`Remove course material ${material.title}`} disabled={!!busy} onClick={async () => {
        if (!window.confirm("Remove this document's extracted text from your course library? Existing attempts and older backups may still contain derived references.")) return;
        const result = await send("/api/materials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: material.id }) }, "Removing course material");
        if (result) { onState(result.state); setBridge(null); }
      }}><Trash2 size={16} /></button></div>{material.warnings.map((warning) => <p className="warning-text" key={warning}>{warning}</p>)}<details><summary>Inspect extracted source text</summary><div className="extracted-pages">{material.pages.map((p) => <details key={p.locator}><summary>{p.locator}</summary><p>{p.text}</p></details>)}</div></details></article>)}
    </section>
    <section className="course-comparison"><span className="eyebrow">YOUR COURSE, WITH A WIDER PERSPECTIVE</span><h3>Find one useful next stretch.</h3><p className="field-help">Compare a sample of your confirmed text with a named public course reference.</p><details className="upload-details"><summary>What this comparison means</summary><p>Uses a reviewed course summary, not a complete review of the external course. This compares materials, not students or universities. Exact source quotes are checked; their interpretation is still model feedback.</p></details>
      <label htmlFor="compare-subject">Subject to compare</label><input id="compare-subject" list="course-subjects" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} placeholder="Database systems" />
      <label htmlFor="benchmark-course">Public course reference</label><select id="benchmark-course" value={benchmark} onChange={(e) => setBenchmark(e.target.value)}>{courseBenchmarks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
      <p className="field-help"><a href={courseBenchmarks.find((b) => b.id === benchmark)!.url} target="_blank" rel="noopener noreferrer">Inspect the public course source <ExternalLink size={12} /></a> · reference checked 25 October 2026; not a full course-content review.</p>
      <button className="btn subtle" disabled={!!busy || !subject.trim() || !state.materials?.length} onClick={async () => {
        const result = await send("/api/course-bridge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, benchmark }) }, "Comparing supplied course excerpts");
        if (result) setBridge(result);
      }}>Compare and suggest a bridge <ArrowRight size={15} /></button>
      {bridge && <div className="bridge-result"><h3>In your supplied materials</h3>{bridge.comparison.localFocus.map((point, i) => { const source = bridge.excerpts.find((e) => e.id === point.sourceId)!; return <div className="course-claim" key={i}><p>{point.point}</p><blockquote>{point.quote}</blockquote><small>{source.title} · {source.locator}</small></div>; })}<h3>In our reviewed public-course summary</h3>{bridge.comparison.externalFocus.map((point, i) => <div className="course-claim" key={i}><p>{point.point}</p><blockquote>{point.quote}</blockquote><a href={bridge.benchmark.url} target="_blank" rel="noopener noreferrer">{bridge.benchmark.name} ↗</a></div>)}<div className="practice-context"><span className="eyebrow">SYNTHETIC OPTIONAL EXERCISE</span><p>{bridge.comparison.bridgeExercise}</p></div><p className="field-help">{bridge.comparison.caution} This comparison is not saved as a diagnosis or a score. Exam deadlines still control your next plan.</p></div>}
    </section>
  </div>;
}
