"use client";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  NotebookPen,
  Play,
  Square,
  Timer,
  Trash2,
} from "lucide-react";
import type { EvidenceEntry, EvidenceAttachment } from "@/lib/evidence";
import type { Workspace } from "@/lib/types";
import SignOut from "./sign-out";
import { launchPipChat } from "@/lib/pip-navigation";
import { connectionMessage } from "@/lib/client-request";

type Candidate = {
  activity: string;
  artifactShows: string;
  studentExplanation: string;
  modelFeedback: string;
  uncertainty: string;
  nextSuggestion: string;
};
type Review = {
  mode?:"model"|"unassessed";
  reviewId: string;
  expiresAt: number;
  candidate: Candidate;
  activityDate: string | null;
  attachments: EvidenceAttachment[];
};
type Card = { kind: "saved" | "transfer"; prompt?: string; note?: string; question?: string };

const emptyCandidate: Candidate = {
  activity: "",
  artifactShows: "",
  studentExplanation: "",
  modelFeedback: "",
  uncertainty: "",
  nextSuggestion: "",
};

function formatBytes(size: number) {
  return size > 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function JournalApp() {
  const [tab,setTab]=useState<"session"|"record"|"history">("session");
  const [state, setState] = useState<Workspace | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Focused session form
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(40);
  const [outcomeId, setOutcomeId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [summary, setSummary] = useState("");
  const [nextStep, setNextStep] = useState("");

  // Journal form + review
  const [text, setText] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [draft, setDraft] = useState<Candidate>(emptyCandidate);
  const [draftDate, setDraftDate] = useState("");

  const focus = state?.focus && !state.focus.closedAt ? state.focus : null;

  const load = useCallback(async () => {
    setError("");
    try {
      const workspaceResponse = await fetch("/api/workspace", { cache: "no-store" });
      const workspaceData = await workspaceResponse.json();
      if (!workspaceResponse.ok) throw new Error(workspaceData.error?.message || "Couldn’t open your workspace.");
      if(workspaceData.account&&!workspaceData.state.profile.onboardingComplete){window.location.replace("/about-you");return;}
      setState(workspaceData.state as Workspace);
      const focusResponse = await fetch("/api/focus", { cache: "no-store" });
      const focusData = await focusResponse.json();
      if (focusResponse.ok) setCard(focusData.card as Card);
    } catch (caught) {
      setError(connectionMessage(caught, "Couldn’t open your workspace. Check your connection and reload."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const dirty=Boolean(text||files.length||review||summary||nextStep);
  useEffect(()=>{let leaving=false;const signedOut=()=>{leaving=true;setText("");setReview(null);setFiles([]);setState(null);};const warn=(event:BeforeUnloadEvent)=>{if(dirty&&!leaving){event.preventDefault();event.returnValue="";}};window.addEventListener("stride-signout",signedOut);window.addEventListener("beforeunload",warn);return()=>{window.removeEventListener("stride-signout",signedOut);window.removeEventListener("beforeunload",warn);};},[dirty]);
  useEffect(()=>{if(review)document.getElementById("entry-review")?.scrollIntoView({block:"start",behavior:"smooth"});},[review]);

  const focusAction = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, focusId:state?.focus?.id, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "That request couldn’t complete.");
      setState(data.state as Workspace);
      setCard(data.card as Card);
      if(action==="start"||action==="close"){setSummary("");setNextStep("");}
      setToast(action==="close"?"Session saved. Your next step is ready.":"");
    } catch (caught) {
      setError(connectionMessage(caught, "We couldn’t confirm that request. Your draft is still here. Check saved work before retrying."));
    } finally {
      setBusy("");
    }
  };

  const submitEvidence = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("submit");
    setError("");
    try {
      const form = new FormData();
      form.set("text", text);
      if (activityDate) form.set("activityDate", activityDate);
      for (const file of files) form.append("files", file);
      const response = await fetch("/api/evidence", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Couldn’t prepare this entry.");
      setReview(data as Review);
      setDraft((data as Review).candidate);
      setDraftDate((data as Review).activityDate || "");
    } catch (caught) {
      setError(connectionMessage(caught, "Couldn’t prepare this entry. Your draft is still here."));
    } finally {
      setBusy("");
    }
  };

  const commitEvidence = async () => {
    if (!review) return;
    setBusy("commit");
    setError("");
    try {
      const response = await fetch("/api/evidence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: review.reviewId,
          candidate: draft,
          activityDate: draftDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Couldn’t save this entry.");
      setState(data.state as Workspace);
      setReview(null);
      setText("");
      setFiles([]);
      setActivityDate("");
      setDraft(emptyCandidate);
      setDraftDate("");
      setToast("Saved to your journal.");setTab("history");
    } catch (caught) {
      setError(connectionMessage(caught, "We couldn’t confirm the save. Your draft is still here; try again or check saved work."));
    } finally {
      setBusy("");
    }
  };

  const deleteEntry = async (id: string) => {
    if(!window.confirm("Remove this entry and its attachments? Existing chats and older backups may still contain references."))return;
    setBusy(`delete-${id}`);
    setError("");
    try {
      const response = await fetch("/api/evidence", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Couldn’t remove this entry.");
      setState(data.state as Workspace);
      const fresh=await fetch("/api/focus",{cache:"no-store"});if(fresh.ok)setCard((await fresh.json()).card);
    } catch (caught) {
      setError(connectionMessage(caught, "Couldn’t confirm removal. Check saved work before retrying."));
    } finally {
      setBusy("");
    }
  };

  const exportJournal = async () => {
    setBusy("export");
    try {
      const response = await fetch("/api/evidence", { cache: "no-store" });
      const data = await response.json();
      if(!response.ok)throw Error(data.error?.message||"Couldn’t export your journal.");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data.entries || [], null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "stride-evidence-journal.json";
      link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(caught){setError(connectionMessage(caught,"Couldn’t export. Please try again."));} finally {
      setBusy("");
    }
  };

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {const selected=Array.from(event.target.files||[]);if(selected.length>5){setError("Choose up to five files.");event.target.value="";setFiles([]);return;}setFiles(selected);setError("");};

  if (!state)
    return (
      <div className="journal-shell">
        <p className="journal-muted">Opening your journal…</p>
        {error && <><p role="alert" className="journal-error">{error}</p><button className="btn subtle" onClick={()=>void load()}>Try again</button></>}
      </div>
    );

  const entries = state.evidence?.entries || [];
  const works = state.works || [];
  const materials = state.materials || [];

  return (
    <div className="journal-shell">
      <nav className="journal-top"><a className="site-brand" href="/workspace">stride.</a><div><a className="btn subtle" href="/workspace">Back to workspace</a><a className="btn subtle" href="/settings">Settings</a><SignOut/></div></nav>
      <header className="journal-head">
        <p className="site-kicker">YOUR WORK JOURNAL</p>
        <h1>Make your work count.</h1>
        <p>
          Work on something. Keep what you learned. Pick it up tomorrow.
        </p>
      </header>

      {error && <div role="alert" className="journal-error">{error}<button className="btn subtle" disabled={!!busy} onClick={()=>void load()}>Check saved work</button></div>}
      {toast && <p role="status" className="journal-toast">{toast}</p>}
      <div className="journal-tabs" role="group" aria-label="Journal views">{([{id:"session",label:"Focus"},{id:"record",label:"Log work"},{id:"history",label:`My progress (${entries.length})`}] as const).map(item=><button key={item.id} type="button" aria-pressed={tab===item.id} onClick={()=>setTab(item.id)}>{item.label}</button>)}</div>

      {tab==="session"&&card && (
        <section className="journal-section" aria-label="Where you left off">
          <div className="journal-banner">
            <span className="journal-tag">{card.kind === "saved" ? "Pick up from last time" : "Ungraded practice"}</span>
            <h2>{card.kind === "saved" ? card.prompt : card.question}</h2>
            {card.kind === "saved" && card.note && <p className="journal-muted">{card.note}</p>}
            <div className="journal-actions">
              {card.kind === "saved" && (
                <button
                  className="btn primary"
                  onClick={() => {
                    setTitle(state.focus?.title || "");
                    focusAction("continueReturn");
                  }}
                  disabled={busy !== ""}
                >
                  Continue <ArrowRight size={16} />
                </button>
              )}
              <button className="btn subtle" onClick={() => focusAction("changeReturn")} disabled={busy !== ""}>
                Show me something different
              </button>
              <button className="btn subtle" onClick={() => focusAction("skipReturn")} disabled={busy !== ""}>
                Skip for now
              </button>
            </div>
          </div>
        </section>
      )}

      {tab==="session"&&<section className="journal-section" aria-label="Focused session">
        {focus ? (
          <div className="journal-card">
            <span className="journal-tag"><Timer size={11} /> Session open</span>
            <h2>{focus.title}</h2>
            <p className="journal-muted">
              About {focus.minutes} minutes. Your session stays here until you finish it.
            </p>
            {focus.pausedAt ? (
              <div className="journal-actions">
                <button className="btn primary" onClick={() => focusAction("resume")} disabled={busy !== ""}>
                  <Play size={16} /> Keep going
                </button>
              </div>
            ) : (
              <div className="journal-actions">
                <button className="btn subtle" onClick={() => focusAction("pause")} disabled={busy !== ""}>
                  Pause for now
                </button>
              </div>
            )}
            <div className="journal-actions"><button className="btn primary" onClick={()=>setTab("record")}>Log what I worked on <ArrowRight size={16}/></button><button className="btn subtle" onClick={()=>launchPipChat(`Help me work on this outcome: ${focus.title}. Guide me one small step at a time.`)}>Work with Pip</button>{focus.materialId&&materials.some(material=>material.id===focus.materialId)&&<a className="btn subtle" href={`/study/${focus.materialId}`}>Open my notes</a>}</div><h3>Finish for now</h3>
            <p className="journal-muted">Keep a short note for your next visit.</p>
            <label className="journal-label" htmlFor="focus-summary">What did you work on?</label>
            <textarea
              id="focus-summary"
              className="journal-textarea"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={600}
              placeholder="I worked through the sorting chapter and got stuck on when to choose merge sort…"
            />
            <label className="journal-label" htmlFor="focus-next">Next step (optional)</label>
            <input
              id="focus-next"
              className="journal-input"
              value={nextStep}
              onChange={(event) => setNextStep(event.target.value)}
              maxLength={300}
              placeholder="Try one past-paper question on merge sort"
            />
            <div className="journal-actions">
              <button
                className="btn primary"
                onClick={() => focusAction("close", { summary, nextStep })}
                disabled={busy !== "" || summary.trim().length === 0}
              >
                <Check size={15} /> Save & finish
              </button>
            </div>
            
          </div>
        ) : (
          <div className="journal-card">
            <span className="journal-tag">Focused session</span>
            <h2>Work on one thing for a while</h2>
            <p className="journal-muted">
              Choose one useful outcome. You can pause and come back later.
            </p>
            <label className="journal-label" htmlFor="focus-title">What are you working on?</label>
            <input
              id="focus-title"
              className="journal-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Understand merge sort well enough to explain it"
            />
            <label className="journal-label" htmlFor="focus-minutes">Roughly how many minutes do you have? (15–240)</label>
            <input
              id="focus-minutes"
              className="journal-input"
              type="number"
              min={15}
              max={240}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
            {works.length > 0 && (
              <>
                <label className="journal-label" htmlFor="focus-outcome">Link coursework (optional)</label>
                <select id="focus-outcome" className="journal-select" value={outcomeId} onChange={(event) => setOutcomeId(event.target.value)}>
                  <option value="">None</option>
                  {works.map((work) => (
                    <option key={work.id} value={work.id}>{work.title}</option>
                  ))}
                </select>
              </>
            )}
            {materials.length > 0 && (
              <>
                <label className="journal-label" htmlFor="focus-material">Start from coursework (optional)</label>
                <select id="focus-material" className="journal-select" value={materialId} onChange={(event) => setMaterialId(event.target.value)}>
                  <option value="">None</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>{material.title}</option>
                  ))}
                </select>
              </>
            )}
            <div className="journal-actions">
              <button
                className="btn primary"
                onClick={() => focusAction("start", { title, minutes, outcomeId: outcomeId || null, materialId: materialId || null })}
                disabled={busy !== "" || title.trim().length === 0||!Number.isInteger(minutes)||minutes<15||minutes>240}
              >
                <Play size={16} /> {busy==="start"?"Starting…":"Start session"}
              </button>
            </div>
          </div>
        )}
      </section>}

      {tab==="record"&&!review&&<section className="journal-section" aria-label="Add evidence">
        <div className="journal-card">
          <span className="journal-tag"><NotebookPen size={11} /> Add evidence</span>
          <h2>What did you work on?</h2>
          <p className="journal-muted">
            Paste your work or add a screenshot. Review the suggested record before saving.
          </p>
          <form onSubmit={submitEvidence}>
            <label className="journal-label" htmlFor="evidence-text">Your work or explanation</label>
            <textarea
              id="evidence-text"
              className="journal-textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={12000}
              placeholder="Paste code, an answer, or write what you did…"
            />
            <label className="journal-label" htmlFor="evidence-date">Activity date (optional)</label>
            <input
              id="evidence-date"
              className="journal-input"
              type="date"
              value={activityDate}
              onChange={(event) => setActivityDate(event.target.value)}
            />
            <label className="journal-label" htmlFor="evidence-files">Files or images (optional, up to 5)</label>
            <input id="evidence-files" className="journal-input" type="file" multiple accept=".txt,.md,.png,.jpg,.jpeg,.webp" onChange={onFiles} />
            {files.length > 0 && (
              <ul className="journal-file-list">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>{file.name} · {formatBytes(file.size)}</li>
                ))}
              </ul>
            )}
            <details className="journal-file-help"><summary>Supported files</summary><p>TXT or MD up to 256 KB; PNG, JPEG or WebP up to 3 MB each. Text across this entry must fit 24,000 characters. Upload dates are saved separately from your activity date. Relevant content is sent to Nebius for review.</p></details>
            <div className="journal-actions">
              <button className="btn primary" type="submit" disabled={busy !== "" || text.trim().length === 0}>
                {busy==="submit"?"Reading your work…":"Prepare my entry"} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </section>}

      {tab==="record"&&review && (
        <section id="entry-review" className="journal-section" aria-label="Review before saving">
          <div className="journal-card">
            <span className="journal-tag">Review before saving</span>
            <h2>Check this record</h2>{review.mode==="unassessed"&&<p role="status" className="journal-toast">Model review was unavailable. You can still save your words and files as an unassessed record.</p>}
            <p className="journal-muted">
              Review your activity and explanation before saving.
            </p>
            <label className="journal-label" htmlFor="draft-activity">Your activity</label>
            <input id="draft-activity" className="journal-input" value={draft.activity} onChange={(event) => setDraft({ ...draft, activity: event.target.value })} maxLength={300} />
            <label className="journal-label" htmlFor="draft-explanation">Your explanation</label>
            <textarea id="draft-explanation" className="journal-textarea" value={draft.studentExplanation} onChange={(event) => setDraft({ ...draft, studentExplanation: event.target.value })} maxLength={12000} />
            {review.mode!=="unassessed"&&<div className="journal-feedback"><h3>What Stride noticed</h3><p>{draft.artifactShows}</p>{draft.modelFeedback&&<p>{draft.modelFeedback}</p>}{draft.uncertainty&&<p className="journal-muted">Unclear: {draft.uncertainty}</p>}{draft.nextSuggestion&&<p><strong>One next step:</strong> {draft.nextSuggestion}</p>}<small>Model interpretation. You decide whether to keep this record.</small></div>}
            <label className="journal-label" htmlFor="draft-date">Activity date (optional)</label>
            <input id="draft-date" className="journal-input" type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} />
            {review.attachments.length > 0 && (
              <>
                <h3>Attachments (kept private)</h3>
                <ul className="journal-file-list">
                  {review.attachments.map((attachment) => (
                    <li key={attachment.key}>
                      {attachment.kind === "image" ? (
                        <img className="journal-thumb" src={`/api/evidence/attachment?key=${attachment.key}`} alt={attachment.filename} />
                      ) : null}
                      <span>{attachment.filename} · {formatBytes(attachment.size)} · uploaded {new Date(attachment.uploadedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="journal-actions">
              <button className="btn primary" onClick={commitEvidence} disabled={busy !== ""}>
                <Check size={16} /> {busy==="commit"?"Saving…":"Save to journal"}
              </button>
              <button className="btn subtle" onClick={() => { setReview(null); setDraft(emptyCandidate); }} disabled={busy !== ""}>
                Discard
              </button>
            </div>
          </div>
        </section>
      )}

      {tab==="history"&&<section className="journal-section" aria-label="Saved entries">
        <div className="journal-card">
          <div className="journal-row" style={{ justifyContent: "space-between" }}>
            <div>
              <span className="journal-tag">Saved entries</span>
              <h2>{entries.length === 0 ? "Your next step starts here" : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}</h2>
            </div>
            {entries.length > 0 && (
              <button className="btn subtle" onClick={exportJournal} disabled={busy !== ""}>
                <Download size={16} /> Export
              </button>
            )}
          </div>
          {entries.length === 0 && (
            <p className="journal-muted">
              Log something you worked on, then see your progress here.
            </p>
          )}
          {[...entries].reverse().map((entry: EvidenceEntry) => (
            <details key={entry.id} className="journal-entry" id={`entry-${entry.id}`}><summary>
              <span className="journal-tag">{entry.kind === "session" ? "Session note" : "Evidence"}</span>
              <strong>{entry.reported.activity}</strong><small>Saved {new Date(entry.createdAt).toLocaleDateString()}</small></summary><div className="journal-entry-body">
              <p className="journal-preserve">{entry.reported.explanation}</p>{entry.originalSubmission&&entry.originalSubmission!==entry.reported.explanation&&<details><summary>Original submitted text</summary><pre>{entry.originalSubmission}</pre></details>}
              {entry.observed.artifactShows && (
                <>
                  <span className="journal-tag">{entry.assessment==="unassessed"?"Unassessed record":"Model interpretation"}</span>
                  <p>{entry.observed.artifactShows}</p>
                </>
              )}
              {entry.modelFeedback && (
                <>
                  <span className="journal-tag model">Model feedback</span>
                  <p>{entry.modelFeedback}</p>
                </>
              )}
              {entry.uncertainty && <p className="journal-muted">Unclear: {entry.uncertainty}</p>}
              {entry.nextSuggestion && <p className="journal-muted">Next: {entry.nextSuggestion}</p>}
              {entry.observed.attachments.length > 0 && (
                <ul className="journal-file-list">
                  {entry.observed.attachments.map((attachment) => (
                    <li key={attachment.key}>
                      {attachment.kind === "image" ? (
                        <img className="journal-thumb" src={`/api/evidence/attachment?key=${attachment.key}`} alt={attachment.filename} />
                      ) : null}
                      <a href={`/api/evidence/attachment?key=${attachment.key}`}>{attachment.filename}</a>
                      <span>{formatBytes(attachment.size)} · uploaded {new Date(attachment.uploadedAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="journal-meta">
                <CalendarDays size={12} />{" "}
                {entry.activityDate ? `Work dated ${entry.activityDate} (as you recorded it)` : "No activity date recorded"}
                {" · "}Saved {new Date(entry.createdAt).toLocaleString()}
                {entry.focusId ? " · during a focused session" : ""}
              </p>
              <div className="journal-actions">
                <button className="btn subtle" onClick={() => deleteEntry(entry.id)} disabled={busy !== ""}>
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </div></details>
          ))}
        </div>
      </section>}
    </div>
  );
}
