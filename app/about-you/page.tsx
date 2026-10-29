"use client";
import { useEffect, useRef, useState } from "react";
import { AlarmClock, ArrowLeft, ArrowRight, Compass, Hammer, Lightbulb, Check, UserRound, NotebookPen, SlidersHorizontal } from "lucide-react";
import { emptyLifeContext, type LifeContext } from "@/lib/personal-context";
import type { Workspace } from "@/lib/types";
import { connectionMessage, requestJson } from "@/lib/client-request";
import { Dictation, SpeechPrivacy } from "@/components/voice-capture";
import { PipMark } from "@/components/companion";
import SignOut from "@/components/sign-out";
import "../welcome.css";

/* Bounded redesign per WELCOME-CONTRACT.md: two short stages, four reason cards, one small setup form. */
type Reason = "due"|"understanding"|"build"|"figure";
const choices:{ reason:Reason; heading:string; hint:string; destination:string; button:string; shape:string; Icon:typeof Compass }[]=[
 {reason:"due",heading:"Got something due",hint:"Finish the work in front of you.",destination:"/workspace?open=add",button:"Open my task",shape:"circle",Icon:AlarmClock},
 {reason:"understanding",heading:"Understand something",hint:"Make sense of one confusing thing.",destination:"/workspace?open=course",button:"Open my notes",shape:"square",Icon:Lightbulb},
 {reason:"build",heading:"Something to build",hint:"Start or develop a project.",destination:"/build",button:"Open my build",shape:"triangle",Icon:Hammer},
 {reason:"figure",heading:"Still figuring it out",hint:"Think through options with Pip.",destination:"/pip",button:"Open Pip",shape:"diamond",Icon:Compass},
];
const extraFields=[["experience","What you’ve tried"],["interests","What interests you"],["ambitions","What you’re aiming for"],["constraints","Your week"],["learningPreferences","How you like to learn"]] as const;
const extraLimits:Record<(typeof extraFields)[number][0],number>={experience:4000,interests:2000,ambitions:2000,constraints:2000,learningPreferences:1000};
const minuteOptions=[15,30,60];

