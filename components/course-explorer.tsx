"use client";
import {useEffect,useState} from 'react';
import {ArrowRight,BookOpen,Search,ExternalLink} from 'lucide-react';
import {courseBenchmarks,courseExcerpts} from '@/lib/course-types';
import type {CourseReference,SealedReference} from '@/lib/course-references';
import type {Workspace} from '@/lib/types';
import {connectionMessage,requestJson} from '@/lib/client-request';
import {launchPipChat} from '@/lib/pip-navigation';
type Comparison={comparison:{localFocus:{point:string;sourceId:string;quote:string}[];externalFocus:{point:string;quote:string}[];bridgeExercise:string;caution:string};excerpts:ReturnType<typeof courseExcerpts>;benchmark:{name:string;url:string}};
const titles:Record<string,string>={'mit-os':'Operating systems','mit-algorithms':'Algorithms & data structures','berkeley-db':'Database systems'};
export function starterCourseIds(subject:string){if(/operating|\bos\b/i.test(subject))return ['mit-os'];if(/algorithm|data structure|\bdsa\b|\bdaa\b/i.test(subject))return ['mit-algorithms'];if(/database|dbms|\bsql\b/i.test(subject))return ['berkeley-db'];return [];}
export default function CourseExplorer({state,onAddNotes}:{state:Workspace;onAddNotes:(subject:string)=>void}){
 const subjects=[...new Set([...(state.materials||[]).map(m=>m.subject),...state.works.map(w=>w.subject)])];
 const defaultSubject=subjects[0]??'';
 const [touched,setTouched]=useState(false);
 const [typed,setTyped]=useState(subjects[0]??''),[found,setFound]=useState<SealedReference[]>([]),[selected,setSelected]=useState(''),[searched,setSearched]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[comparison,setComparison]=useState<Comparison|null>(null);
 const subject=typed,starterIds=starterCourseIds(subject);
 const starters:CourseReference[]=courseBenchmarks.filter(c=>starterIds.includes(c.id)).map(c=>({...c}));
 const choices=[...starters,...found.map(item=>item.reference).filter(item=>!starters.some(c=>c.url===item.url))];
 const active=choices.find(c=>c.id===selected)||choices[0];
 useEffect(()=>{if(!touched){setTyped(defaultSubject);setFound([]);setSelected('');setSearched(false);setComparison(null);}},[defaultSubject,touched]);
 useEffect(()=>setComparison(null),[state.revision]);
 const excerpts=courseExcerpts(state.materials||[],subject),hasNotes=excerpts.length>0;
 function changeSubject(value:string){setTouched(true);setTyped(value);setFound([]);setSelected('');setSearched(false);setError('');setComparison(null);}
 async function find(){if(busy||subject.trim().length<2)return;setBusy('Finding courses');setError('');try{const result=await requestJson<{subject:string;references:SealedReference[]}>('/api/course-references',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:subject.trim()})});if(result.subject!==subject.trim())throw Error("The subject changed. Find courses again.");setFound(result.references);setSelected('');setSearched(true);setComparison(null);}catch(e){setError(connectionMessage(e,'Couldn’t find courses. Please try again.'));}finally{setBusy('');}}
 async function compare(){if(!active||busy)return;if(!hasNotes){launchPipChat(`Help me start learning ${subject.trim()}. Find and use this public course page if relevant: ${active.url}. Explain one concept and give me a small example.`);return;}setBusy('Finding an exercise');setError('');try{const selection=found.find(item=>item.reference.id===active.id);const result=await requestJson<Comparison>('/api/course-bridge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:subject.trim(),...(selection?{selection}:{benchmark:active.id})})});setComparison(result);}catch(e){setError(connectionMessage(e,'Couldn’t prepare this exercise. Your notes are safe. Please try again.'));}finally{setBusy('');}}
 return <section className="course-comparison course-explorer"><h3>Explore beyond your notes.</h3><p className="field-help">Choose any subject. Find a course, then try something from it.</p>
 <label htmlFor="explore-subject">What are you studying?</label><div className="course-subject-search"><input id="explore-subject" list="explore-subjects" value={subject} maxLength={80} disabled={!!busy} onChange={e=>changeSubject(e.target.value)} placeholder="e.g. Computer networks"/><datalist id="explore-subjects">{subjects.map(value=><option key={value} value={value}/>)}</datalist><button type="button" className="btn subtle" disabled={!!busy||subject.trim().length<2} onClick={find}><Search size={17}/>{busy==='Finding courses'?'Finding…':'Find courses'}</button></div>
 {subject.trim()&&<div className="course-notes-status"><BookOpen size={18}/><span>{hasNotes?`${new Set(excerpts.map(e=>e.materialId)).size} document${new Set(excerpts.map(e=>e.materialId)).size===1?'':'s'} ready to compare`:`No notes for ${subject.trim()} yet`}</span>{!hasNotes&&<button type="button" className="text-button" disabled={!!busy} onClick={()=>onAddNotes(subject.trim())}>Add notes <ArrowRight size={15}/></button>}</div>}
 {error&&<p role="alert" className="error-banner">{error}</p>}
 {!!choices.length&&<fieldset className="course-choice-list" disabled={!!busy}><legend>{found.length?'Choose a course page':'A starting point'}</legend>{choices.map(course=><label key={course.id} className={`course-choice ${active?.id===course.id?'is-selected':''}`}><input type="radio" name="explore-course" checked={active?.id===course.id} onChange={()=>{setSelected(course.id);setComparison(null);}}/><span><strong>{titles[course.id]||course.name}</strong><small>{course.id.startsWith('found-')?new URL(course.url).hostname:course.name}</small></span></label>)}</fieldset>}
 {searched&&!found.length&&<p role="status" className="field-help">No university course pages found. Try a more specific subject.</p>}
 {!choices.length&&!searched&&<p className="field-help">Find course pages from university websites for this subject.</p>}
 {active&&<div className="course-explorer-actions"><a className="btn subtle" href={active.url} target="_blank" rel="noopener noreferrer">Open course page <ExternalLink size={16}/></a><button type="button" className="btn primary" disabled={!!busy} onClick={compare}>{busy==='Finding an exercise'?'Preparing…':hasNotes?'Find a practice exercise':'Explore with Pip'} <ArrowRight size={16}/></button></div>}
 {comparison&&<div className="bridge-result"><h3>From your notes</h3>{comparison.comparison.localFocus.map((point,i)=><div className="course-claim" key={i}><p>{point.point}</p><details><summary>See the passage</summary><blockquote>{point.quote}</blockquote><small>{comparison.excerpts.find(e=>e.id===point.sourceId)?.title}</small></details></div>)}<h3>From the course page</h3>{comparison.comparison.externalFocus.map((point,i)=><div className="course-claim" key={i}><p>{point.point}</p><details><summary>See the passage</summary><blockquote>{point.quote}</blockquote><a href={comparison.benchmark.url} target="_blank" rel="noopener noreferrer">Open {comparison.benchmark.name} ↗</a></details></div>)}<div className="practice-context"><h3>Try this</h3><p>{comparison.comparison.bridgeExercise}</p></div><details className="field-help"><summary>About this comparison</summary><p>Uses selected passages and a course summary or search excerpt, rather than the entire course. {comparison.comparison.caution}</p></details></div>}
 </section>;
}
