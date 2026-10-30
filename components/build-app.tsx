"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { BuildAttempt, BuildSnapshot } from "@/lib/build-types";
import { RequestError, connectionMessage, requestJson } from "@/lib/client-request";
import { launchPipChat } from "@/lib/pip-navigation";
import SignOut from "./sign-out";
import BuildAttachment from "./build-attachment";
import BuildStudio from "./build-studio";

const STARTERS = [
  {
    id: "football",
    label: "Football organiser",
    subject: "Computer Science",
    idea: "A simple football team organiser where a campus club can share fixtures, mark who is available and see who is playing each week.",
  },
  {
    id: "lost-found",
    label: "Campus lost & found",
    subject: "Software Engineering",
    idea: "A campus lost-and-found board where students post found items, search by place and claim something that belongs to them.",
  },
  {
    id: "study",
    label: "Study session tool",
    subject: "Computer Science",
    idea: "A study tool that turns one topic and a free hour into a short practice set, then records what I got wrong.",
  },
] as const;

const SUBJECTS = [
  "Computer Science",
  "Software Engineering",
  "Information Systems",
  "Mathematics",
  "Design",
  "Business",
  "Other",
];

const MINUTES = [15, 30, 60] as const;
type Minutes = (typeof MINUTES)[number];
type Action = "create" | "submit" | "advance" | "pause" | "resume" | "delete";
type Retry = { action: Action; requestId: string; payload: Record<string, unknown> };

const dayFormat = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const momentFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let index = 0; index < 16; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dayFormat.format(date);
}

function formatMoment(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : momentFormat.format(date);
}

function firstLine(text: string) {
  const line = text.trim().split("\n")[0] ?? "";
  return line.length > 96 ? `${line.slice(0, 96)}…` : line;
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "project"
  );
}

function scrollToId(id: string) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(id);
  if (!element) return;
  const reduced =
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  element.focus({ preventScroll: true });
}

function Blueprint() {
  const raw = useId();
  const grid = `bp-grid-${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg className="build-blueprint-art" viewBox="0 0 520 300" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={grid} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
      </defs>
      <rect className="bp-board" x="1" y="1" width="518" height="298" rx="18" />
      <rect
        x="1"
        y="1"
        width="518"
        height="298"
        rx="18"
        fill={`url(#${grid})`}
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <path className="bp-line" d="M174 60H208" strokeDasharray="5 5" />
      <path className="bp-line" d="M338 60H372" strokeDasharray="5 5" />
      <path className="bp-line" d="M434 92V120" strokeDasharray="5 5" />
      <path className="bp-line" d="M372 152H338" strokeDasharray="5 5" />
      <path className="bp-line" d="M273 184V212" strokeDasharray="5 5" />
      <g className="bp-node">
        <rect x="24" y="28" width="150" height="64" rx="12" />
        <text className="bp-title" x="40" y="56">idea</text>
        <text className="bp-sub" x="40" y="76">one sentence</text>
      </g>
      <g className="bp-node bp-accent">
        <rect x="208" y="28" width="130" height="64" rx="12" />
        <text className="bp-title" x="224" y="56">step 01</text>
        <text className="bp-sub" x="224" y="76">15 minutes</text>
      </g>
      <g className="bp-node">
        <rect x="372" y="28" width="124" height="64" rx="12" />
        <text className="bp-title" x="388" y="56">attempt</text>
        <text className="bp-sub" x="388" y="76">real work</text>
      </g>
      <g className="bp-node">
        <rect x="372" y="120" width="124" height="64" rx="12" />
        <text className="bp-title" x="388" y="148">feedback</text>
        <text className="bp-sub" x="388" y="168">noticed</text>
      </g>
      <g className="bp-node">
        <rect x="208" y="120" width="130" height="64" rx="12" />
        <text className="bp-title" x="224" y="148">next</text>
        <text className="bp-sub" x="224" y="168">one move</text>
      </g>
      <g className="bp-node bp-outline">
        <rect x="24" y="212" width="472" height="64" rx="12" strokeDasharray="6 6" />
        <text className="bp-title" x="40" y="240">your build</text>
        <text className="bp-sub" x="40" y="260">one step at a time, kept in one place</text>
      </g>
      <circle className="bp-dot" cx="191" cy="60" r="3" />
      <circle className="bp-dot" cx="355" cy="60" r="3" />
      <circle className="bp-dot" cx="434" cy="106" r="3" />
      <circle className="bp-dot" cx="355" cy="152" r="3" />
      <circle className="bp-dot" cx="273" cy="198" r="3" />
    </svg>
  );
}

