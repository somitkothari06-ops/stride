import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getState, mutate } from "./store";
import type { PipChat, PipMessage, PipSource, Workspace } from "./types";
import { personalContext } from "./personal-context";

export const ChatInput = z.discriminatedUnion("action", [
  z.object({action:z.literal("send"), turnId:z.uuid(), version:z.number().int().nonnegative(), text:z.string().trim().min(1).max(3000), allowSearch:z.boolean()}),
  z.object({action:z.literal("clear"), version:z.number().int().nonnegative()}),
]);
export const SearchRequest = z.object({query:z.string().trim().min(3).max(180).nullable()});
export const ChatReply = z.object({reply:z.string().trim().min(1).max(2400),intent:z.enum(["talk","teach","search"]),sourceIds:z.array(z.string().max(80)).max(5)});
export function mayNeedWeb(text: string) {return /\b(find|search|look up|look for|latest|current|resources?|tutorials?|links?|sources?|papers?|documentation|news|explain|teach|understand)\b|where can i (learn|study|find)|what (is|are)|how (does|do)|why (does|is)|help me try/i.test(text);}

export function chatState(state: Workspace): PipChat { return state.pipChat || {version:0,messages:[]}; }
export function chatHistory(state:Workspace) {
 const messages=chatState(state).messages;let size=0;let start=messages.length;
 for(let i=messages.length-2;i>=0;i-=2){const pairSize=messages[i].text.length+messages[i+1].text.length;if(size+pairSize>16000)break;size+=pairSize;start=i;}
 return messages.slice(start).map(message=>({role:message.role,text:message.text}));
}
export function existingTurn(state: Workspace, turnId: string, text: string) {
  const chat=chatState(state), user=chat.messages.find(message=>message.turnId===turnId && message.role==="user");
  if(user && user.text!==text)throw new Error("CHAT_STALE");
  return user && chat.messages.some(message=>message.turnId===turnId && message.role==="assistant") ? chat : null;
}
export function chatContext(state: Workspace, text: string) {
  const terms=new Set(text.toLowerCase().match(/[a-z]{3,}/g)||[]);
  const pages=(state.materials||[]).flatMap(material=>material.pages.map(page=>({title:material.title,locator:page.locator,text:page.text,subject:material.subject,score:[...terms].reduce((n,term)=>n+(`${material.subject} ${material.title} ${page.text}`.toLowerCase().includes(term)?1:0),0)}))).filter(page=>page.score>1).sort((a,b)=>b.score-a.score).slice(0,3);
  const sources:PipSource[]=pages.map((page,index)=>({id:`course-${index+1}`,title:page.title,locator:page.locator,excerpt:page.text.slice(0,1600)}));
  return {profile:{name:state.profile.name,year:state.profile.year,minutes:state.profile.minutes,goal:state.profile.goal,context:personalContext(state.profile.lifeContext)},coursework:state.works.filter(work=>!work.completed).slice(0,12).map(work=>({title:work.title,subject:work.subject,dueDate:work.dueDate,summary:work.summary.slice(0,400),source:text.toLowerCase().includes(work.title.toLowerCase())?work.source.slice(0,1500):undefined})),currentActivity:state.direction?{role:state.direction.role,activity:state.direction.nextMove}:null,recentThoughts:(state.notes||[]).slice(-3).map(note=>note.text.slice(0,700)),recentObservations:state.observations.filter(item=>!item.removed).slice(-3).map(item=>({title:item.title,feedback:item.feedback.slice(0,500),method:item.method})),sources};
}
export function validateChatSources(ids: string[], sources: PipSource[]) {
  const byId=new Map(sources.map(source=>[source.id,source]));
  if(ids.some(id=>!byId.has(id)))throw new Error("MODEL_UNAVAILABLE");
  return [...new Set(ids)].map(id=>byId.get(id)!);
}
export function commitChatTurn(session: string, version: number, turnId: string, text: string, answer: {text:string;intent:NonNullable<PipMessage["intent"]>;sources:PipSource[];searchStatus?:PipMessage["searchStatus"]}) {
  let result:PipChat|undefined;
  mutate(session,state=>{
    const previous=existingTurn(state,turnId,text);
    if(previous){result=previous;return;}
    const chat=chatState(state);
    if(chat.version!==version)throw new Error("CHAT_STALE");
    const createdAt=new Date().toISOString();
    const messages:PipMessage[]=[...chat.messages,{id:randomUUID(),turnId,role:"user",text,createdAt},{id:randomUUID(),turnId,role:"assistant",text:answer.text,intent:answer.intent,sources:answer.sources,...(answer.searchStatus ? {searchStatus:answer.searchStatus} : {}),createdAt}];
    result={version:version+1,messages:messages.slice(-40)};
    state.pipChat=result;
  });
  return result!;
}
export function clearChat(session: string, version: number) {
  return mutate(session,state=>{if(chatState(state).version!==version)throw new Error("CHAT_STALE");state.pipChat={version:version+1,messages:[]};}).pipChat!;
}
export function requireChatVersion(session: string, version: number) {
  const current=getState(session);
  if(!current)throw new Error("SESSION_EXPIRED");
  if(chatState(current).version!==version)throw new Error("CHAT_STALE");
}

export function modelIdentityReply(text:string,model:string|null){
 if(!/^(?:(?:what|which)\s+(?:ai\s+)?model\s+(?:are you(?: (?:using|running(?: on)?))?|do you use)|what powers you|are you (?:chatgpt|claude|gemini))(?:,? (?:man|bro|bruh|dude|please))?[?!. ]*$/i.test(text.trim()))return undefined;
 return model ? `I'm Pip, running on ${model} through Nebius Token Factory.` : "I'm Pip. Live AI isn't connected right now.";
}
