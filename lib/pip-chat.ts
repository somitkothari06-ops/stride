import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getState, mutate } from "./store";
import type { PipChat, PipMessage, PipSource, PipThreads, PipSnapshot, Workspace } from "./types";
import { personalContext } from "./personal-context";

const ThreadId=z.union([z.uuid(),z.literal("legacy")]);
export const ChatInput = z.discriminatedUnion("action", [
  z.object({action:z.literal("send"),threadId:ThreadId.optional(),turnId:z.uuid(),version:z.number().int().nonnegative(),text:z.string().trim().min(1).max(3000),allowSearch:z.boolean()}),
  z.object({action:z.literal("clear"),threadId:ThreadId.optional(),version:z.number().int().nonnegative()}),
  z.object({action:z.literal("create"),id:z.uuid(),revision:z.number().int().nonnegative()}),
  z.object({action:z.literal("select"),threadId:ThreadId}),
  z.object({action:z.literal("title"),threadId:ThreadId,version:z.number().int().nonnegative()}),
  z.object({action:z.literal("rename"),threadId:ThreadId,title:z.string().trim().min(1).max(70),revision:z.number().int().nonnegative()}),
  z.object({action:z.literal("delete"),threadId:ThreadId,version:z.number().int().nonnegative(),revision:z.number().int().nonnegative()}),
]);
export function threadStore(state:Workspace):PipThreads {
 if(state.pipThreads)return state.pipThreads;
 const chat=state.pipChat||{version:0,messages:[]};
 return {revision:0,activeId:"legacy",items:[{id:"legacy",title:chat.messages.length?"Previous conversation":"New chat",createdAt:chat.messages[0]?.createdAt||"1970-01-01T00:00:00.000Z",updatedAt:chat.messages.at(-1)?.createdAt||"1970-01-01T00:00:00.000Z",chat}]};
}
function editThreads(state:Workspace){if(!state.pipThreads){state.pipThreads=threadStore(state);delete state.pipChat;}return state.pipThreads;}
function findThread(state:Workspace,id?:string){const threads=threadStore(state);const thread=threads.items.find(item=>item.id===(id||threads.activeId));if(!thread)throw new Error("CHAT_NOT_FOUND");return thread;}
export function chatSnapshot(state:Workspace,id?:string):PipSnapshot {const store=threadStore(state),thread=findThread(state,id);return {chat:thread.chat,threadId:thread.id,threadRevision:store.revision,threads:store.items.map(item=>({id:item.id,title:item.title,updatedAt:item.updatedAt,messageCount:item.chat.messages.length,needsTitle:item.chat.messages.length>0&&item.titleMode!=="manual"&&item.titledVersion===undefined})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};}
export function manageChat(session:string,input:Exclude<z.infer<typeof ChatInput>,{action:"send"|"clear"|"title"}>){
 let selected="";
 const state=mutate(session,state=>{
  const store=editThreads(state);const now=new Date().toISOString();
  if(input.action==="create"){
   const existing=store.items.find(item=>item.id===input.id);if(existing){store.activeId=existing.id;selected=existing.id;return;}
   if(store.revision!==input.revision)throw new Error("CHAT_STALE");
   if(store.items.length>=50)throw new Error("CHAT_THREAD_LIMIT");
   store.items.push({id:input.id,title:"New chat",createdAt:now,updatedAt:now,chat:{version:0,messages:[]}});store.activeId=input.id;selected=input.id;store.revision++;return;
  }
  const thread=findThread(state,input.threadId);selected=thread.id;
  if(input.action==="select"){store.activeId=thread.id;return;}
  if(store.revision!==input.revision)throw new Error("CHAT_STALE");
  if(input.action==="rename"){thread.title=input.title;thread.titleMode="manual";store.revision++;return;}
  if(thread.chat.version!==input.version)throw new Error("CHAT_STALE");
  store.items=store.items.filter(item=>item.id!==thread.id);store.revision++;
  if(!store.items.length){const id=randomUUID();store.items.push({id,title:"New chat",createdAt:now,updatedAt:now,chat:{version:0,messages:[]}});}
  if(store.activeId===thread.id)store.activeId=store.items[0].id;
  selected=store.activeId;
 });
 return chatSnapshot(state,selected);
}
export const SearchRequest = z.object({query:z.string().trim().min(3).max(180).nullable()});
export const ChatReply = z.object({reply:z.string().trim().min(1).max(2400),intent:z.enum(["talk","teach","search"]),sourceIds:z.array(z.string().max(80)).max(5),title:z.string().trim().min(3).max(60).optional().catch(undefined)});
export function mayNeedWeb(text: string) {return /\b(find|search|look up|look for|latest|current|resources?|tutorials?|links?|sources?|papers?|documentation|news|explain|teach|understand)\b|where can i (learn|study|find)|what (is|are)|how (does|do)|why (does|is)|help me try/i.test(text);}

export function chatState(state: Workspace,id?:string): PipChat {return findThread(state,id).chat;}
export function chatHistory(state:Workspace,id?:string) {
 const messages=chatState(state,id).messages;let size=0;let start=messages.length;
 for(let i=messages.length-2;i>=0;i-=2){const pairSize=messages[i].text.length+messages[i+1].text.length;if(size+pairSize>16000)break;size+=pairSize;start=i;}
 return messages.slice(start).map(message=>({role:message.role,text:message.text}));
}
export function existingTurn(state: Workspace, turnId: string, text: string,threadId?:string) {
  const chat=chatState(state,threadId), user=chat.messages.find(message=>message.turnId===turnId && message.role==="user");
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
export function commitChatTurn(session: string, version: number, turnId: string, text: string, answer: {text:string;intent:NonNullable<PipMessage["intent"]>;sources:PipSource[];searchStatus?:PipMessage["searchStatus"];title?:string},threadId="legacy") {
  let result:PipChat|undefined;
  mutate(session,state=>{
    editThreads(state);
    const previous=existingTurn(state,turnId,text,threadId);
    if(previous){result=previous;return;}
    const thread=findThread(state,threadId),chat=thread.chat;
    if(chat.messages.length>=200)throw new Error("CHAT_FULL");
    if(chat.version!==version)throw new Error("CHAT_STALE");
    const createdAt=new Date().toISOString();
    const messages:PipMessage[]=[...chat.messages,{id:randomUUID(),turnId,role:"user",text,createdAt},{id:randomUUID(),turnId,role:"assistant",text:answer.text,intent:answer.intent,sources:answer.sources,...(answer.searchStatus ? {searchStatus:answer.searchStatus} : {}),createdAt}];
    result={version:version+1,messages};
    thread.chat=result;thread.updatedAt=createdAt;
    if(thread.titleMode!=="manual"&&answer.title&&(thread.titledVersion===undefined||chat.version<3)){thread.title=answer.title;thread.titleMode="auto";thread.titledVersion=version+1;state.pipThreads!.revision++;}
    else if(thread.title==="New chat")thread.title=text.replace(/\s+/g," ").slice(0,70);
  });
  return result!;
}
export function clearChat(session:string,version:number,threadId="legacy") {
 const state=mutate(session,state=>{editThreads(state);const thread=findThread(state,threadId);if(thread.chat.version!==version)throw new Error("CHAT_STALE");thread.chat={version:version+1,messages:[]};thread.updatedAt=new Date().toISOString();});
 return chatState(state,threadId);
}
export function requireChatVersion(session:string,version:number,threadId="legacy") {
 const current=getState(session);if(!current)throw new Error("SESSION_EXPIRED");
 const chat=chatState(current,threadId);if(chat.version!==version)throw new Error("CHAT_STALE");
 if(chat.messages.length>=200)throw new Error("CHAT_FULL");
}

export function modelIdentityReply(text:string,model:string|null){
 if(!/^(?:(?:what|which)\s+(?:ai\s+)?model\s+(?:are you(?: (?:using|running(?: on)?))?|do you use)|what powers you|are you (?:chatgpt|claude|gemini))(?:,? (?:man|bro|bruh|dude|please))?[?!. ]*$/i.test(text.trim()))return undefined;
 return model ? `I'm Pip, running on ${model} through Nebius Token Factory.` : "I'm Pip. Live AI isn't connected right now.";
}

export const ChatTitleReply=z.object({title:z.string().trim().min(3).max(60)});
export function commitChatTitle(session:string,threadId:string,version:number,title:string){
 const state=mutate(session,state=>{const store=editThreads(state),thread=findThread(state,threadId);if(thread.chat.version!==version||thread.titleMode==="manual"||thread.titledVersion!==undefined)return;thread.title=ChatTitleReply.parse({title}).title;thread.titleMode="auto";thread.titledVersion=version;store.revision++;});return chatSnapshot(state,threadId);
}