function AttemptDetail({ attempt }: { attempt: BuildAttempt }) {
  return (
    <div className="build-attempt-body">
      <div className="build-snapshot">
        <h4>Original step</h4>
        <p>{attempt.step.task}</p>
        <dl>
          <div>
            <dt>Deliverable</dt>
            <dd>{attempt.step.deliverable}</dd>
          </div>
          <div>
            <dt>Question</dt>
            <dd>{attempt.step.question}</dd>
          </div>
        </dl>
      </div>
      <div>
        <h4>Your attempt</h4>
        <pre>{attempt.text}</pre>
      </div>
      <div className="build-feedback-grid">
        <section>
          <h4>Noticed</h4>
          <p>{attempt.feedback.noticed}</p>
        </section>
        <section>
          <h4>Improve</h4>
          <p>{attempt.feedback.improve}</p>
        </section>
        <section>
          <h4>Question</h4>
          <p>{attempt.feedback.question}</p>
        </section>
      </div>
      {attempt.sources.length > 0 && (
        <details className="build-sources">
          <summary>Saved work used</summary>
          <ul>
            {attempt.sources.map((source) => (
              <li key={source.id}>
                <strong>{source.title}</strong>
                {source.locator && <span>{source.locator}</span>}
                <p>{source.excerpt}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="build-next">
        <p className="build-overline">Suggested next step</p>
        <h4>{attempt.feedback.next.title}</h4>
        <p>{attempt.feedback.next.task}</p>
      </div>
    </div>
  );
}

export default function BuildApp() {
  const [snapshot, setSnapshot] = useState<BuildSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<Action | "">("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState<Retry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [starter, setStarter] = useState<string | null>(null);
  const [idea, setIdea] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [minutes, setMinutes] = useState<Minutes>(30);
  const [draftText, setDraftText] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [attachmentPending,setAttachmentPending]=useState(false);
  const [attemptPage,setAttemptPage]=useState(0);
  const [deskTab,setDeskTab]=useState<"workspace"|"attempts"|"plan">("workspace");

  const createIdRef = useRef("");
  const submitIdRef = useRef("");
  const restoredDraft=useRef("");
  const pipLeaving=useRef(false);

  const project = snapshot?.build.project ?? null;
  const evidence = snapshot?.evidence ?? [];
  const paused = Boolean(project?.paused);
  const awaitingNext = Boolean(project?.awaitingNext);
  const working = busy !== "";
  const creating = busy === "create";

  useEffect(()=>{
    if(!project||restoredDraft.current===project.id)return;
    restoredDraft.current=project.id;
    try{const saved=JSON.parse(sessionStorage.getItem('stride-build-draft-'+project.id)||'null');if(saved?.step===project.current.title&&typeof saved.text==='string')setDraftText(saved.text.slice(0,6000));}catch{}
  },[project]);
  const subjects = useMemo(() => {
    const all = new Set(SUBJECTS);
    for (const item of snapshot?.coursework ?? []) all.add(item.subject);
    if (project?.subject) all.add(project.subject);
    return Array.from(all);
  }, [snapshot, project?.subject]);

  const attempts = useMemo(() => {
    if (!project) return [] as BuildAttempt[];
    return [...project.attempts].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }, [project]);
  const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const currentIndex = project ? project.milestones.findIndex((step) => step.title === project.current.title) : -1;

  const refreshSnapshot = useCallback(async () => {
    try {
      const data = await requestJson<BuildSnapshot>("/api/build", { cache: "no-store" }, { retryNetwork: true });
      setSnapshot(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await requestJson<BuildSnapshot>("/api/build", { cache: "no-store" }, { retryNetwork: true });
      setSnapshot(data);
    } catch (caught) {
      if (caught instanceof RequestError && caught.code === "SESSION_EXPIRED") {
        try {
          await requestJson<{ ready?: boolean }>("/api/workspace?bootstrap=1", { cache: "no-store" }, { retryNetwork: true });
          const data = await requestJson<BuildSnapshot>("/api/build", { cache: "no-store" }, { retryNetwork: true });
          setSnapshot(data);
        } catch (inner) {
          setLoadError(
            connectionMessage(inner, "Couldn’t start your build workspace. Check your connection and try again."),
          );
        }
      } else {
        setLoadError(connectionMessage(caught, "Couldn’t open your build desk. Check your connection and try again."));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (confirmDelete) document.getElementById("build-delete-cancel")?.focus();
  }, [confirmDelete]);

  useEffect(() => {
    let leaving = false;
    const signedOut = () => {
      leaving = true;
      try{for(const key of Object.keys(sessionStorage))if(key.startsWith("stride-build-draft-"))sessionStorage.removeItem(key);}catch{}
      setSnapshot(null);
      setDraftText("");
      setIdea("");
      setStarter(null);
      setEvidenceId("");
      setActionError("");
      setNotice("");
      setRetry(null);
      setConfirmDelete(false);
      createIdRef.current = "";
      submitIdRef.current = "";
    };
    const warn = (event: BeforeUnloadEvent) => {
      if (!leaving && !pipLeaving.current && (draftText.trim() || (!project && idea.trim()))) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("stride-signout", signedOut);
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("stride-signout", signedOut);
      window.removeEventListener("beforeunload", warn);
    };
  }, [draftText, idea, project]);

  function afterSuccess(action: Action) {
    if(["create","submit","advance"].includes(action))setDeskTab("workspace");
    if(project&&["submit","delete","advance"].includes(action))try{sessionStorage.removeItem("stride-build-draft-"+project.id);}catch{}
    if(action==="submit")setAttemptPage(0);
    if (action === "create") {
      createIdRef.current = "";
      setStarter(null);
      setDraftText("");
      setEvidenceId("");
      setNotice("Your first step is ready.");
      window.setTimeout(() => scrollToId("build-workbench"), 80);
    } else if (action === "submit") {
      submitIdRef.current = "";
      setDraftText("");
      setEvidenceId("");
      setNotice("Attempt saved.");
      window.setTimeout(() => scrollToId("build-feedback"), 80);
    } else if (action === "advance") {
      setNotice("New step open. It builds on the attempt you just saved.");
      window.setTimeout(() => scrollToId("build-workbench"), 80);
    } else if (action === "pause") {
      setNotice("Build paused for exams. Resume when you have room for one step.");
    } else if (action === "resume") {
      setNotice("Build resumed. Your current step is waiting.");
    } else if (action === "delete") {
      createIdRef.current = "";
      submitIdRef.current = "";
      setDraftText("");
      setEvidenceId("");
      setIdea("");
      setStarter(null);
      setConfirmDelete(false);
      setNotice("Build deleted. Start another idea when you’re ready.");
    }
  }

  async function runAction(action: Action, requestId: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    setActionError("");
    setNotice("");
    try {
      const data = await requestJson<BuildSnapshot>(
        "/api/build",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, requestId, ...payload }),
        },
        { retryNetwork: false },
      );
      setSnapshot(data);
      setRetry(null);
      afterSuccess(action);
      return data;
    } catch (caught) {
      if (caught instanceof RequestError && caught.code === "BUILD_STALE") {
        await refreshSnapshot();
        createIdRef.current="";submitIdRef.current="";
        setRetry(null);
        setActionError("Your build changed. The latest version is loaded; your draft is still here.");
      } else {
        setActionError(connectionMessage(caught, "That request didn’t go through. Your draft is still here."));
        setRetry({ action, requestId, payload });
      }
      return null;
    } finally {
      setBusy("");
    }
  }

  async function startBuild() {
    if (working) return;
    const trimmed = idea.trim();
    if (!trimmed) {
      setActionError("Write one sentence about the idea first.");
      setRetry(null);
      return;
    }
    const requestId = createIdRef.current || (createIdRef.current = newId());
    await runAction("create", requestId, { version:snapshot?.build.version??0, idea: trimmed, subject, minutes });
  }

  async function saveAttempt() {
    if (!snapshot?.build.project || paused || awaitingNext || working || attachmentPending) return;
    const trimmed = draftText.trim();
    if (trimmed.length < 10) {
      setActionError("Add at least 10 characters about what you built or tried.");
      setRetry(null);
      return;
    }
    if (trimmed.length > 6000) {
      setActionError("Keep the attempt under 6000 characters.");
      setRetry(null);
      return;
    }
    const requestId = submitIdRef.current || (submitIdRef.current = newId());
    const payload: Record<string, unknown> = { version: snapshot.build.version, text: trimmed };
    if (evidenceId) payload.evidenceId = evidenceId;
    await runAction("submit", requestId, payload);
  }

  async function advanceStep() {
    if (!snapshot?.build.project || paused || working) return;
    await runAction("advance", newId(), { version: snapshot.build.version });
  }

  async function pauseOrResume(resume: boolean) {
    if (!snapshot?.build.project || working) return;
    await runAction(resume ? "resume" : "pause", newId(), { version: snapshot.build.version });
  }

  async function deleteBuild() {
    if (!snapshot?.build.project || working) return;
    await runAction("delete", newId(), { version: snapshot.build.version });
  }

  async function retryLast() {
    if (!retry || working) return;
    await runAction(retry.action, retry.requestId, retry.payload);
  }

  function askPip() {
    if (!project) return;
    if(draftText.trim())try{sessionStorage.setItem("stride-build-draft-"+project.id,JSON.stringify({step:project.current.title,text:draftText}));pipLeaving.current=true;}catch{}
    const latestAttempt = attempts[attempts.length - 1];
    const text = [
      `Help me with my build: ${project.title}.`,
      `Current step: ${project.current.title}`,
      project.current.task,
      latestAttempt ? `My latest attempt:\n${latestAttempt.text.slice(0, 1200)}` : "I haven’t saved an attempt yet.",
      "Ask me what I’ve tried before suggesting the next move.",
    ]
      .join("\n\n")
      .slice(0, 3000);
    launchPipChat(text, false);
  }

  function exportProject() {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stride-build-${slug(project.title)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Project JSON downloaded to this device.");
  }

  const statusLabel = paused
    ? "Paused for exams"
    : awaitingNext
      ? "Attempt saved — ready to continue"
      : "In progress";

  return (
    <div className="build-desk">
      <a className="build-skip" href="#build-main">
        Skip to your build
      </a>
      <header className="build-header">
        <div className="build-header-inner">
          <Link href="/workspace" className="build-brand" aria-label="Stride workspace">
            stride<span aria-hidden="true">.</span>
          </Link>
          <nav className="build-header-nav" aria-label="Build page">
            <Link href="/workspace" className="build-back">
              <ArrowLeft size={18} aria-hidden="true" />
              <span>Workspace</span>
            </Link>
            <Link href="/settings" className="build-header-link">
              <Settings size={18} aria-hidden="true" />
              <span>Settings</span>
            </Link>
            <SignOut />
          </nav>
        </div>
      </header>

      <main className="build-main" id="build-main" aria-busy={working}>
        {actionError && (
          <div className="build-alert" role="alert">
            <p>{actionError}</p>
            {retry && (
              <button
                type="button"
                className="build-button build-button-secondary build-button-small"
                onClick={() => void retryLast()}
                disabled={working}
              >
                Try again
              </button>
            )}
          </div>
        )}
        {notice && (
          <p className="build-notice" role="status">
            {notice}
          </p>
        )}

        {loading && !snapshot ? (
          <section className="build-loading" aria-busy="true" aria-live="polite">
            <div className="build-skeleton build-skeleton-title" />
            <div className="build-skeleton build-skeleton-copy" />
            <div className="build-skeleton-grid">
              <div className="build-skeleton build-skeleton-card" />
              <div className="build-skeleton build-skeleton-card" />
            </div>
            <p className="build-help">Opening your build desk…</p>
          </section>
        ) : loadError && !snapshot ? (
          <section className="build-error-state" role="alert">
            <Code2 size={40} aria-hidden="true" />
            <p className="build-overline">My Build</p>
            <h1>Your build desk didn’t open.</h1>
            <p>{loadError}</p>
            <button type="button" className="build-button build-button-primary" onClick={() => void load()}>
              Try again
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        ) : !project ? (
          <section className="build-empty" aria-labelledby="build-empty-title">
            <div className="build-empty-copy">
              <p className="build-overline">My Build</p>
              <h1 id="build-empty-title">Turn one idea into something you can show.</h1>
              <p className="build-lede">
                Stride drafts a first step, then responds to what you actually make. One project at a time.
              </p>

              <form
                className="build-start"
                onSubmit={(event) => {
                  event.preventDefault();
                  void startBuild();
                }}
              >
                <fieldset className="build-fieldset">
                  <legend className="build-label">Start from an idea</legend>
                  <div className="build-starters">
                    {STARTERS.map((item) => {
                      const selected = starter === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`build-starter${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          disabled={working}
                          onClick={() => {
                            setStarter(item.id);
                            setIdea(item.idea);
                            setSubject(item.subject);
                            setActionError("");
                            setRetry(null);
                            createIdRef.current = "";
                          }}
                        >
                          <span className="build-starter-top">
                            <Sparkles size={17} aria-hidden="true" />
                            <span>{item.label}</span>
                            {selected && <Check size={17} aria-hidden="true" />}
                          </span>
                          <span className="build-starter-idea">{item.idea}</span>
                          <span className="build-starter-subject">{item.subject}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="build-field">
                  <label htmlFor="build-idea">Or write your own idea</label>
                  <textarea
                    id="build-idea"
                    value={idea}
                    rows={4}
                    maxLength={600}
                    disabled={working}
                    placeholder="A small tool that helps students…"
                    aria-describedby="build-idea-help"
                    onChange={(event) => {
                      setIdea(event.target.value);
                      setStarter(null);
                      setActionError("");
                      setRetry(null);
                      createIdRef.current = "";
                    }}
                  />
                  <p id="build-idea-help" className="build-help">
                    One or two sentences. Stride turns it into a first step, not a finished plan.
                  </p>
                </div>

                <div className="build-start-row">
                  <div className="build-field">
                    <label htmlFor="build-subject">Subject</label>
                    <input id="build-subject" list="build-subjects" maxLength={80} value={subject} disabled={creating} onChange={event=>{setSubject(event.target.value);setStarter(null);createIdRef.current="";}}/>
                    <datalist id="build-subjects">{subjects.map(item=><option key={item} value={item}/>)}</datalist>
                  </div>

                  <fieldset className="build-fieldset build-minutes">
                    <legend className="build-label">Time for the first step</legend>
                    <div className="build-segments">
                      {MINUTES.map((option) => (
                        <label key={option} className="build-segment">
                          <input
                            type="radio"
                            name="build-minutes"
                            value={option}
                            checked={minutes === option}
                            disabled={working}
                            onChange={() => {
                              setMinutes(option);
                              createIdRef.current = "";
                            }}
                          />
                          <span><strong>{option}</strong><small>min</small></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="build-start-actions">
                  <button
                    type="submit"
                    className="build-button build-button-primary"
                    disabled={working || !idea.trim()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="build-spin" size={18} aria-hidden="true" />
                        Starting your build…
                      </>
                    ) : (
                      <>
                        Start my build
                        <ArrowRight size={18} aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="build-pending-note" aria-live="polite">
                    {creating
                      ? "Putting your first step together…"
                      : "A small first step, shaped around your idea."}
                  </p>
                </div>
              </form>
            </div>

            <aside className="build-blueprint" aria-label="How a build works">
              <Blueprint />
              <h2>How a build works</h2>
              <ol className="build-blueprint-steps">
                <li>
                  <span>
                    <strong>Bring one idea.</strong> Small and specific is enough.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Make one real attempt.</strong> Code or a clear explanation.
                  </span>
                </li>
                <li>
                  <span>
                    <strong>Get a next step.</strong> Stride responds to the work, not a score.
                  </span>
                </li>
              </ol>
            </aside>
          </section>
        ) : (
          <section className="build-project" aria-labelledby="build-project-title">
            <div className="build-toolbar">
              <p className="build-status">
                <span className={`build-dot${paused ? " is-paused" : " is-live"}`} aria-hidden="true" />
                {statusLabel}
              </p>
              <div className="build-toolbar-actions">
                <button type="button" className="build-button build-button-quiet" onClick={exportProject}>
                  <Download size={17} aria-hidden="true" />
                  Export JSON
                </button>
                {paused ? (
                  <button
                    type="button"
                    className="build-button build-button-secondary"
                    disabled={working}
                    onClick={() => void pauseOrResume(true)}
                  >
                    {busy === "resume" ? (
                      <Loader2 className="build-spin" size={17} aria-hidden="true" />
                    ) : (
                      <Play size={17} aria-hidden="true" />
                    )}
                    Resume build
                  </button>
                ) : (
                  <button
                    type="button"
                    className="build-button build-button-secondary"
                    disabled={working}
                    onClick={() => void pauseOrResume(false)}
                  >
                    {busy === "pause" ? (
                      <Loader2 className="build-spin" size={17} aria-hidden="true" />
                    ) : (
                      <Pause size={17} aria-hidden="true" />
                    )}
                    Pause for exams
                  </button>
                )}
                <button
                  type="button"
                  className="build-button build-button-danger"
                  disabled={working}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>

            {confirmDelete && (
              <div
                className="build-confirm"
                role="alertdialog"
                aria-labelledby="build-delete-title"
                aria-describedby="build-delete-copy"
              >
                <div>
                  <h2 id="build-delete-title">Delete this build?</h2>
                  <p id="build-delete-copy">
                    This removes the project and its {project.attempts.length} saved{" "}
                    {project.attempts.length === 1 ? "attempt" : "attempts"}. Journal evidence stays where it is.
                  </p>
                </div>
                <div className="build-confirm-actions">
                  <button
                    type="button"
                    className="build-button build-button-danger"
                    disabled={busy === "delete"}
                    onClick={() => void deleteBuild()}
                  >
                    {busy === "delete" ? (
                      <Loader2 className="build-spin" size={17} aria-hidden="true" />
                    ) : (
                      <Trash2 size={17} aria-hidden="true" />
                    )}
                    Yes, delete it
                  </button>
                  <button
                    type="button"
                    id="build-delete-cancel"
                    className="build-button build-button-secondary"
                    disabled={busy === "delete"}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Keep my build
                  </button>
                </div>
              </div>
            )}

            {deskTab==="workspace"&&<h1 className="build-mobile-title">{project.title}</h1>}
            <nav className="build-view-tabs" aria-label="Build views">{([['workspace','Workspace'],['attempts','My attempts'],['plan','Plan']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={deskTab===id} disabled={working} onClick={()=>setDeskTab(id)}>{label}{id==='attempts'&&<span>{attempts.length}</span>}</button>)}</nav>
            {deskTab!=="workspace"&&<h1 className="build-compact-title">{project.title}</h1>}
            <div className="build-grid" hidden={deskTab!=="workspace"}>
              <article className="build-poster" aria-labelledby="build-project-title">
                <div className="build-poster-mark" aria-hidden="true">
                  {"{ }"}
                </div>
                <p className="build-overline">{project.subject} · My Build</p>
                <h1 id="build-project-title">{project.title}</h1>
                <p className="build-poster-idea">{project.idea}</p>
                {project.why && <p className="build-poster-why">{project.why}</p>}

                <dl className="build-poster-meta">
                  <div>
                    <dt>Started</dt>
                    <dd>{formatDate(project.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Attempts</dt>
                    <dd>{project.attempts.length}</dd>
                  </div>
                  <div>
                    <dt>Chapters</dt>
                    <dd>{project.milestones.length}</dd>
                  </div>
                </dl>

                <div className="build-poster-actions">
                  <button type="button" className="build-link-button" onClick={askPip}>
                    <MessageCircle size={17} aria-hidden="true" />
                    Ask Pip about this step
                  </button>
                  <Link href="/journal" className="build-link-button">
                    <FileText size={17} aria-hidden="true" />
                    Open Journal
                  </Link>
                </div>
              </article>

              <section
                className="build-workbench"
                id="build-workbench"
                tabIndex={-1}
                aria-labelledby="build-workbench-title"
              >
                <div className="build-workbench-head">
                  <p className="build-overline">
                    {currentIndex >= 0
                      ? `Step ${String(currentIndex + 1).padStart(2, "0")}`
                      : "Current step"}{" "}
                    · {project.current.minutes} min · {project.current.subject}
                  </p>
                  <h2 id="build-workbench-title">{project.current.title}</h2>
                  <p className="build-workbench-task">{project.current.task}</p>
                  <dl className="build-step-facts">
                    <div>
                      <dt>Make</dt>
                      <dd>{project.current.deliverable}</dd>
                    </div>
                    <div>
                      <dt>Question to answer</dt>
                      <dd>{project.current.question}</dd>
                    </div>
                  </dl>
                </div>

                {paused && (
                  <p className="build-alert build-alert-info" role="status">
                    This build is paused for exams. Resume when you have room for one step.
                  </p>
                )}

                {awaitingNext && latest ? (
                  <div
                    className="build-saved"
                    id="build-feedback"
                    tabIndex={-1}
                    aria-labelledby="build-saved-title"
                  >
                    <p className="build-overline">Attempt saved</p>
                    <h3 id="build-saved-title">Here’s what Stride noticed</h3>
                    <p className="build-help">
                      {formatMoment(latest.createdAt)}
                      {latest.evidenceId ? " · Journal evidence attached" : ""}
                    </p>

                    <details className="build-saved-work"><summary>Your attempt</summary><pre>{latest.text}</pre></details>

                    <div className="build-feedback-grid">
                      <section>
                        <h4>Noticed</h4>
                        <p>{latest.feedback.noticed}</p>
                      </section>
                      <section>
                        <h4>Improve</h4>
                        <p>{latest.feedback.improve}</p>
                      </section>
                      <section>
                        <h4>Question</h4>
                        <p>{latest.feedback.question}</p>
                      </section>
                    </div>

                    {latest.sources.length > 0 && (
                      <details className="build-sources">
                        <summary>Saved work used</summary>
                        <ul>
                          {latest.sources.map((source) => (
                            <li key={source.id}>
                              <strong>{source.title}</strong>
                              {source.locator && <span>{source.locator}</span>}
                              <p>{source.excerpt}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <div className="build-next">
                      <p className="build-overline">Next step</p>
                      <h4>{latest.feedback.next.title}</h4>
                      <p>{latest.feedback.next.task}</p>
                    </div>

                    <div className="build-saved-actions">
                      <button
                        type="button"
                        className="build-button build-button-primary"
                        disabled={paused || working}
                        onClick={() => void advanceStep()}
                      >
                        {busy === "advance" ? (
                          <>
                            <Loader2 className="build-spin" size={18} aria-hidden="true" />
                            Opening next step…
                          </>
                        ) : (
                          <>
                            Continue with this step
                            <ArrowRight size={18} aria-hidden="true" />
                          </>
                        )}
                      </button>
                      <button type="button" className="build-button build-button-secondary" onClick={askPip}>
                        <MessageCircle size={17} aria-hidden="true" />
                        Ask Pip first
                      </button>
                    </div>
                    <p className="build-help">
                      {paused
                        ? "Resume the build to open the next step."
                        : "Continuing closes this step. Your attempt stays in the trail below."}
                    </p>
                  </div>
                ) : (
                  <form
                    className="build-attempt"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveAttempt();
                    }}
                    aria-label="Your attempt"
                  >
                    <h3>Make your next move.</h3>
                    <BuildStudio value={draftText} disabled={working||paused} onChange={text=>{setDraftText(text);setActionError("");setRetry(null);submitIdRef.current="";}}/>
                    <div className="build-attempt-meta">
                      <span aria-live="polite">{draftText.length} / 6000</span>
                      <span>Your words and code</span>
                    </div>

                    <BuildAttachment text={draftText} disabled={working||paused} onPending={setAttachmentPending} onSaved={async id=>{if(!await refreshSnapshot())throw new Error("Your file is saved. Reload this build to select it.");setEvidenceId(id);submitIdRef.current="";}}/>
                    <div className="build-field">
                      <label htmlFor="build-evidence">Saved work to include (optional)</label>
                      <select
                        id="build-evidence"
                        value={evidenceId}
                        disabled={working || paused || evidence.length === 0}
                        onChange={(event) => {
                          setEvidenceId(event.target.value);
                          setActionError("");
                          setRetry(null);
                          submitIdRef.current = "";
                        }}
                      >
                        <option value="">Just this attempt</option>
                        {evidence.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.activity} · {formatDate(item.createdAt)}
                          </option>
                        ))}
                      </select>
                      <p className="build-help">
                        {evidence.length > 0 ? (
                          ""
                        ) : (
                          <>
                            You can attach files above or use work from your Journal.{" "}
                            <Link href="/journal" className="build-link">
                              Open Journal
                            </Link>

                          </>
                        )}
                      </p>
                    </div>

                    <div className="build-attempt-actions">
                      <button
                        type="submit"
                        className="build-button build-button-primary"
                        disabled={working || paused || attachmentPending || draftText.trim().length < 10}
                      >
                        {busy === "submit" ? (
                          <>
                            <Loader2 className="build-spin" size={18} aria-hidden="true" />
                            Reviewing your attempt…
                          </>
                        ) : (
                          <>
                            Save & get feedback
                            <ArrowRight size={18} aria-hidden="true" />
                          </>
                        )}
                      </button>
                      <p className="build-help" aria-live="polite">
                        {attachmentPending?"Save or remove your selected files first.":busy === "submit"
                          ? "Reading your attempt and preparing feedback…"
                          : paused
                            ? "Resume this build to save an attempt."
                            : ""}
                      </p>
                    </div>
                  </form>
                )}

                <div className="build-workbench-links">
                  <button type="button" className="build-link-button" onClick={askPip}>
                    <MessageCircle size={17} aria-hidden="true" />
                    Ask Pip for a nudge
                  </button>
                  <Link href="/journal" className="build-link-button">
                    <FileText size={17} aria-hidden="true" />
                    Journal evidence
                  </Link>
                </div>

              </section>
            </div>

            <section className="build-trail" hidden={deskTab!=="attempts"} aria-labelledby="build-trail-title">
              <div className="build-section-head">
                <div>
                  <p className="build-overline">Attempt trail</p>
                  <h2 id="build-trail-title">Your build, taking shape</h2>
                </div>
                <p className="build-help">
                  {attempts.length > 0
                    ? "Your latest work first. Open an attempt to revisit it."
                    : "Nothing saved yet. Your first attempt will appear here."}
                </p>
              </div>

              {attempts.length === 0 ? (
                <p className="build-empty-line">No attempts yet. The workbench is the place to start.</p>
              ) : (
                <ol className="build-attempts">
                  {[...attempts].reverse().slice(attemptPage*6,attemptPage*6+6).map((attempt, index) => (
                    <li key={attempt.id}>
                      <details className="build-attempt-entry">
                        <summary>
                          <span className="build-attempt-index" aria-hidden="true">
                            {String(attempts.length-attemptPage*6-index).padStart(2, "0")}
                          </span>
                          <span className="build-attempt-summary">
                            <strong>{attempt.step.title}</strong>
                            <span>
                              {formatMoment(attempt.createdAt)} · {attempt.text.length} characters
                              {attempt.evidenceId ? " · evidence attached" : ""}
                            </span>
                          </span>
                          <span className="build-attempt-preview">{firstLine(attempt.text)}</span>
                        </summary>
                        <AttemptDetail attempt={attempt} />
                      </details>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {deskTab==="attempts"&&attempts.length>6&&<nav className="build-history-pages" aria-label="Attempt pages"><button className="build-button build-button-secondary" disabled={attemptPage===0} onClick={()=>setAttemptPage(n=>n-1)}>Newer</button><span>Page {attemptPage+1} of {Math.ceil(attempts.length/6)}</span><button className="build-button build-button-secondary" disabled={(attemptPage+1)*6>=attempts.length} onClick={()=>setAttemptPage(n=>n+1)}>Older</button></nav>}
            <section className="build-roadmap" hidden={deskTab!=="plan"} aria-labelledby="build-roadmap-title"><div className="build-plan-about"><p className="build-overline">Your idea</p><p>{project.idea}</p></div>
              <div className="build-section-head">
                <div>
                  <p className="build-overline">Suggested chapters</p>
                  <h2 id="build-roadmap-title">Where this build could go</h2>
                </div>
                <p className="build-help">
                  Suggestions, not a checklist. Stride opens one step at a time.
                </p>
              </div>

              {project.milestones.length === 0 ? (
                <p className="build-empty-line">A roadmap will appear as this build grows.</p>
              ) : (
                <ol className="build-milestones">
                  {project.milestones.map((step, index) => {
                    const current = step.title === project.current.title;
                    return (
                      <li key={`${step.title}-${index}`} className={current ? "is-current" : undefined}>
                        <span className="build-milestone-number" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="build-milestone-top">
                            <h3>{step.title}</h3>
                            {current && <span className="build-badge">You are here</span>}
                          </div>
                          <p>{step.task}</p>
                          <p className="build-milestone-meta">
                            {step.minutes} min · {step.subject}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <p className="build-footnote">
              Your build is stored in this workspace. Export a copy any time, or delete the project when you’re done.
              Journal evidence is not deleted with it.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
