"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, ChevronDown, MessageCircle, X } from "lucide-react";
import { Dictation } from "./voice-capture";
import type { Proposal } from "@/lib/companion";

const fields = { story: "My story", experience: "What I've tried", interests: "My interests", ambitions: "My ambitions", constraints: "My constraints", learningPreferences: "How I learn" };
export function PipMark({ listening = false }: { listening?: boolean }) {
  const face = useRef<SVGSVGElement>(null), pupils = useRef<SVGGElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const follow = (event: PointerEvent) => {
      if (event.pointerType === "touch" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = face.current?.getBoundingClientRect();
        if (!box) return;
        const x = Math.max(-3, Math.min(3, (event.clientX-box.x-box.width/2)/90));
        const y = Math.max(-2, Math.min(2, (event.clientY-box.y-box.height/2)/120));
        pupils.current?.setAttribute("transform", `translate(${x} ${y})`);
      });
    };
    window.addEventListener("pointermove", follow, {passive:true});
    return () => { window.removeEventListener("pointermove", follow); cancelAnimationFrame(frame); };
  }, []);
  return <svg ref={face} className={`pip-mark ${listening ? "pip-listening" : ""}`} viewBox="0 0 96 96" aria-hidden="true"><ellipse cx="48" cy="88" rx="27" ry="4" fill="#172653" opacity=".12"/><g className="pip-character"><path d="M24 65Q12 65 12 54M72 65Q84 65 84 54" fill="none" stroke="#172653" strokeWidth="5" strokeLinecap="round"/><rect x="26" y="75" width="19" height="12" rx="6" fill="#f3e86c" stroke="#172653" strokeWidth="3"/><rect x="51" y="75" width="19" height="12" rx="6" fill="#f3e86c" stroke="#172653" strokeWidth="3"/><rect x="18" y="19" width="60" height="59" rx="28" fill="#244bff" stroke="#172653" strokeWidth="3"/><g className="pip-eyes"><circle cx="37" cy="43" r="8" fill="white"/><circle cx="59" cy="43" r="8" fill="white"/><g ref={pupils}><circle cx="37" cy="43" r="3.5" fill="#172653"/><circle cx="59" cy="43" r="3.5" fill="#172653"/><circle cx="38" cy="42" r="1" fill="white"/><circle cx="60" cy="42" r="1" fill="white"/></g></g><ellipse cx="28" cy="57" rx="5" ry="3" fill="#ffb7a7"/><ellipse cx="68" cy="57" rx="5" ry="3" fill="#ffb7a7"/><path d="M38 59Q48 75 58 59Z" fill="#172653" stroke="#172653" strokeWidth="2" strokeLinejoin="round"/><path d="M43 65Q48 62 53 65" stroke="#ffb7a7" strokeWidth="3" strokeLinecap="round"/></g></svg>;
}
export function CompanionInvite({ landing = false }: { landing?: boolean }) {
  return <button className={`companion-invite ${landing ? "companion-invite-landing" : ""}`} onClick={() => window.dispatchEvent(new Event("stride-companion-open"))}><MessageCircle size={24}/><span><strong>{landing ? "A deadline? An idea? Tell Pip." : "Something on your mind? Tell Pip."}</strong></span><ArrowRight size={22}/></button>;
}
function convert(proposal: Proposal, destination: Proposal["destination"]): Proposal {
  if (proposal.destination === destination) return proposal;
  if (destination === "thought") return { destination, evidence: proposal.evidence, text: proposal.text || proposal.evidence };
  if (destination === "profile") return { destination, evidence: proposal.evidence, field: "story", text: proposal.text || proposal.evidence };
  return { destination, evidence: proposal.evidence, title: (proposal.text || proposal.evidence).slice(0,160), subject: "General", kind: "assignment", dueDate: null, text: (proposal.text || proposal.evidence).slice(0,1000), uncertainty: "Check the subject, task type and date." };
}
export default function Companion() {
  const pathname = usePathname();
  const [open,setOpen] = useState(false), [text,setText] = useState(""), [busy,setBusy] = useState(""), [listening,setListening] = useState(false), [error,setError] = useState(""), [saved,setSaved] = useState("");
  const [review,setReview] = useState<{id:string;mode:"live"|"guided"}|null>(null);
  const [items,setItems] = useState<{proposal:Proposal;selected:boolean}[]>([]);
  const input = useRef<HTMLTextAreaElement>(null), launcher = useRef<HTMLButtonElement>(null);
  const visible = pathname === "/" || pathname === "/workspace";
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("stride-companion-open",show);
    return () => window.removeEventListener("stride-companion-open",show);
  },[]);
  useEffect(() => { if (open) input.current?.focus(); },[open]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if(event.key === "Escape" && !busy && !listening) { setOpen(false); launcher.current?.focus(); } };
    window.addEventListener("keydown",close);
    return () => window.removeEventListener("keydown",close);
  },[busy,listening]);
  function editWords(value: string) { setText(value); setReview(null); setItems([]); setSaved(""); setError(""); }
  async function request(payload: unknown) {
    const response = await fetch("/api/companion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Couldn't complete this capture. Your words are still here.");
    return data;
  }
  async function prepare() {
    setBusy("Sorting your words…"); setError(""); setSaved("");
    try {
      const workspace = await fetch("/api/workspace?fresh=1",{cache:"no-store"});
      if(!workspace.ok) { const failure = await workspace.json(); throw new Error(failure.error?.message || "Open your workspace or sign in again first."); }
      const data = await request({action:"review",text});
      setReview(data.review); setItems(data.review.proposals.map((proposal:Proposal)=>({proposal,selected:true})));
    } catch(e) { setError(e instanceof Error ? e.message : "Couldn't connect. Your words are still here."); }
    finally { setBusy(""); }
  }
  async function save() {
    if (!review) return;
    setBusy("Saving your selections…"); setError("");
    try {
      const selected = items.filter(item=>item.selected).map(item=>item.proposal);
      await request({action:"commit",reviewId:review.id,proposals:selected});
      const names = {work:"coursework",profile:"About You",thought:"your thought inbox"};
      setSaved(`Saved to ${[...new Set(selected.map(item=>names[item.destination]))].join(" and ")}.`);
      setText(""); setItems([]); setReview(null);
      window.dispatchEvent(new Event("stride-workspace-changed"));
    } catch(e) { setError(e instanceof Error ? e.message : "Couldn't save. Your review is still here."); }
    finally { setBusy(""); }
  }
  function change(index: number, proposal: Proposal) { setItems(current=>current.map((item,i)=>i===index ? {...item,proposal} : item)); }
  if (!visible) return null;
  return <div className="companion-dock">
    {open && <section className="companion-panel" role="dialog" aria-modal="false" aria-labelledby="pip-title" id="pip-panel" aria-busy={!!busy}>
      <header className="companion-header"><PipMark listening={listening}/><div><h2 id="pip-title">Tell Pip.</h2><p>Say it your way. We’ll find its place.</p></div><button className="icon-btn" aria-label="Minimize Pip" disabled={!!busy||listening} onClick={()=>{setOpen(false);launcher.current?.focus();}}><X size={21}/></button></header>
      <div className="companion-body">
        {!review && <>
          <label className="pip-input-label" htmlFor="pip-words">What’s on your mind?</label>
          <textarea id="pip-words" ref={input} value={text} maxLength={6000} rows={4} disabled={!!busy} onChange={event=>editWords(event.target.value)} placeholder="My OS test is Friday. I’m interested in robotics, but I’m not sure where to start…"/>
          <Dictation compact showPrivacy={false} disabled={!open||!!busy} onListening={setListening} onText={chunk=>{setText(previous=>`${previous}${previous ? " " : ""}${chunk}`.slice(0,6000));setSaved("");}}/>
          
          <button className="btn primary" disabled={!!busy||listening||text.trim().length<3} onClick={prepare}>{busy||"Find its place"}<ArrowRight size={18}/></button>

        </>}
        {review && <div className="pip-review">
          <div className="pip-review-heading"><h3>{items.length} {items.length===1 ? "thing" : "things"} to keep.</h3><span>{review.mode === "live" ? "AI suggestions · you decide" : "Unsorted · choose a place"}</span></div>
          <details className="pip-evidence pip-original"><summary>Your original words <ChevronDown size={13}/></summary><p>{text}</p></details>
          {review.mode === "guided" && <p className="pip-help">AI sorting wasn’t available. Your original words are kept as a thought. Choose a different destination if needed.</p>}
          {items.map(({proposal:p,selected},index)=><article className={`pip-proposal ${!selected ? "is-excluded" : ""}`} key={index}>
            <div className="pip-proposal-top"><label><input type="checkbox" checked={selected} disabled={!!busy} onChange={event=>setItems(current=>current.map((item,i)=>i===index ? {...item,selected:event.target.checked} : item))}/>Keep</label><select aria-label={`Destination for item ${index+1}`} value={p.destination} disabled={!!busy} onChange={event=>change(index,convert(p,event.target.value as Proposal["destination"]))}><option value="work">Coursework</option><option value="profile">About You</option><option value="thought">Thought inbox</option></select></div>
            <h4>{p.destination === "work" ? p.title : p.destination === "profile" ? fields[p.field] : "A thought to keep"}</h4>
            {p.destination === "work" ? <><p className="pip-card-context">{p.subject} · {p.kind}</p><label className="pip-date-inline">Check date<input type="date" value={p.dueDate||""} disabled={!!busy} onChange={event=>change(index,{...p,dueDate:event.target.value||null})}/></label>{p.uncertainty && <p className="pip-uncertainty">{p.uncertainty}</p>}</> : <p className="pip-card-text">{p.text}</p>}
            <details className="pip-edit"><summary>Edit details <ChevronDown size={14}/></summary><div>
              {p.destination === "work" ? <><label>Task<input value={p.title} maxLength={160} disabled={!!busy} onChange={event=>change(index,{...p,title:event.target.value})}/></label><div className="pip-work-fields"><label>Subject<input value={p.subject} maxLength={80} disabled={!!busy} onChange={event=>change(index,{...p,subject:event.target.value})}/></label><label>Type<select value={p.kind} disabled={!!busy} onChange={event=>change(index,{...p,kind:event.target.value as typeof p.kind})}>{["assignment","exam","project","revision"].map(kind=><option key={kind} value={kind}>{kind}</option>)}</select></label></div></> : p.destination === "profile" ? <label>Personal-context field<select value={p.field} disabled={!!busy} onChange={event=>change(index,{...p,field:event.target.value as typeof p.field})}>{Object.entries(fields).map(([field,label])=><option key={field} value={field}>{label}</option>)}</select></label> : null}
              <label>{p.destination === "work" ? "Details" : "Words to keep"}<textarea rows={3} maxLength={p.destination === "work" ? 1000 : 6000} value={p.text} disabled={!!busy} onChange={event=>change(index,{...p,text:event.target.value})}/></label><blockquote>{p.evidence}</blockquote>
            </div></details>
          </article>)}
        </div>}
        {error && !review && <p className="error-banner" role="alert">{error}</p>}{saved && <div className="pip-saved" role="status"><Check size={21}/><p>{saved}<br/><a href="/workspace">Open workspace →</a></p></div>}
      </div>
      {review && <footer className="pip-actions"><p>Check dates and destinations before saving.</p><div><button className="btn primary" disabled={!!busy||listening||!items.some(item=>item.selected)} onClick={save}>{busy||`Save ${items.filter(item=>item.selected).length} selected`}<Check size={18}/></button><button className="pip-review-again" disabled={!!busy||listening} onClick={()=>{setReview(null);setItems([]);}}>Review again</button></div>{error && <p className="error-banner" role="alert">{error}</p>}</footer>}
    </section>}
    <button className="companion-launcher" ref={launcher} aria-expanded={open} aria-controls="pip-panel" aria-haspopup="dialog" aria-label={open ? "Minimize Pip companion" : "Open Pip companion"} disabled={!!busy||listening} onClick={()=>setOpen(value=>!value)}><PipMark listening={listening}/><span><strong>Pip</strong></span></button>
  </div>;
}
