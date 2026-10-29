import type {Workspace,PipSource} from './types';
import {retainedMemorySources} from './long-memory';
// Selected saved records, not an ability assessment or the student's complete history.
export function journalSources(state:Workspace,maxChars=3000):PipSource[]{
 let budget=maxChars;const out:PipSource[]=[];
 for(const entry of [...(state.evidence?.entries||[])].reverse().slice(0,3)){
  const text=[`Student-reported activity: ${entry.reported.activity}`,`Student explanation: ${entry.reported.explanation.slice(0,1000)}`,entry.observed.artifactShows?`${entry.assessment==="unassessed"?"Unassessed submission":"Model interpretation of submission (not verified)"}: ${entry.observed.artifactShows.slice(0,400)}`:'',entry.modelFeedback?`Prior model feedback (not a grade): ${entry.modelFeedback.slice(0,300)}`:''].filter(Boolean).join('\n');
  if(budget<100)break;const excerpt=text.slice(0,budget);budget-=excerpt.length;
  out.push({id:`journal-${entry.id}`,title:entry.reported.activity.slice(0,160),locator:'Work journal · student-reported',excerpt});
 }
 return out;
}

export function retainedChatSources(sources:PipSource[],state:Workspace):PipSource[]{
 const present=new Set((state.evidence?.entries||[]).map(entry=>`journal-${entry.id}`));
 return retainedMemorySources(sources,state).filter(source=>{const origin=source.originId||source.id;return !origin.startsWith('journal-')||present.has(origin);});
}
