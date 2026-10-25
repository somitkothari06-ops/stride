"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  CalendarDays,
  Clock3,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Download,
  FileText,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Leaf,
  Link2,
  ListChecks,
  Menu,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
  PanelLeftClose,
} from "lucide-react";
import type { Intake, Mode, View, Work, Workspace } from "@/lib/types";
import { nebiusPresentation, type Providers } from "@/lib/connection-status";
import CourseLibrary from "./course-library";
import VoiceCapture from "./voice-capture";

type Modal = "add" | "profile" | "integrations" | "edit" | "course" | null;
type Candidate = Intake & { source: string; sourceType: string; mode: Mode };
const navigation = [
  { id: "today", name: "Today", icon: LayoutDashboard },
  { id: "work", name: "My work", icon: BookOpen },
  { id: "memory", name: "Memory", icon: Leaf },
  { id: "direction", name: "Direction", icon: Compass },
] as const;

function dayLabel(date: string | null, timezone: string) {
  if (!date) return "Date not set";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date(),
  );
  const days = Math.round(
    (Date.parse(date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) /
      86400000,
  );
  if (days < 0) return "Past due · review";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
function Kind({ kind }: { kind: string }) {
  return (
    <span className={`kind ${kind}`}>
      <span />
      {kind}
    </span>
  );
}

export default function WorkspaceApp() {
  const [state, setState] = useState<Workspace | null>(null);
  const [providers, setProviders] = useState<Providers>({
    nebius: false,
    tavily: false,
    model: null,
  });
  const [view, setView] = useState<View>("today");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [source, setSource] = useState("");
  const [sourceType, setSourceType] = useState("Class notes");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [answer, setAnswer] = useState("");
  const [role, setRole] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => { setCheckedSteps([]); }, [selectedId, state?.prepared]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [view]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]',
    ) || []).filter((element) => element.getClientRects().length);
    (dialog?.querySelector<HTMLElement>("#source, [autofocus]") || dialog?.querySelector<HTMLElement>("input, textarea, select") || focusable()[0])?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message || "Couldn't load your workspace.");
      setState(data.state);
      setProviders(data.providers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !busy) {
        e.preventDefault();
        setModal("add");
      }
      if (e.key === "Escape" && !busy) { setModal(null); setMobileNav(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);

  async function act(
    payload: object,
    label: string,
  ): Promise<Workspace | null> {
    if (busy) return null;
    setBusy(label);
    setError("");
    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message ||
            "That didn't complete. Your saved work is safe.",
        );
      setState(data.state);
      setProviders(data.providers);
      return data.state;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect.");
      return null;
    } finally {
      setBusy("");
    }
  }
  function openAdd() {
    setCandidate(null);
    setSource("");
    setModal("add");
  }
  async function extract(e: FormEvent) {
    e.preventDefault();
    await extractSource(source, sourceType);
  }
  async function extractSource(text: string, type: string) {
    setBusy("Reading your work");
    setError("");
    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: text }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message || "Couldn't read that text.");
      setCandidate({ ...data.candidate, source: text, sourceType: type, mode: data.mode });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect.");
    } finally {
      setBusy("");
    }
  }
  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!candidate) return;
    const result = await act(
      { action: "add", work: candidate },
      "Saving confirmed work",
    );
    if (result) {
      setModal(null);
      setToast("Work saved. Refresh your next step when you're ready.");
    }
  }
  async function start(workId: string) {
    setSelectedId(workId);
    setAnswer("");
    setView("work");
    await act(
      { action: "prepare", id: workId },
      "Preparing a focused practice session",
    );
  }
  function exportData() {
    if (!state) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "stride-my-workspace.json";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Your workspace has been exported.");
  }
  function go(next: View) {
    setView(next);
    setMobileNav(false);
    setError("");
  }

  if (!state)
    return (
      <main className="initial-loading">
        <div className="brand-mark">
          <span />
          <span />
          <span />
        </div>
        <h1>Getting your workspace ready.</h1>
        <p>{error || "A little space for what matters."}</p>
        {error && (
          <button className="btn primary" onClick={load}>
            Try again
          </button>
        )}
      </main>
    );

  const active = state.works
    .filter((w) => !w.completed)
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const selected =
    state.works.find((w) => w.id === selectedId) ||
    state.works.find((w) => w.id === state.plan?.workId) ||
    active[0];
  const prepared =
    state.prepared?.workId === selected?.id ? state.prepared : null;
  const stale = state.plan && state.plan.contextRevision !== state.revision;
  const latestObservation = state.observations.filter((o) => !o.removed).at(-1);
  const dateText = new Intl.DateTimeFormat("en-IN", {
    timeZone: state.profile.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const activeNav = navigation.find((n) => n.id === view)!;
  const connection = nebiusPresentation(providers);

  const workRows = (works: Work[], showSubject = true) =>
    works.length ? (
      works.map((w) => (
        <button
          className={`work-row ${view === "work" && selected?.id === w.id ? "selected" : ""}`}
          aria-current={view === "work" && selected?.id === w.id ? "true" : undefined}
          key={w.id}
          onClick={() => {
            setSelectedId(w.id);
            setView("work");
            setAnswer("");
          }}
        >
          <span className={`work-icon ${w.kind}`}>
            <FileText size={18} />
          </span>
          <span className="work-row-copy">
            <strong>{w.title}</strong>
            {showSubject && <small>{w.subject}</small>}
          </span>
          <span className="work-row-right">
            <small>
              {w.completed
                ? "Completed"
                : dayLabel(w.dueDate, state.profile.timezone)}
            </small>
            <ChevronRight size={15} />
          </span>
        </button>
      ))
    ) : (
      <div className="empty-state">
        <BookOpen size={26} />
        <h3>A little room for your next thing.</h3>
        <p>Add an assignment, exam, or project to get started.</p>
        <button className="btn subtle" onClick={openAdd}>
          Add your first work <Plus size={15} />
        </button>
      </div>
    );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to workspace</a>
      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("today");
          }}
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          stride<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">
          <GraduationCap size={15} />
          <span>My student workspace</span>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              aria-current={view === n.id ? "page" : undefined}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              <span>{n.name}</span>
              {n.id === "work" && <small>{active.length}</small>}
              {view === n.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-overline">ONE STEP AT A TIME</span>
          <p>
            Your work adds up.
            <br />
            Let’s make it count.
          </p>
          <svg viewBox="0 0 180 70" aria-hidden="true">
            <path d="M8 60C40 60 22 30 59 36S76 55 104 24s48 2 65-16" />
            <circle cx="169" cy="8" r="4" />
          </svg>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal("integrations")}>
            <Settings2 size={17} />
            <span>Connections</span>
            <span className={`status-dot ${providers.nebius ? "live" : ""}`} />
          </button>
          <button
            className="profile-button"
            onClick={() => window.location.assign("/about-you")}
          >
            <span className="avatar">{state.profile.name.slice(0, 1)}</span>
            <span>
              <strong>{state.profile.name}</strong>
              <small>{state.profile.year} · Engineering</small>
            </span>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label={mobileNav ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={20} />
            </button>
            <a href="/">Stride</a>
            <ChevronRight size={13} />
            <strong>{activeNav.name}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className={`connection-badge ${providers.nebius ? "configured" : ""}`}
              onClick={() => setModal("integrations")}
            >
              <span />
              {connection.shortLabel}
            </button>
            <button className="btn add-button" onClick={openAdd}>
              <Plus size={16} />
              Add work<span className="keyboard-hint">⌘ K</span>
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1} aria-busy={!!busy}>
          <div className="date-line">
            <span>{dateText}</span>
            <span>
              <ShieldCheck size={13} />
              Private browser session
            </span>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-btn"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {busy && (
            <div className="progress-banner" role="status">
              <span className="progress-line" />
              <span>{busy}…</span>
              <small>Your saved work stays safe.</small>
            </div>
          )}

          {view === "today" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">LET’S MAKE TODAY COUNT</p>
                  <h1>A little focus. Real progress.</h1>
                  <p>Start with one thing, {state.profile.name}.</p>
                </div>
                <button
                  className="availability"
                  onClick={() => setModal("profile")}
                >
                  <Clock3 size={17} />
                  <span>
                    <small>Time for today</small>
                    <strong>
                      {state.profile.minutes} minutes <Pencil size={12} />
                    </strong>
                  </span>
                </button>
              </div>
              {state.sample && (
                <div className="sample-strip">
                  <span className="sample-tag">DEMO</span>
                  <p>
                    Sample coursework. Add your own when you’re ready.
                  </p>
                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Clear all coursework, thoughts, attempts, course documents and personal context in this browser workspace?",
                        )
                      )
                        await act(
                          { action: "reset", sample: false },
                          "Starting a fresh workspace",
                        );
                    }}
                  >
                    Start fresh <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
              <div className="day-context" aria-label="Your workspace at a glance">
                <button onClick={() => setView("work")}><BookOpen size={18} /><span><strong>{active.length}</strong> open tasks</span><ArrowRight size={14} /></button>
                <button onClick={() => setModal("profile")}><Clock3 size={18} /><span><strong>{state.profile.minutes} min</strong> to focus</span><Pencil size={13} /></button>
                <button onClick={() => setView("memory")}><ListChecks size={18} /><span><strong>{state.observations.filter((o) => !o.removed).length}</strong> {state.observations.filter((o) => !o.removed).length === 1 ? "attempt" : "attempts"} saved</span><ArrowRight size={14} /></button>
              </div>
              <details className="quick-capture" onToggle={(e) => setCaptureOpen(e.currentTarget.open)}><summary><span>Have something on your mind?</span><span>Speak or type ↗</span></summary><VoiceCapture active={captureOpen} onWork={(text) => { setSource(text); setSourceType("Voice capture"); setCandidate(null); setModal("add"); void extractSource(text, "Voice capture"); }} onNote={async (text) => !!(await act({ action: "saveNote", text }, "Saving your thought"))} />{(state.notes || []).length > 0 && <div className="thought-inbox"><h3>Thought inbox</h3>{[...(state.notes || [])].reverse().map((note) => <article key={note.id}><p>{note.text}</p><button className="btn subtle" disabled={!!busy} onClick={() => void act({ action: "deleteNote", id: note.id }, "Removing thought")}>Remove<span className="sr-only"> thought</span></button></article>)}</div>}</details>
              <div className="dashboard-grid">
                <section className="next-step-card">
                  <div className="card-overline">
                    <span>
                      <span className="sun-dot" />
                      START HERE
                    </span>
                    <span>
                      {state.plan?.mode === "live"
                        ? "AI suggestion"
                        : "Local suggestion"}
                    </span>
                  </div>
                  {state.plan ? (
                    <>
                      <div className="hero-tags">
                        <span>
                          {
                            state.works.find((w) => w.id === state.plan?.workId)
                              ?.subject
                          }
                        </span>
                        <span>
                          <Clock3 size={12} />
                          {state.plan.minutes} min
                        </span>
                      </div>
                      <h2>{state.plan.title}</h2>
                      <p>{state.plan.description}</p>
                      {stale ? (
                        <div className="stale-note">
                          <RefreshCw size={15} />
                          Your context changed. Update your next step.
                        </div>
                      ) : (
                        <details className="why-details"><summary>Why this step?</summary><div className="why-list">
                          {state.plan.reasons.slice(0, 2).map((r) => (
                            <span key={r}>
                              <Check size={13} />
                              {r}
                            </span>
                          ))}
                        </div></details>
                      )}
                      <div className="hero-bottom">
                        <button
                          className="btn dark"
                          disabled={!!busy}
                          onClick={() =>
                            stale
                              ? act(
                                  { action: "plan" },
                                  "Reconsidering your next step",
                                )
                              : start(state.plan!.workId)
                          }
                        >
                          {stale ? "Refresh next step" : "Start a focused session"}
                          <ArrowRight size={16} />
                        </button>
                        {!stale && <button
                          className="btn hero-secondary"
                          disabled={!!busy}
                          onClick={() => act({ action: "plan" }, "Reconsidering your next step")}
                        ><RefreshCw size={16} /> Rethink plan</button>}
                      </div>
                    </>
                  ) : (
                    <div className="hero-empty">
                      <h2>
                        Start with what's
                        <br />
                        in front of you.
                      </h2>
                      <p>
                        Add one piece of work. We’ll find a manageable next step
                        together.
                      </p>
                      <button
                        className="btn dark"
                        disabled={!!busy}
                        onClick={
                          active.length
                            ? () =>
                                act({ action: "plan" }, "Choosing a next step")
                            : openAdd
                        }
                      >
                        {active.length
                          ? "Prepare my next step"
                          : "Add your first work"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </section>
                <section className="card upcoming">
                  <div className="section-title">
                    <h2>Coming up</h2>
                    <CalendarDays size={17} />
                  </div>

                  {workRows(active.slice(0, 4))}
                  <button
                    className="btn card-action all-work"
                    onClick={() => go("work")}
                  >
                    View all coursework <ArrowRight size={14} />
                  </button>
                </section>
                <section className="card progress-card">
                  <div className="section-title">
                    <h2>Your learning trail</h2>
                    <Leaf size={18} />
                  </div>

                  {latestObservation ? (
                    <div className="latest-observation">
                      <span className="observation-dot" />
                      <div>
                        <strong>{latestObservation.title}</strong>

                        <span className="tag">
                          {latestObservation.method === "self-report"
                            ? "Self-reported · not assessed"
                            : "Model feedback · not certification"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="memory-preview">
                      <span className="trail-icon">
                        <ListChecks size={23} />
                      </span>
                      <div>
                        <strong>Keep your first attempt.</strong>
                        <p>
                          Try a session, then save your explanation.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="card-footer">
                    <span>
                      {state.observations.length} recorded{" "}
                      {state.observations.length === 1 ? "attempt" : "attempts"}
                    </span>
                    <button
                      className="btn card-action"
                      onClick={() => go("memory")}
                    >
                      View memory <ArrowUpRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="direction-card">
                  <Compass size={25} />
                  <span className="tiny-overline">
                    BEYOND TODAY
                  </span>
                  <h2>
                    Find your direction.
                  </h2>
                  <p>
                    Explore roles and the work behind them.
                  </p>
                  <button
                    className="btn card-action"
                    onClick={() => go("direction")}
                  >
                    Explore options <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>
            </>
          )}

          {view === "work" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">MAKE ONE THING MORE EXPLAINABLE</p>
                  <h1>Work through it, one step at a time.</h1>
                  <p>Pick one piece of coursework. Try it, explain it, and keep what you learn.</p>
                  <button className="text-button" onClick={() => setModal("course")}><BookOpen size={15} /> Course library · syllabus, notes & past questions</button>
                </div>
                <button className="btn primary" onClick={openAdd}>
                  <Plus size={16} />
                  Add work
                </button>
              </div>
              <div className="work-layout">
                <section className="card work-list">
                  <div className="section-title">
                    <h2>My coursework</h2>
                    <span className="count">{state.works.length}</span>
                  </div>
                  {workRows(state.works)}
                </section>
                <section className="card work-detail">
                  {selected ? (
                    <>
                      <div className="detail-heading">
                        <Kind kind={selected.kind} />
                        <div>
                          <button
                            className="icon-btn"
                            aria-label="Edit work details"
                            onClick={() => {
                              setSelectedId(selected.id);
                              setModal("edit");
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={
                              selected.completed
                                ? "Reopen work"
                                : "Mark work complete"
                            }
                            onClick={() =>
                              act(
                                { action: "complete", id: selected.id },
                                "Updating work",
                              )
                            }
                          >
                            <Check size={17} />
                          </button>
                        </div>
                      </div>
                      <h2>{selected.title}</h2>
                      <div className="detail-meta">
                        <span>{selected.subject}</span>
                        <span>
                          <CalendarDays size={13} />
                          {dayLabel(selected.dueDate, state.profile.timezone)}
                        </span>
                        {selected.completed && (
                          <span className="tag">Completed</span>
                        )}
                      </div>
                      <details className="source-details">
                        <summary>
                          <FileText size={14} />
                          Original source <small>{selected.sourceType}</small>
                        </summary>
                        <p>{selected.source}</p>
                      </details>
                      {prepared ? (
                        <div className="prepared">
                          <div className="practice-header"><span className="eyebrow">YOUR PRACTICE SESSION</span><span>{checkedSteps.length} of {prepared.steps.length} steps checked</span></div>
                          <div className="practice-meter" role="progressbar" aria-label="Practice steps checked for this visit" aria-valuemin={0} aria-valuemax={prepared.steps.length} aria-valuenow={checkedSteps.length}><span style={{ width: `${checkedSteps.length / Math.max(1, prepared.steps.length) * 100}%` }} /></div>
                          <div className="section-title">
                            <h3>{prepared.title}</h3>
                            <span className="tag">
                              {prepared.mode === "live"
                                ? "AI-prepared"
                                : "Local practice"}
                            </span>
                          </div>
                          {prepared.contextRevision !== state.revision && (
                            <p className="warning-text">
                              Your context changed since this was prepared.
                              Refresh if needed.
                            </p>
                          )}
                          <p className="practice-context">{prepared.context}</p>
                          {!!prepared.courseSources?.length && <details className="source-details"><summary>Course excerpts referenced in this practice ({prepared.courseSources.length})</summary>{prepared.courseSources.map((source) => <div key={source.id}><h3>{source.title} · {source.locator}</h3><p>{source.text}</p></div>)}</details>}
                          <ol>
                            {prepared.steps.map((step, i) => (
                              <li key={i} className={checkedSteps.includes(i) ? "step-done" : ""}>
                                <label className="practice-step">
                                  <input type="checkbox" checked={checkedSteps.includes(i)} onChange={() => setCheckedSteps((previous) => previous.includes(i) ? previous.filter((n) => n !== i) : [...previous, i])} />
                                  <span className="step-number" aria-hidden="true">{checkedSteps.includes(i) ? <Check size={16} /> : String(i + 1).padStart(2, "0")}</span>
                                  <span>{step}</span>
                                </label>
                              </li>
                            ))}
                          </ol>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const result = await act(
                                { action: "attempt", id: selected.id, answer },
                                "Saving your attempt and reviewing the response",
                              );
                              if (result) {
                                setAnswer("");
                                setToast(
                                  "Attempt saved. Your next plan can now use this context.",
                                );
                              }
                            }}
                          >
                            <div className="reflection-heading"><span className="eyebrow">PUT IT IN YOUR OWN WORDS</span><h3>What did you figure out?</h3><p>Checking a step is just for this visit. Your saved explanation becomes part of your memory.</p></div>
                            <label htmlFor="attempt">{prepared.question}</label>
                            <textarea
                              id="attempt"
                              aria-describedby="attempt-help"
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              minLength={10}
                              maxLength={6000}
                              required
                              rows={5}
                              placeholder="Write your explanation, what you tried, and anything still unclear…"
                            />
                            <p className="field-help" id="attempt-help">
                              {providers.nebius
                                ? "Feedback will be model-assessed. It does not certify understanding or authorship."
                                : "No model is connected yet. Your response will be saved as self-report, without a correctness claim."}
                            </p>
                            <div className="form-actions">
                              <button
                                className="btn primary"
                                disabled={!!busy || answer.trim().length < 10}
                              >
                                Save my attempt <ArrowRight size={15} />
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                disabled={!!busy}
                                onClick={() => start(selected.id)}
                              >
                                <RefreshCw size={13} />
                                Prepare again
                              </button>
                            </div>
                          </form>
                        </div>
                      ) : (
                        <div className="prepare-empty">
                          <BookOpen size={30} />
                          <h3>Understand it a little better.</h3>
                          <p>
                            Prepare a focused practice prompt around this work,
                            then save what you tried.
                          </p>
                          <button
                            className="btn primary"
                            disabled={!!busy}
                            onClick={() => start(selected.id)}
                          >
                            Prepare a session <ArrowRight size={15} />
                          </button>
                        </div>
                      )}
                      {state.observations
                        .filter((o) => o.workId === selected.id)
                        .map((o) => (
                          <div className="feedback-box" key={o.id}>
                            <span className="tag">
                              {o.method === "self-report"
                                ? "Self-report"
                                : "Model assessment"}
                            </span>
                            <h3>{o.title}</h3>
                            <p>{o.feedback}</p>
                            <details>
                              <summary>Your response</summary>
                              <p>{o.answer}</p>
                            </details>
                          </div>
                        ))}
                    </>
                  ) : (
                    <div className="empty-state">
                      <BookOpen size={30} />
                      <h3>Bring something you're working on.</h3>
                      <p>
                        An assignment, a project excerpt, or a test topic is
                        enough.
                      </p>
                      <button className="btn primary" onClick={openAdd}>
                        Add work
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {view === "memory" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR CONTEXT, UNDER YOUR CONTROL</p>
                  <h1>Your progress, with the context.</h1>
                  <p>
                    See what’s remembered, where it came from, and what it
                    actually means.
                  </p>
                </div>
                <button className="btn subtle" onClick={exportData}>
                  <Download size={16} />
                  Export my data
                </button>
              </div>
              <div className="memory-grid">
                <section className="card">
                  <div className="section-title">
                    <h2>The context you chose</h2>
                    <button
                      className="icon-btn"
                      aria-label="Edit personal context"
                      onClick={() => setModal("profile")}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div className="fact">
                    <small>INTERESTED IN</small>
                    <strong>{state.profile.goal || "Still exploring"}</strong>
                    <span>Self-reported preference · editable</span>
                  </div>
                  <div className="fact">
                    <small>TIME AVAILABLE TODAY</small>
                    <strong>{state.profile.minutes} minutes</strong>
                    <span>Used to keep the next step manageable</span>
                  </div>
                  <div className="memory-principle">
                    <ShieldCheck size={19} />
                    <p>
                      An uploaded artifact is evidence of an artifact. It does
                      not prove authorship, understanding, or mastery.
                    </p>
                  </div>
                </section>
                <section className="card">
                  <div className="section-title">
                    <h2>Confirmed work</h2>
                    <span className="count">{state.works.length}</span>
                  </div>
                  {state.works.length ? (
                    state.works.map((w) => (
                      <div className="memory-work" key={w.id}>
                        <div>
                          <strong>{w.title}</strong>
                          <small>
                            {w.sourceType} ·{" "}
                            {dayLabel(w.dueDate, state.profile.timezone)}
                          </small>
                        </div>
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${w.title}`}
                          onClick={() => {
                            setSelectedId(w.id);
                            setModal("edit");
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-btn danger"
                          aria-label={`Remove ${w.title}`}
                          onClick={async () => {
                            if (
                              window.confirm(
                                "Remove this work, its source and related attempts from this disposable workspace? Future plans will stop using them.",
                              )
                            )
                              await act(
                                { action: "deleteWork", id: w.id },
                                "Removing source and dependent records",
                              );
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <FileText size={25} />
                      <h3>No work remembered yet.</h3>
                      <button className="text-button" onClick={openAdd}>
                        Add work
                      </button>
                    </div>
                  )}
                </section>
              </div>
              <section className="card observation-list">
                <div className="section-title">
                  <h2>Your attempts & observations</h2>
                  <span className="count">{state.observations.length}</span>
                </div>
                {state.observations.length ? (
                  [...state.observations].reverse().map((o) => (
                    <article className="observation" key={o.id}>
                      <div className="observation-heading">
                        <span className="tag">
                          {o.method === "self-report"
                            ? "Self-report · not evaluated"
                            : "Model assessment · not certification"}
                        </span>
                        <button
                          className="icon-btn danger"
                          aria-label={`Remove observation ${o.title}`}
                          onClick={async () => {
                            if (
                              window.confirm(
                                "Remove this observation from this disposable workspace? Future advice will no longer use it.",
                              )
                            )
                              await act(
                                { action: "removeObservation", id: o.id },
                                "Updating memory",
                              );
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <h3>{o.title}</h3>
                      <p>{o.feedback}</p>
                      <details>
                        <summary>View your answer and source</summary>
                        <p>{o.answer}</p>
                        <small>
                          Source:{" "}
                          {state.works.find((w) => w.id === o.workId)?.title ||
                            "Removed"}
                        </small>
                      </details>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <Leaf size={28} />
                    <h3>Your trail starts with an attempt.</h3>
                    <p>
                      Work through a session and save your response. No
                      readiness scores. Just what was actually observed.
                    </p>
                    <button className="btn subtle" onClick={() => go("work")}>
                      Open my work <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {view === "direction" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">CONNECT THE DOTS, AT YOUR PACE</p>
                  <h1>Explore what you could build towards.</h1>
                  <p>
                    Explore real requirements alongside the work you can
                    actually show.
                  </p>
                </div>
                <Compass size={36} className="heading-icon" />
              </div>
              <section className="card role-search">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await act(
                      { action: "direction", role: role || state.profile.goal },
                      "Finding public role sources and comparing observations",
                    );
                  }}
                >
                  <label htmlFor="role">A role you're curious about</label>
                  <div className="search-input-row">
                    <input
                      id="role"
                      value={role || state.profile.goal}
                      onChange={(e) => setRole(e.target.value)}
                      maxLength={120}
                      required
                      placeholder="e.g. Backend development internship"
                    />
                    <button
                      className="btn primary"
                      disabled={!!busy || !providers.tavily}
                    >
                      Explore roles <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <p className="field-help">
                    A small sample of public sources, not a complete job market
                    or a prediction of your chances.
                  </p>
                </form>
              </section>
              {!providers.tavily && (
                <div className="connection-empty">
                  <span className="trail-icon">
                    <Link2 size={25} />
                  </span>
                  <div>
                    <h2>Real sources need a real connection.</h2>
                    <p>
                      Tavily isn't configured yet. Once connected, this view
                      will retrieve public role sources. We won't fill it with
                      invented postings or readiness scores.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setModal("integrations")}
                    >
                      View connection setup <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
              {state.direction && (
                <>
                  <section className="card direction-summary">
                    <span className="tag">
                      {state.direction.mode === "live"
                        ? "Model comparison · source-linked"
                        : "Retrieved sources · not model-assessed"}
                    </span>
                    <h2>{state.direction.role}</h2>
                    <p>{state.direction.summary}</p>
                    <small>
                      Refreshed{" "}
                      {new Date(state.direction.updatedAt).toLocaleString(
                        "en-IN",
                      )}{" "}
                      · Check each posting's eligibility and open status.
                    </small>
                    {state.direction.requirements.map((r, i) => (
                      <div className="requirement" key={i}>
                        <strong>{r.requirement}</strong>
                        <span className="tag">
                          {r.evidenceIds.length
                            ? "Related observations available"
                            : "Not observed here"}
                        </span>
                        <p>{r.nextStep}</p>
                        {r.evidenceIds.map((id) => (
                          <button
                            className="text-button"
                            key={id}
                            onClick={() => go("memory")}
                          >
                            <Link2 size={12} />
                            {state.observations.find((o) => o.id === id)?.title}
                          </button>
                        ))}
                      </div>
                    ))}
                  </section>
                  <h2 className="list-heading">Sources to inspect</h2>
                  <div className="sources-grid">
                    {state.direction.sources.map((s) => (
                      <a
                        className="card role-source"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={s.url}
                      >
                        <span className="source-domain">
                          {new URL(s.url).hostname}
                          <ArrowUpRight size={15} />
                        </span>
                        <h3>{s.title}</h3>
                        <p>{s.excerpt}</p>
                        <small>
                          Retrieved{" "}
                          {new Date(s.retrievedAt).toLocaleDateString("en-IN")}
                        </small>
                      </a>
                    ))}
                  </div>
                </>
              )}
              <div className="direction-footnote">
                <Flag size={17} />
                <p>
                  Sometimes the right next step is finishing tomorrow’s
                  assignment. Career extras can wait.
                </p>
              </div>
            </>
          )}

          <footer className="app-footer">
            <span>Small steps. A clearer direction.</span>
            <span>Built with care · Stride</span>
          </footer>
        </main>
      </div>

      <nav className="mobile-tabs" aria-label="Mobile navigation">
        {navigation.map((n) => <button key={n.id} aria-current={view === n.id ? "page" : undefined} onClick={() => go(n.id)}><n.icon size={20} /><span>{n.name}</span></button>)}
      </nav>
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className={`modal ${modal === "add" || modal === "course" ? "wide" : ""}`}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {modal === "add"
                    ? "BRING WHAT'S IN FRONT OF YOU"
                    : "YOUR WORKSPACE"}
                </p>
                <h2 id="modal-title">
                  {modal === "course" ? "Your course library." : modal === "add"
                    ? candidate
                      ? "Check the details."
                      : "Add a piece of coursework."
                    : modal === "profile"
                      ? "Your study preferences."
                      : modal === "edit"
                        ? "Keep your context accurate."
                        : "Your connections."}
                </h2>
              </div>
              <button
                className="icon-btn"
                aria-label="Close dialog"
                disabled={!!busy}
                onClick={() => setModal(null)}
              >
                <X size={21} />
              </button>
            </div>
            {error && (
              <div className="error-banner" role="alert">
                {error}
              </div>
            )}
            {busy && (
              <div className="progress-banner" role="status">
                <span className="progress-line" />
                {busy}…
              </div>
            )}
            {modal === "course" && <CourseLibrary state={state} onState={setState} />}
            {modal === "add" &&
              (!candidate ? (
                <form onSubmit={extract}>
                  <p className="modal-description">
                    Paste an assignment, a class message, or a project excerpt.
                    Keep unrelated personal details out.
                  </p>
                  <label htmlFor="sourceType">Where is this from?</label>
                  <select
                    id="sourceType"
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                  >
                    {[
                      "Class notes",
                      "WhatsApp",
                      "Email",
                      "Assignment",
                      "Project",
                      "Voice capture",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <label htmlFor="source">Your work or notice</label>
                  <textarea
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    minLength={10}
                    maxLength={12000}
                    rows={7}
                    required
                    placeholder="e.g. DBMS assignment: write INNER and LEFT JOIN queries. Due 2026-10-28. Explain unmatched rows."
                    autoFocus
                  />
                  <p className="field-help">
                    {providers.nebius
                      ? "Selected text will be sent to Nebius for extraction. Review the result before saving."
                      : "Local guidance recognizes simple text and ISO dates. An AI key is not configured yet."}
                  </p>
                  <button
                    className="btn primary"
                    disabled={!!busy || source.trim().length < 10}
                  >
                    Review the details <ArrowRight size={15} />
                  </button>
                </form>
              ) : (
                <form onSubmit={confirm}>
                  <div className="review-note">
                    <ShieldCheck size={18} />
                    <p>
                      {candidate.uncertainty ||
                        "Review these details before they influence your plan."}
                    </p>
                  </div>
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    value={candidate.title}
                    onChange={(e) =>
                      setCandidate({ ...candidate, title: e.target.value })
                    }
                    maxLength={160}
                    required
                  />
                  <div className="form-grid">
                    <div>
                      <label htmlFor="subject">Subject</label>
                      <input
                        id="subject"
                        value={candidate.subject}
                        onChange={(e) =>
                          setCandidate({
                            ...candidate,
                            subject: e.target.value,
                          })
                        }
                        maxLength={80}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="kind">Type</label>
                      <select
                        id="kind"
                        value={candidate.kind}
                        onChange={(e) =>
                          setCandidate({
                            ...candidate,
                            kind: e.target.value as Intake["kind"],
                          })
                        }
                      >
                        {["assignment", "exam", "project", "revision"].map(
                          (k) => (
                            <option key={k}>{k}</option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <label htmlFor="date">
                    Confirmed due date <span className="muted">(optional)</span>
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={candidate.dueDate || ""}
                    onChange={(e) =>
                      setCandidate({
                        ...candidate,
                        dueDate: e.target.value || null,
                      })
                    }
                  />
                  <p className="field-help">
                    Leave blank if unknown. A copied “tomorrow” needs the
                    original message date.
                  </p>
                  <div className="form-actions">
                    <button className="btn primary" disabled={!!busy}>
                      Confirm & save work <Check size={15} />
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setCandidate(null)}
                    >
                      Back to source
                    </button>
                  </div>
                </form>
              ))}
            {modal === "profile" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const result = await act(
                    {
                      action: "profile",
                      name: String(data.get("name")),
                      year: String(data.get("year")),
                      goal: String(data.get("goal")),
                      minutes: Number(data.get("minutes")),
                    },
                    "Saving your context",
                  );
                  if (result) {
                    setModal(null);
                    setToast(
                      "Context saved. Refresh Today to adapt your next step.",
                    );
                  }
                }}
              >
                <label htmlFor="name">What should we call you?</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={state.profile.name}
                  maxLength={60}
                  required
                />
                <div className="form-grid">
                  <div>
                    <label htmlFor="year">College year</label>
                    <select
                      id="year"
                      name="year"
                      defaultValue={state.profile.year}
                    >
                      <option>2nd year</option>
                      <option>3rd year</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="minutes">Minutes to focus</label>
                    <input
                      id="minutes"
                      name="minutes"
                      type="number"
                      min={5}
                      max={180}
                      step={5}
                      defaultValue={state.profile.minutes}
                      required
                    />
                  </div>
                </div>
                <label htmlFor="goal">
                  A role you're curious about{" "}
                  <span className="muted">(optional)</span>
                </label>
                <input
                  id="goal"
                  name="goal"
                  defaultValue={state.profile.goal}
                  maxLength={120}
                  placeholder="Still exploring is completely fine"
                />
                <p className="field-help">
                  Your academic work comes first. This preference is editable
                  and isn't a permanent career decision.
                </p>
                <button className="btn primary" disabled={!!busy}>
                  Save my context <Check size={15} />
                </button>
              </form>
            )}
            {modal === "edit" && selected && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const result = await act(
                    {
                      action: "editWork",
                      id: selected.id,
                      title: String(data.get("title")),
                      dueDate: data.get("date") || null,
                    },
                    "Updating confirmed details",
                  );
                  if (result) {
                    setModal(null);
                    setToast(
                      "Details corrected. Previous plans are now marked stale.",
                    );
                  }
                }}
              >
                <label htmlFor="editTitle">Title</label>
                <input
                  id="editTitle"
                  name="title"
                  defaultValue={selected.title}
                  maxLength={160}
                  required
                />
                <label htmlFor="editDate">Confirmed deadline</label>
                <input
                  id="editDate"
                  name="date"
                  type="date"
                  defaultValue={selected.dueDate || ""}
                />
                <p className="field-help">
                  Corrections change future advice. Your original source remains
                  available for context.
                </p>
                <button className="btn primary" disabled={!!busy}>
                  Save correction <Check size={15} />
                </button>
              </form>
            )}
            {modal === "integrations" && (
              <div className="connections">
                <p className="modal-description">
                  See which services are available and when live assistance last
                  worked.
                </p>
                <div className="connection-item">
                  <span className="connection-logo">N</span>
                  <div>
                    <h3>Study assistance</h3>
                    <p>NVIDIA · Nebius Token Factory</p>
                    <p>{connection.description}</p>
                    {providers.model && (
                      <details>
                        <summary>Model details</summary>
                        <p>{providers.model}</p>
                      </details>
                    )}
                  </div>
                  <span className="tag">{connection.label}</span>
                </div>
                <div className="connection-item">
                  <span className="connection-logo tavily">T</span>
                  <div>
                    <h3>Opportunity search</h3>
                    <p>Tavily</p>
                    <p>
                      {providers.tavily
                        ? "Configured for public role searches. Each result includes its source and retrieval time."
                        : "Not connected yet. Live internship sources are unavailable."}
                    </p>
                  </div>
                  <span className="tag">
                    {providers.tavily ? "Configured" : "Setup needed"}
                  </span>
                </div>
                <div className="setup-note">
                  <ShieldCheck size={19} />
                  <div>
                    <strong>Your work, your choices.</strong>
                    <p>
                      Selected text is sent to connected AI services when you
                      ask for help. Avoid passwords and unrelated personal
                      details. Connections are managed on Stride’s server; you
                      don't need to enter API keys here.
                    </p>
                  </div>
                </div>
                <p className="field-help">
                  Development preview: this workspace is saved for this browser.
                  Cross-device sign-in and automatic daily briefs are not
                  available yet.
                </p>
                <button
                  className="btn subtle"
                  onClick={async () => {
                    await load();
                    setToast("Configuration status refreshed.");
                  }}
                >
                  Refresh status <RefreshCw size={14} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
