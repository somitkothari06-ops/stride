"use client";
import {useState} from 'react';
import {ArrowRight,Clock3} from 'lucide-react';
import {pocketMinutes,pocketSchedule,type PocketMinutes} from '@/lib/time-pocket';
export default function TimePocket({current,disabled,hasWork,onUse,onAdd}:{current:number;disabled:boolean;hasWork:boolean;onUse:(minutes:PocketMinutes)=>Promise<unknown>;onAdd:()=>void}){
 const [minutes,setMinutes]=useState<PocketMinutes>(pocketMinutes.includes(current as PocketMinutes)?current as PocketMinutes:30);
 const steps=pocketSchedule(minutes);
 return <section className="time-pocket" aria-label="Choose time for your next step"><div className="pocket-heading"><span><Clock3 size={20}/> A little time goes a long way.</span><div role="group" aria-label="Available time">{pocketMinutes.map(value=><button type="button" key={value} disabled={disabled} aria-pressed={minutes===value} onClick={()=>setMinutes(value)}>{value}<span> min</span></button>)}</div></div><div className="pocket-body" aria-live="polite"><div className="pocket-number"><strong>{minutes}</strong><span>minutes.<br/>One useful thing.</span></div><ol className="pocket-schedule">{steps.map((step,i)=><li key={step.label} style={{flex:step.minutes}}><span className={`pocket-segment segment-${i}`} aria-hidden="true"/><small>{step.minutes} min</small><strong>{step.label}</strong></li>)}</ol><button className="pocket-go" type="button" disabled={disabled} onClick={()=>hasWork?void onUse(minutes):onAdd()}>{hasWork?'Use this time':'Add a task to start'}<ArrowRight size={19}/></button></div></section>;
}