export default function AboutYou(){
 const [loaded,setLoaded]=useState(false),[stage,setStage]=useState<"choose"|"setup">("choose"),[reason,setReason]=useState<Reason|null>(null);
 const [busy,setBusy]=useState(false),[listening,setListening]=useState(false),[error,setError]=useState(""),[returning,setReturning]=useState(false);
 const [name,setName]=useState(""),[year,setYear]=useState("2nd year"),[minutes,setMinutes]=useState(30),[goal,setGoal]=useState("");
 const [text,setText]=useState(""),[context,setContext]=useState<LifeContext>({...emptyLifeContext});
 const [extraField,setExtraField]=useState<(typeof extraFields)[number][0]>("experience"),[moreOpen,setMoreOpen]=useState(false);
 const [profileTab,setProfileTab]=useState<"basics"|"story"|"study">("basics");
 const [storyField,setStoryField]=useState<"story"|"experience"|"interests"|"ambitions">("story");
 const [studyField,setStudyField]=useState<"learningPreferences"|"constraints">("learningPreferences");
 const [customTime,setCustomTime]=useState(false);
 const [baseline,setBaseline]=useState(""),[dirty,setDirty]=useState(false),savedRef=useRef(false);
 const signedOut=useRef(false);
 const snapshot=JSON.stringify({name,year,minutes,goal,text,context});

 async function load(){
  try{
   const {state}=await requestJson<{state:Workspace}>("/api/workspace?fresh=1",{cache:"no-store"});
   if(signedOut.current)return;const p=state.profile;
   const loadedName=p.onboardingComplete||!["Alex","Student","Demo student"].includes(p.name)?p.name:"";
   const loadedYear=p.year,loadedMinutes=p.minutes;
   const loadedGoal=state.sample&&!p.onboardingComplete?"":p.goal;
   const loadedContext:LifeContext=p.lifeContext?{...emptyLifeContext,...p.lifeContext}:{...emptyLifeContext};
   let draft="";try{draft=sessionStorage.getItem("stride-intro-draft")||"";}catch{}
   const story=[loadedContext.story,draft].filter(Boolean).join("\n\n");
   setName(loadedName);setYear(loadedYear);setMinutes(loadedMinutes);setGoal(loadedGoal);
   setContext(loadedContext);setReturning(!!p.onboardingComplete);setText(story);if(p.onboardingComplete){setReason("figure");setStage("setup");}
   setBaseline(JSON.stringify({name:loadedName,year:loadedYear,minutes:loadedMinutes,goal:loadedGoal,text:story,context:loadedContext}));
   setLoaded(true);setError("");
  }catch(e){setError(connectionMessage(e,"Couldn’t load your details. Try again."));}
 }
 useEffect(()=>{void load();const clear=()=>{signedOut.current=true;savedRef.current=true;setLoaded(false);setName("");setText("");setGoal("");setContext({...emptyLifeContext});};window.addEventListener("stride-signout",clear);return()=>window.removeEventListener("stride-signout",clear);},[]);
 useEffect(()=>{window.scrollTo({top:0,behavior:"instant"});},[stage]);
 useEffect(()=>{if(baseline){setDirty(snapshot!==baseline);}},[snapshot,baseline]);
 useEffect(()=>{
  if(!dirty||savedRef.current)return;
  const handler=(event:BeforeUnloadEvent)=>{if(!savedRef.current){event.preventDefault();event.returnValue="";}};
  window.addEventListener("beforeunload",handler);return()=>window.removeEventListener("beforeunload",handler);
 },[dirty]);

 function choose(next:Reason){setReason(next);setStage("setup");}
 const chosen=choices.find(option=>option.reason===reason);
 async function save(destination:string){
  if(!name.trim()||busy||listening)return;setBusy(true);setError("");
  try{
   await requestJson("/api/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"aboutYou",name,year,minutes,goal,context:{...context,story:text}})});
   try{sessionStorage.removeItem("stride-intro-draft");}catch{}
   savedRef.current=true;if(!signedOut.current)window.location.assign(destination);
  }catch(e){setError(connectionMessage(e,"Couldn’t save. Your answers are still here."));setBusy(false);}
 }
 return <div className="welcome-page"><header className="site-header"><a className="site-brand" href="/workspace">stride.</a><nav><a href="/settings">Settings</a><SignOut/><a href="/workspace">Back to workspace ↗</a></nav></header>
  <main className="welcome-main">
   {!loaded?<section className="welcome-stage"><h1 className="welcome-title">Getting your space ready.</h1><p role="status" className="welcome-sub">{error||"Loading…"}</p>{error&&<button className="btn primary" onClick={load}>Try again</button>}</section>:
   stage==="choose"?<section className="welcome-stage">
    <div className="welcome-pip"><PipMark listening={listening}/><strong>Pip</strong></div>
    <h1 className="welcome-title" id="welcome-heading">What brings you here today?</h1>
    <p className="welcome-sub">Start with what matters right now.</p>
    {error&&<p className="error-banner" role="alert">{error}</p>}
    <div className="welcome-choices" role="group" aria-labelledby="welcome-heading">
     {choices.map(({reason:key,heading,hint,shape,Icon})=>
      <button key={key} className={"pick"+(reason===key?" picked":"")} aria-pressed={reason===key} disabled={busy||listening} onClick={()=>choose(key)}>
       <span className="pick-glyph" data-shape={shape} aria-hidden="true"><Icon size={20}/></span>
       <span className="pick-name">{heading}</span>
       <span className="pick-hint">{hint}</span>
       <span className="pick-go">Continue →</span>
      </button>)}
    </div>
   </section>:
   chosen&&<section className="profile-canvas">
    <aside className="profile-cover"><p className="welcome-eyebrow">YOUR SPACE, YOUR WAY</p><div className="profile-monogram" aria-hidden="true">{name.trim().slice(0,1).toUpperCase()||<UserRound size={40}/>}</div><h1>{name.trim()?`Hey, ${name.trim()}.`:"Make yourself at home."}</h1><p>A little context now.<br/>Room to grow as you go.</p><div className="profile-cover-bottom"><span>{year}</span><strong>{minutes||'—'} minutes today</strong></div>{!returning&&<div className="profile-destination"><span>You’re starting with</span><strong>{chosen.heading}</strong></div>}</aside>
    <form className="profile-workspace" onSubmit={event=>{event.preventDefault();save(returning?"/workspace":chosen.destination);}}>
     <div className="profile-heading"><div><p className="welcome-eyebrow">{returning?"MY PROFILE":"LET’S MAKE A START"}</p><h2>{profileTab==='basics'?"The essentials.":profileTab==='story'?"Tell it your way.":"A pace that fits you."}</h2></div><span className="profile-optional">{profileTab==='basics'?"A name is enough to start.":"All optional. Change it anytime."}</span></div>
     <nav className="profile-tabs" aria-label="Profile sections">{([['basics','Basics',UserRound],['story','Your story',NotebookPen],['study','Preferences',SlidersHorizontal]] as const).map(([id,label,Icon])=><button type="button" key={id} aria-pressed={profileTab===id} disabled={busy||listening} onClick={()=>setProfileTab(id)}><Icon size={18}/>{label}</button>)}</nav>
     {error&&<p className="error-banner" role="alert">{error}</p>}
     <div className="profile-panel">
     {profileTab==='basics'?<><label htmlFor="welcome-name">What should Pip call you?</label><input className="profile-name-input" id="welcome-name" value={name} required maxLength={60} autoComplete="given-name" placeholder="Your name" disabled={busy||listening} onChange={event=>setName(event.target.value)}/><fieldset className="profile-choice-field"><legend>Your college year</legend><div className="profile-year-choices">{['2nd year','3rd year'].map(option=><button type="button" key={option} aria-pressed={year===option} disabled={busy||listening} onClick={()=>setYear(option)}><strong>{option}</strong>{year===option&&<Check size={20}/>}</button>)}</div></fieldset><fieldset className="profile-choice-field"><legend>How much time do you have today?</legend><div className="profile-time-choices">{[15,30,60].map(value=><button type="button" key={value} aria-pressed={minutes===value&&!customTime} disabled={busy||listening} onClick={()=>{setMinutes(value);setCustomTime(false);}}><strong>{value}<span>min</span></strong><span>{value===15?'A quick start':value===30?'A little focus':'A full session'}</span>{minutes===value&&!customTime&&<Check size={17}/>}</button>)}<button type="button" aria-pressed={customTime||![15,30,60].includes(minutes)} disabled={busy||listening} onClick={()=>setCustomTime(true)}><strong>{![15,30,60].includes(minutes)?minutes:'…'}<span>{![15,30,60].includes(minutes)?'min':''}</span></strong><span>My own time</span></button></div>{(customTime||![15,30,60].includes(minutes))&&<div className="profile-custom-time"><label htmlFor="welcome-minutes">Minutes today</label><input id="welcome-minutes" inputMode="numeric" pattern="[0-9]*" value={minutes||''} disabled={busy||listening} onChange={event=>{if(/^\d{0,3}$/.test(event.target.value))setMinutes(Number(event.target.value));}}/><span>5–180 minutes</span></div>}</fieldset></>:
     profileTab==='story'?<><div className="profile-editor-options" role="group" aria-label="What would you like to share?">{([['story','My story'],['experience','What I’ve tried'],['interests','Interests'],['ambitions','Aims']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={storyField===id} disabled={busy||listening} onClick={()=>setStoryField(id)}>{label}</button>)}</div><label htmlFor="welcome-story">{storyField==='story'?"Anything you want Pip to know?":storyField==='experience'?"What have you tried so far?":storyField==='interests'?"What gets your attention?":"What would you like to work towards?"}</label><div className="profile-story-editor"><textarea id="welcome-story" value={storyField==='story'?text:context[storyField]} maxLength={storyField==='story'?10000:extraLimits[storyField]} rows={7} disabled={busy||listening} placeholder={storyField==='story'?"Start anywhere. You don’t need to have it figured out.":"A few words is fine."} onChange={event=>storyField==='story'?setText(event.target.value):setContext({...context,[storyField]:event.target.value})}/><footer><span>{listening?"Listening…":"Your words, as you write them."}</span><Dictation compact iconOnly showPrivacy={false} disabled={busy} onListening={setListening} onText={chunk=>storyField==='story'?setText(previous=>previous+(previous?" ":"")+chunk):setContext(previous=>({...previous,[storyField]:previous[storyField]+(previous[storyField]?" ":"")+chunk}))}/></footer></div><SpeechPrivacy/></>:
     <><div className="profile-editor-options" role="group" aria-label="Study preferences">{([['learningPreferences','How I learn'],['constraints','My week']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={studyField===id} disabled={busy} onClick={()=>setStudyField(id)}>{label}</button>)}</div><label htmlFor="welcome-preferences">{studyField==='learningPreferences'?"What makes learning easier for you?":"What should your plan make room for?"}</label><textarea id="welcome-preferences" value={context[studyField]} maxLength={extraLimits[studyField]} rows={4} disabled={busy} placeholder={studyField==='learningPreferences'?"Worked examples, diagrams, trying it yourself…":"Classes, travel, exams, other commitments…"} onChange={event=>setContext({...context,[studyField]:event.target.value})}/><label htmlFor="welcome-goal">Something you’re working towards</label><input id="welcome-goal" maxLength={120} value={goal} disabled={busy} placeholder="It’s okay to still be exploring." onChange={event=>setGoal(event.target.value)}/><fieldset className="profile-choice-field"><legend>Where are you right now?</legend><div className="profile-direction">{([['exploring','Exploring'],['some-ideas','A few ideas'],['decided','A clear direction']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={context.direction===id} disabled={busy} onClick={()=>setContext({...context,direction:id})}>{label}</button>)}</div></fieldset></>}
     </div>{(minutes<5||minutes>180)&&<p role="alert">Choose between 5 and 180 minutes in Basics.</p>}<footer className="profile-save-bar"><button type="button" className="profile-back" disabled={busy||listening} onClick={()=>setStage('choose')}><ArrowLeft size={17}/>{returning?'Choose a starting point':'Change my start'}</button><button className="profile-save" disabled={!name.trim()||busy||listening||text.length>10000||minutes<5||minutes>180}>{busy?'Saving…':listening?'Listening…':returning?'Save profile':chosen.button}<ArrowRight size={19}/></button></footer>
    </form>
   </section>}

  </main></div>;
}
