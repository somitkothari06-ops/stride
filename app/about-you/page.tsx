"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Compass } from "lucide-react";
import { emptyLifeContext, type LifeContext } from "@/lib/personal-context";
import type { Workspace } from "@/lib/types";
import { Dictation } from "@/components/voice-capture";
const stages = ["The basics", "Your story", "Your direction", "Your real life", "Review & begin"];
export default function AboutYou() {
  const [loaded, setLoaded] = useState(false), [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [name, setName] = useState(""), [year, setYear] = useState("2nd year"), [minutes, setMinutes] = useState(30), [goal, setGoal] = useState("");
  const [context, setContext] = useState<LifeContext>({ ...emptyLifeContext });
  const [existing, setExisting] = useState(false);
  async function load() {
    setError("");
    try {
      const response = await fetch("/api/workspace?fresh=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Couldn't load your profile. Your saved work is unchanged.");
      const { state }: { state: Workspace } = await response.json();
      const p = state.profile;
      setName(p.onboardingComplete || p.name !== "Alex" ? p.name : ""); setYear(p.year); setMinutes(p.minutes); setGoal(state.sample && !p.onboardingComplete ? "" : p.goal);
      const savedContext = p.lifeContext || { ...emptyLifeContext };
      let intro = ""; try { intro = sessionStorage.getItem("stride-intro-draft") || ""; } catch {}
      setContext(intro ? { ...savedContext, story: `${savedContext.story}${savedContext.story ? "\n\n" : ""}${intro}`.slice(0, 10000) } : savedContext);
      if (intro) setStep(1);
      setExisting(!!p.onboardingComplete); setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't connect."); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [step]);
  function field(key: keyof Omit<LifeContext, "direction">, label: string, hint: string, limit: number) {
    return <div className="story-field"><label htmlFor={key}>{label}</label><p id={`${key}-hint`}>{hint}</p><Dictation disabled={busy} onText={(chunk) => setContext((previous) => ({ ...previous, [key]: `${previous[key]}${previous[key] ? " " : ""}${chunk}`.slice(0, limit) }))} /><textarea id={key} aria-describedby={`${key}-hint`} value={context[key]} maxLength={limit} rows={key === "story" ? 7 : 4} onChange={(e) => setContext({ ...context, [key]: e.target.value })} /><small>{context[key].length.toLocaleString()} / {limit.toLocaleString()} characters · optional</small></div>;
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (step < 4) { setStep(step + 1); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "aboutYou", name, year, goal, minutes, context }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Couldn't save your context.");
      try { sessionStorage.removeItem("stride-intro-draft"); } catch {}
      window.location.assign("/workspace");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't connect. Your answers are still here."); }
    finally { setBusy(false); }
  }
  return <div className="story-page"><header className="site-header"><a className="site-brand" href="/">stride<span>.</span></a><a href="/workspace">{existing ? "Back to workspace" : "Explore the demo"} ↗</a></header><main className="story-layout"><aside className="story-sidebar"><p className="site-kicker">YOUR STARTING POINT</p><h1>You’re more than<br /> a to-do list.</h1><p>Tell Stride what would help it understand you. You don’t need a polished story or a career plan.</p><ol>{stages.map((stage, i) => <li key={stage} aria-current={step === i ? "step" : undefined}><span>{i < step ? <Check size={16} /> : String(i + 1).padStart(2, "0")}</span>{stage}</li>)}</ol><p className="story-privacy">Share only what you’re comfortable using for study guidance. You can leave any personal question blank, and edit this context later.</p></aside><section className="story-main" aria-labelledby="story-title">
    {!loaded ? <><h2>Getting your space ready.</h2><p role="status">{error || "Loading your existing context…"}</p>{error && <button className="btn primary" onClick={load}>Try again</button>}</> : <form onSubmit={submit}>
      <p className="site-kicker">{String(step + 1).padStart(2, "0")} / 05 · {stages[step]}</p>
      <h2 id="story-title">{["Let’s start with you.", "What brought you here?", "It’s okay to be figuring it out.", "A plan should fit your life.", "Does this sound like you?"][step]}</h2>
      <p className="story-intro">{["Just a few details to make this your workspace.", "This can be a few sentences or the whole story. Tell it in your own words.", "You can name a direction, share a few possibilities, or start with curiosity.", "Time, responsibilities and learning preferences matter as much as ambition.", "Review what you’re choosing to save. This is your account of yourself, not an AI assessment."][step]}</p>
      {error && <p className="error-banner" role="alert">{error}</p>}
      {step === 0 && <><label htmlFor="student-name">What should we call you?</label><input id="student-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="given-name" /><div className="form-grid"><div><label htmlFor="student-year">College year</label><select id="student-year" value={year} onChange={(e) => setYear(e.target.value)}><option>2nd year</option><option>3rd year</option></select></div><div><label htmlFor="student-time">A realistic study window</label><select id="student-time" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{[...new Set([15, 20, 30, 40, 60, 90, minutes])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></div></div><p className="field-help">This is a starting point. You can change today’s time whenever you need.</p></>}
      {step === 1 && <>{field("story", "Your story, in your words", "What are you studying? What has your experience been like? What would you like help with?", 10000)}{field("experience", "What have you tried or made so far?", "Projects, courses, jobs, clubs, hobbies, or a small thing you learned on your own. Starting from scratch is fine.", 4000)}</>}
      {step === 2 && <><fieldset className="direction-options"><legend>Where are you with your next direction?</legend>{([["exploring", "I’m still exploring", "Help me try things without forcing a career choice."], ["some-ideas", "I have a few ideas", "I’d like to understand which ones interest me."], ["decided", "I have a direction", "Help me take practical steps towards it."]] as const).map(([value, title, detail]) => <label key={value}><input type="radio" name="direction" value={value} checked={context.direction === value} onChange={() => setContext({ ...context, direction: value })} /><span><strong>{title}</strong><small>{detail}</small></span></label>)}</fieldset>{field("interests", "What catches your attention?", "Subjects, problems, tools or activities. You can also tell us what you don’t enjoy.", 2000)}{field("ambitions", "What would you like life to look like?", "A role, a kind of work, confidence in class, building something useful—or simply finding out.", 2000)}<label htmlFor="short-goal">A short direction, if you have one</label><input id="short-goal" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={120} placeholder="Optional — leave blank if you’re exploring" /></>}
      {step === 3 && <>{field("constraints", "What does a normal week need to make room for?", "Classes, a commute, responsibilities, limited tools, irregular time, or anything else that affects how you study.", 2000)}{field("learningPreferences", "What helps you learn?", "Worked examples, building things, reading, talking it through, short sessions—or what you want to try.", 1000)}<div className="review-note"><Compass size={20} /><p>Stride will use this as context for suggestions, not as proof of your abilities or a label for who you are.</p></div></>}
      {step === 4 && <div className="story-review"><div className="story-review-basics"><strong>{name}</strong><span>{year} · {minutes} minutes · {goal || "Exploring without a fixed goal"}</span></div>{([["Your story", context.story], ["What you’ve tried", context.experience], ["Interests", context.interests], ["Ambitions", context.ambitions], ["Real-life constraints", context.constraints], ["Learning preferences", context.learningPreferences]]).map(([label, text]) => <details key={label} open={!!text}><summary>{label}</summary><p>{text || "Not shared. That’s okay."}</p></details>)}<p className="story-privacy">Saved to this browser’s workspace. Relevant excerpts may be sent to Nebius when you ask for personalised guidance. Cross-device accounts are not connected yet. Editing changes future context; older attempts and backups may retain derived information.</p></div>}
      <div className="story-actions">{step > 0 ? <button type="button" className="btn subtle" disabled={busy} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button> : <a href="/" className="text-button">Back to Stride</a>}<button className="btn primary" disabled={busy || (step === 0 && !name.trim())}>{busy ? "Saving your context…" : step === 4 ? "Save and open my workspace" : "Continue"}<ArrowRight size={16} /></button></div>
    </form>}
  </section></main></div>;
}
