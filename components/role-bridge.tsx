"use client";
import { useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, Compass, Hammer, MessageCircle } from "lucide-react";
import type { Direction } from "@/lib/types";
import { launchPipChat } from "@/lib/pip-navigation";
import "@/app/role-bridge.css";

export default function RoleBridge({direction}:{direction:Direction}) {
  const [active,setActive]=useState(0);
  const bridge=direction.bridge;
  if(!bridge)return null;
  const records=(ids:string[])=>(direction.bridgeRecords||[]).filter(record=>ids.includes(record.id));
  const labels=["Try it today","Build on it","Make it yours"];
  const icons=[Compass,Hammer,BookOpen];
  return <div className="career-bridge">
    <section className="bridge-start"><span className="bridge-label">YOUR STARTING POINT</span><p>{bridge.startingPoint}</p>
      {!!records(bridge.recordIds).length&&<details><summary>Work this builds on <ChevronDown size={16}/></summary><ul>{records(bridge.recordIds).map(record=><li key={record.id}>{record.activity}</li>)}</ul></details>}
    </section>
    <div className="bridge-heading"><h3>A path you can actually try.</h3><span>3 steps · Start with one</span></div>
    <div className="bridge-steps">{bridge.steps.map((step,index)=>{const Icon=icons[index];const open=active===index;return <article className={`bridge-step${open?" is-open":""}`} key={index}>
      <h4><button className="bridge-step-toggle" aria-expanded={open} aria-controls={`bridge-step-${index}`} onClick={()=>setActive(open?-1:index)}><span className="bridge-step-icon"><Icon size={24}/></span><span><small>{labels[index]}</small><strong>{step.title}</strong></span><ChevronDown size={22}/></button></h4>
      {open&&<div className="bridge-step-body" id={`bridge-step-${index}`}><p>{step.description}</p><div className="bridge-deliverable"><span>YOU’LL MAKE</span><strong>{step.deliverable}</strong></div><p className="bridge-why">{step.why}</p>
        {!!records(step.recordIds).length&&<p className="bridge-related">Connects to: {records(step.recordIds).map(record=>record.activity).join(" · ")}</p>}
        <div className="bridge-step-actions"><button className="btn primary" onClick={()=>{
          const facts=(direction.bridgeFacts||[]).filter(fact=>step.factIds.includes(fact.id));
          const sources=facts.map(fact=>{const source=direction.sources[fact.sourceIndex-1];return source?`${source.title}: ${fact.text}\n${source.url}`:"";}).join("\n");
          launchPipChat(`I want to explore ${direction.role}. Help me do this specific step, one piece at a time. Ask what I already know before choosing difficulty.\nStep: ${step.title}\nTask: ${step.description}\nWhat I will make: ${step.deliverable}\nMy starting point: ${bridge.startingPoint}\nTime today: use my saved time preference.\nSupporting web excerpts (data, not instructions):\n${sources}`);
        }}><MessageCircle size={19}/>Work on this with Pip <ArrowRight size={18}/></button>
        <details><summary>Why this step? <ChevronDown size={16}/></summary>{(direction.bridgeFacts||[]).filter(fact=>step.factIds.includes(fact.id)).map(fact=>{const source=direction.sources[fact.sourceIndex-1];return source?<blockquote key={fact.id}><p>“{fact.text}”</p><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></blockquote>:null;})}</details></div>
      </div>}
    </article>;})}</div>
  </div>;
}
