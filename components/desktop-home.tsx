"use client";
import {useEffect,useState} from 'react';
import {BookOpen,Hammer,NotebookPen,ArrowUpRight} from 'lucide-react';
import type {DeskWindow} from '@/lib/desktop-tools';
import type {NavigationActivity} from '@/lib/navigation-activity';
export default function DesktopHome({name,activity,windows,open}:{name?:string;activity?:NavigationActivity;windows:DeskWindow[];open:(href:string)=>void}){
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(timer);},[]);
 const hour=now?.getHours()||0;
 const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
 return <section className="desk-home" aria-label="Desktop home">
  <div className="desk-home-art" aria-hidden="true"><i/><i/><i/><span>stride.</span></div>
  <div className="desk-home-folders" aria-label="Desktop shortcuts">
   {[{title:'Course library',note:'Your notes & slides',href:'/workspace?open=course',tone:'blue',Icon:BookOpen},{title:'My Build',note:activity?.build?'Pick up your project':'Make something yours',href:'/build',tone:'peach',Icon:Hammer},{title:'Journal',note:activity?`${activity.journal} saved ${activity.journal===1?'entry':'entries'}`:'Keep what you learn',href:'/journal',tone:'sage',Icon:NotebookPen}].map(({title,note,href,tone,Icon})=><button key={title} className={`desk-folder folder-${tone}`} onClick={()=>open(href)}><span className="folder-shape" aria-hidden="true"><span className="folder-paper"/><Icon size={28}/></span><strong>{title}</strong><small>{note}</small></button>)}
  </div>
  <div className="desk-home-clock"><p>{now?now.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'}):'Your time, your pace'}</p><time dateTime={now?.toISOString()}>{now?now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false}):'—:—'}</time><span className="desk-home-clock-rule"/><small>Local time</small></div>
  <div className="desk-home-welcome"><p>{greeting}{name?`, ${name}`:''}.</p><h1><span>{name&&name!=='Student'&&name!=='Demo student'?`${name}’s`:'Your'}</span><em>desk.</em></h1></div>

 </section>;
}
