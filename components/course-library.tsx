"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { courseBenchmarks, type MaterialDraft, type CourseExcerpt } from "@/lib/course-types";
import { launchPipChat } from "@/lib/pip-navigation";
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
  const [benchmark, setBenchmark] = useState("");
  const subjects=[...new Set((state.materials||[]).map(material=>material.subject))];
  const activeSubject=subject||subjects[0]||"";
  const activeBenchmark=benchmark||(/operating|\bos\b/i.test(activeSubject)?"mit-os":/algorithm|data structure/i.test(activeSubject)?"mit-algorithms":/database|dbms|sql/i.test(activeSubject)||!activeSubject?"berkeley-db":"");
  const courseChoices:Record<string,{title:string;school:string;description:string}>={
    "berkeley-db":{title:"Database systems",school:"Berkeley · CS 186",description:"How databases store data and answer questions."},
    "mit-os":{title:"Operating systems",school:"MIT · 6.1810",description:"How memory, files and running programs fit together."},
    "mit-algorithms":{title:"Algorithms & data structures",school:"MIT · 6.006",description:"Choose data structures and reason about how fast code runs."}
  };
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
    <p className="modal-description">Add your syllabus, notes, slides or past questions. Check the text before adding it.</p>
    <details className="upload-details"><summary>Which files can I add?</summary><p>PDFs with selectable text, PowerPoint, Word, TXT or Markdown. Up to 8 MB, 500 PDF pages or 100 slides per file. PDF originals are kept privately so the study room can read page images. Text extraction alone may miss diagrams and equations. Relevant passages go to Nebius when you ask for help.</p></details>
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
      <button className="btn primary" disabled={!!busy} style={{ marginTop: 16 }}><Upload size={16} /> Read document</button>
    </form>}
    <section className="saved-materials"><div className="section-title"><h3>Your course documents</h3><span className="count">{state.materials?.length || 0}/12</span></div>
      {!state.materials?.length && <div className="empty-state"><FileText size={24} /><h3>Start with your actual course.</h3><p>Add a syllabus or a set of class notes to get started.</p></div>}
      {state.materials?.map((material) => <article className="saved-material" key={material.id}><div className="section-title"><div><h3>{material.title}</h3><p className="field-help">{material.subject} · {material.kind} · {material.filename}</p></div><button className="icon-btn danger" aria-label={`Remove course material ${material.title}`} disabled={!!busy} onClick={async () => {
        if (!window.confirm("Remove this document's extracted text from your course library? Existing attempts and older backups may still contain derived references.")) return;
        const result = await send("/api/materials", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: material.id }) }, "Removing course material");
        if (result) { onState(result.state); setBridge(null); }
      }}><Trash2 size={16} /></button></div>{material.storageKey&&<p className="material-coverage">Original PDF available for diagrams & images</p>}{material.coverage&&<p className="material-coverage">{material.coverage.processedPages}/{material.coverage.totalPages} pages processed · {material.coverage.emptyPages.length} with little text</p>}<a className="btn primary material-study-link" href={`/study/${material.id}`}>Study this document <ArrowRight size={15}/></a>{material.warnings.map((warning) => <p className="warning-text" key={warning}>{warning}</p>)}<details><summary>Read document text</summary><div className="extracted-pages">{material.pages.map((p) => <details key={p.locator}><summary>{p.locator}</summary><p>{p.text}</p></details>)}</div></details></article>)}
    </section>
    <section className="course-comparison"><h3>Find a new way to practise.</h3><p className="field-help">{subjects.length ? "Use your notes and a course overview to find a small exercise." : "Pick a course. Pip can help you get started."}</p>
      {subjects.length>0 && <><label htmlFor="compare-subject">Your subject</label><select id="compare-subject" value={activeSubject} disabled={!subjects.length} onChange={event=>{setSubject(event.target.value);setBenchmark("");setBridge(null);}}>{!subjects.length&&<option value="">Add your notes above first</option>}{subjects.map(value=><option key={value}>{value}</option>)}</select></>}
      <fieldset className="course-choice-list"><legend>Explore a course</legend>{courseBenchmarks.map(course=>{const choice=courseChoices[course.id];return <label className={`course-choice ${activeBenchmark===course.id?"is-selected":""}`} key={course.id}><input type="radio" name="course-choice" value={course.id} checked={activeBenchmark===course.id} onChange={()=>{setBenchmark(course.id);setBridge(null);}}/><span><strong>{choice.title}</strong><small>{choice.school}</small><p>{choice.description}</p></span></label>;})}</fieldset>
      {activeBenchmark?<a className="course-overview-link" href={courseBenchmarks.find(course=>course.id===activeBenchmark)!.url} target="_blank" rel="noopener noreferrer">Open {courseChoices[activeBenchmark].school} course page <ExternalLink size={14}/></a>:<p className="field-help">Choose a course to compare with your subject.</p>}
      <button className="btn primary" disabled={!!busy||!activeBenchmark} onClick={async()=>{if(!activeSubject||!state.materials?.length){launchPipChat(`Teach me ${courseChoices[activeBenchmark].title} using the ${courseChoices[activeBenchmark].school} course, one small step at a time.`);return;}const result=await send("/api/course-bridge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:activeSubject,benchmark:activeBenchmark})},"Finding a useful exercise");if(result)setBridge(result);}}>{subjects.length ? "Find one thing to try" : "Explore with Pip"} <ArrowRight size={16}/></button>
      {bridge&&<div className="bridge-result"><h3>From your notes</h3>{bridge.comparison.localFocus.map((point,i)=>{const source=bridge.excerpts.find(item=>item.id===point.sourceId);return <div className="course-claim" key={i}><p>{point.point}</p><details><summary>See the passage</summary><blockquote>{point.quote}</blockquote><small>{source?.title} · {source?.locator}</small></details></div>;})}<h3>From {bridge.benchmark.name}</h3>{bridge.comparison.externalFocus.map((point,i)=><div className="course-claim" key={i}><p>{point.point}</p><details><summary>See the passage</summary><blockquote>{point.quote}</blockquote><a href={bridge.benchmark.url} target="_blank" rel="noopener noreferrer">Open course page ↗</a></details></div>)}<div className="practice-context"><h3>Try this</h3><p>{bridge.comparison.bridgeExercise}</p></div>{bridge.comparison.caution&&<details className="field-help"><summary>About this suggestion</summary><p>{bridge.comparison.caution}</p></details>}</div>}

    </section>
  </div>;
}
