"use client";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, Clock3, FileText, Lightbulb, MessageCircle, Sparkles } from "lucide-react";
import { PipMark } from "./companion";
const samples = [
 { label:"A confusing topic", icon:BookOpen, file:"Operating systems", note:"“I can memorise scheduling. I don’t really get it.”", title:"Let’s follow the queue.", body:"Three processes. One CPU. We’ll trace what runs, what waits, and why—then you try a different order.", next:"Explain why P2 had to wait", saved:"Your explanation + feedback", link:"/workspace?open=course", action:"Try it with my notes", steps:["Trace it","Understand it","Try it"] },
 { label:"An approaching deadline", icon:Clock3, file:"Database assignment", note:"“It’s due tomorrow and I haven’t started.”", title:"Start smaller. Start here.", body:"Work through one join with a tiny table. Get that part clear before tackling the rest of your assignment.", next:"Write and explain one LEFT JOIN", saved:"Your query + next step", link:"/workspace", action:"Plan my next step", steps:["One task","Your time","A way forward"] },
 { label:"An unfinished idea", icon:Lightbulb, file:"Something on your mind", note:"“I like building things. No idea what I want to do.”", title:"You can figure it out by doing.", body:"Talk it through with Pip. Explore one interest, find a small project, and keep the ideas you want to return to.", next:"Choose a small thing to build", saved:"Your ideas + what to explore", link:"/pip", action:"Talk it through with Pip", steps:["Talk it out","Explore","Make a start"] },
];
export default function LandingDesk(){
 const [selected,setSelected]=useState(0); const item=samples[selected];
 return <div className="studio-desk" id="try-stride">
  <div className="desk-caption"><span><span className="studio-dot"/> A LITTLE LESS STUCK</span><span>Interactive example · no upload needed</span></div>
  <div className="desk-layout">
   <div className="desk-input"><span className="studio-overline">WHAT’S ON YOUR MIND?</span><div className="desk-choices" role="group" aria-label="Choose an example">{samples.map((sample,i)=><button type="button" key={sample.label} aria-pressed={selected===i} onClick={()=>setSelected(i)}><sample.icon size={20}/><span>{sample.label}</span><ArrowRight size={17}/></button>)}</div><div className="desk-note"><FileText size={20}/><strong>{item.file}</strong><p>{item.note}</p><span className="desk-note-fold" aria-hidden="true"/></div></div>
   <div className="desk-response" aria-live="polite" aria-atomic="true"><div className="desk-pip"><PipMark/><span>Pip<span>Your study companion</span></span><span className="desk-example">Example</span></div><h2>{item.title}</h2><p>{item.body}</p><div className="desk-steps">{item.steps.map((step,i)=><span key={step}><b>0{i+1}</b>{step}</span>)}</div><a href={item.link} className="studio-button">{item.action}<ArrowRight size={19}/></a></div>
   <div className="desk-trail"><div className="desk-pin" aria-hidden="true">✳</div><span className="studio-overline">THIS COULD BECOME</span><h3>Something<br/>you can show.</h3><div className="desk-proof"><span className="desk-check"><Check size={18}/></span><strong>{item.next}</strong><span>{item.saved}</span></div><div className="desk-return"><MessageCircle size={20}/><p>Next time, pick up<br/>where you left off.</p></div><a href="/journal">Meet your work journal <ArrowRight size={16}/></a></div>
  </div>
 </div>;
}
