import { createHash } from "node:crypto";
import type { PipSource, Workspace } from "./types";

const stop=new Set('the and this that with from have what about would could please help explain tell want your into some just does how'.split(' '));
function terms(text:string){
 const words=text.toLowerCase().match(/[a-z0-9]{2,}/g)||[];
 const out=new Set(words.filter(word=>!stop.has(word)));
 const groups=[['sql','dbms','database','databases','joins','query','schema'],['os','operating','scheduling','paging','deadlock'],['dsa','algorithms','algorithm','structures','heap','graph'],['javascript','js','node','express'],['football','soccer'],['network','networks','networking']];
 for(const group of groups)if(group.some(word=>out.has(word)))for(const word of group)out.add(word);
 return out;
}
function memoryId(key:string){return 'memory-'+createHash('sha256').update(key).digest('hex').slice(0,24);}
type RecordSource=PipSource&{at:string;key:string};
export function memoryRecords(state:Workspace,excludeThread?:string):RecordSource[]{
 const out:RecordSource[]=[];
 const add=(key:string,title:string,text:string,at:string,locator:string)=>{if(text.trim())out.push({id:memoryId(key+':'+text),key,title:title.slice(0,160),excerpt:text,at,locator:`${locator} · ${at.slice(0,10)}`});};
 for(const note of state.notes||[])add('note:'+note.id,'Saved thought',note.text,note.createdAt,'Your words');
 for(const work of state.works)add('work:'+work.id,work.title,`${work.subject}\n${work.summary}\n${work.source}`,work.createdAt,'Saved coursework, not a demonstration of skill');
 for(const item of state.observations.filter(item=>!item.removed))add('attempt:'+item.id,item.title,`Your attempt: ${item.answer}\n${item.method==='self-report'?'Self-reported note':'Prior model feedback, not verified'}: ${item.feedback}`,item.createdAt,'Saved attempt');
 for(const entry of state.evidence?.entries||[])add('journal:'+entry.id,entry.reported.activity,`Your words: ${entry.reported.explanation}\nModel interpretation, not verified: ${entry.observed.artifactShows}\nPrior feedback: ${entry.modelFeedback||''}`,entry.createdAt,'Journal');
 for(const thread of state.pipThreads?.items||[]){
  for(let i=0;i<thread.chat.messages.length;i++){
   if(thread.id===excludeThread&&i>=thread.chat.messages.length-8)continue;
   const turn=thread.chat.messages[i];if(turn.role!=='user')continue;
   // A later deleted citation must not come back through an old assistant answer.
   add(`chat:${thread.id}:${turn.id}`,thread.title,`You said: ${turn.text}`,turn.createdAt,'Earlier chat · your words');
  }
 }
 const project=state.build?.project;
 if(project){add('build:'+project.id,project.title,`${project.idea}\nCurrent step: ${project.current.title}\n${project.current.task}`,project.createdAt,'Your build');
  for(const attempt of project.attempts)add('build-attempt:'+attempt.id,`${project.title}: ${attempt.step.title}`,`Your attempt: ${attempt.text}\nPrior model feedback, not verified: ${attempt.feedback.noticed}\nSuggested improvement: ${attempt.feedback.improve}`,attempt.createdAt,'Build attempt');
 }
 return out;
}
export function retrieveMemory(state:Workspace,query:string,options:{excludeThread?:string;budget?:number;limit?:number}={}):PipSource[]{
 const wanted=terms(query);if(!wanted.size)return [];
 const ranked=memoryRecords(state,options.excludeThread).map(record=>{
  const heading=terms(record.title),body=terms(record.excerpt);
  let score=0;for(const term of wanted)score+=(heading.has(term)?4:0)+(body.has(term)?1:0);
  return {record,score};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||b.record.at.localeCompare(a.record.at));
 let budget=options.budget??4800;const result:PipSource[]=[];
 for(const {record} of ranked.slice(0,options.limit??5)){
  if(budget<100)break;
  const words=[...wanted].filter(word=>word.length>2),lower=record.excerpt.toLowerCase();
  const first=words.map(word=>lower.indexOf(word)).filter(n=>n>=0).sort((a,b)=>a-b)[0]??0;
  const start=Math.max(0,first-160),excerpt=record.excerpt.slice(start,start+Math.min(budget,1200));
  result.push({id:record.id,title:record.title,locator:record.locator,excerpt:(start?'…':'')+excerpt});budget-=excerpt.length;
 }
 return result;
}
export function retainedMemorySources(sources:PipSource[],state:Workspace){
 const valid=new Set(memoryRecords(state).map(item=>item.id));
 return sources.filter(source=>{const id=source.originId||source.id;if(id.startsWith('selected-'))return Boolean(state.evidence?.entries.some(entry=>'selected-'+entry.id===id));return !id.startsWith('memory-')||valid.has(id);});
}
