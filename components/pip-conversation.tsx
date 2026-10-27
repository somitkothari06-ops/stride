"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, MoreHorizontal, RefreshCw, Trash2, Plus, Pencil, X, MessageCircle, PanelLeft } from "lucide-react";
import { Dictation } from "./voice-capture";
import { completePipLaunch } from "@/lib/pip-navigation";
import type { PipChat, PipSnapshot, PipThreadSummary } from "@/lib/types";

function InlineText({text}:{text:string}) {
 return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part,index)=>part.startsWith("**") ? <strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith("`") ? <code key={index}>{part.slice(1,-1)}</code>:part)}</>;
}
function CodeBlock({text}:{text:string}) {
 const [copied,setCopied]=useState(false),[failed,setFailed]=useState(false);
 return <div className="pip-code-block"><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setFailed(false);}catch{setFailed(true);}}}>{failed?"Select the code to copy":copied?"Copied":"Copy code"}</button><pre><code>{text}</code></pre></div>;
}
function Answer({text}:{text:string}) {
  const cells=(line:string)=>line.trim().replace(/^\||\|$/g,"").split("|").map(cell=>cell.trim());
  return <>{text.split(/(```[\s\S]*?```)/g).filter(Boolean).map((part,index)=>{
    if(part.startsWith("```"))return <CodeBlock key={index} text={part.replace(/^```[^\n]*\n?/,"").replace(/```$/,"")}/>;
    return part.split(/\n\s*\n/).filter(block=>block.trim()).map((block,j)=>{
      const lines=block.trim().split("\n");
      if(lines.length>2&&lines[0].includes("|")&&lines[1].includes("-")&&!lines[1].replace(/[\s|:-]/g,""))return <div className="pip-message-table" key={`${index}-${j}`}><table><thead><tr>{cells(lines[0]).map((cell,k)=><th key={k}><InlineText text={cell}/></th>)}</tr></thead><tbody>{lines.slice(2).map((line,k)=><tr key={k}>{cells(line).map((cell,l)=><td key={l}><InlineText text={cell}/></td>)}</tr>)}</tbody></table></div>;
      return <p key={`${index}-${j}`}><InlineText text={block}/></p>;
    });
  })}</>;
}

export default function PipConversation({active,onKeep,onListening,onBusy,onDraftChange,onThreadChange,full=false,prompt}:{full?:boolean;onThreadChange?:(value:string)=>void;onDraftChange?:(value:string)=>void;prompt?:{id:string;text:string;autoSend?:boolean;threadId?:string};active:boolean;onBusy:(value:boolean)=>void;onKeep:(text:string)=>void;onListening:(value:boolean)=>void}) {
 const [chat,setChat]=useState<PipChat>({version:0,messages:[]}),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[listening,setListening]=useState(false),[newReply,setNewReply]=useState(false);
 const [busyText,setBusyText]=useState("Pip is working on your message…");
 const [threadId,setThreadId]=useState(""),[threads,setThreads]=useState<PipThreadSummary[]>([]),[revision,setRevision]=useState(0),[showChats,setShowChats]=useState(false),[filter,setFilter]=useState(""),[rename,setRename]=useState<string|null>(null),[deleting,setDeleting]=useState(false);
 const titled=useRef(new Set<string>()),metadataRevision=useRef(0);
 const drafts=useRef<Record<string,string>>({}),pendingByThread=useRef<Record<string,{id:string;text:string;version:number;threadId:string}>>({}),loadSequence=useRef(0);
 function apply(data:PipSnapshot,switching=false){
  if(switching&&threadId&&data.threadId!==threadId)drafts.current[threadId]=draft;
  const attempt=pendingByThread.current[data.threadId];
  const completed=attempt&&data.chat.messages.some(message=>message.turnId===attempt.id);
  if(completed){delete pendingByThread.current[data.threadId];delete drafts.current[data.threadId];}
  if(completed||(switching&&threadId&&data.threadId!==threadId))setDraft(drafts.current[data.threadId]||"");
  pending.current=pendingByThread.current[data.threadId]||null;
  setChat(data.chat);setThreadId(data.threadId);setThreads(data.threads);setRevision(data.threadRevision);metadataRevision.current=data.threadRevision;
 }
 const optionsMenu=useRef<HTMLDetailsElement>(null);
 const transcript=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),pending=useRef<{id:string;text:string;version:number;threadId:string}|null>(null), launched=useRef(""),stickToBottom=useRef(true);
 async function load(requestedId?:string) {
  if(prompt?.autoSend)launched.current="";
  const sequence=++loadSequence.current;setLoading(true);setError("");
  try {const boot=await fetch("/api/workspace?fresh=1&bootstrap=1",{cache:"no-store"});if(!boot.ok)throw new Error("Open your workspace or sign in again.");const response=await fetch("/api/pip-chat"+(requestedId?`?threadId=${encodeURIComponent(requestedId)}`:""),{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Couldn't load this chat.");if(sequence!==loadSequence.current)return;
   apply(data,true);
  }catch(e){if(sequence===loadSequence.current)setError(e instanceof Error?e.message:"Couldn't connect.");}finally{if(sequence===loadSequence.current)setLoading(false);}
 }
 async function manage(payload:unknown){
  const response=await fetch("/api/pip-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Couldn't update this chat.");return data as PipSnapshot;
 }
 async function changeChat(id?:string){
  if(busy||listening||loading)return;setBusyText("Opening chat…");setBusy(true);setError("");
  try{const data=await manage(id?{action:"select",threadId:id}:{action:"create",id:crypto.randomUUID(),revision});apply(data,true);setShowChats(false);setRename(null);setDeleting(false);stickToBottom.current=true;}
  catch(e){setError(e instanceof Error?e.message:"Couldn't open this chat.");}finally{setBusy(false);}
 }
 async function renameChat(){if(!rename?.trim())return;setBusyText("Saving chat name…");setBusy(true);setError("");try{apply(await manage({action:"rename",threadId,title:rename.trim(),revision}));setRename(null);}catch(e){setError(e instanceof Error?e.message:"Couldn't rename this chat.");}finally{setBusy(false);}}
 async function deleteChat(){setBusyText("Deleting chat…");setBusy(true);setError("");try{const data=await manage({action:"delete",threadId,version:chat.version,revision});delete drafts.current[threadId];delete pendingByThread.current[threadId];setDraft("");pending.current=null;apply(data);setDeleting(false);}catch(e){setError(e instanceof Error?e.message:"Couldn't delete this chat.");}finally{setBusy(false);}}
 useEffect(()=>{
  const thread=threads.find(item=>item.id===threadId);
  if(!active||loading||busy||!thread?.needsTitle||titled.current.has(threadId))return;
  titled.current.add(threadId);
  void manage({action:"title",threadId,version:chat.version}).then(data=>{if(data.threadRevision>=metadataRevision.current){metadataRevision.current=data.threadRevision;setThreads(data.threads);setRevision(data.threadRevision);}}).catch(()=>{/* Naming never blocks reading or sending a message. */});
 },[active,loading,busy,threadId,chat.version,threads]);
 useEffect(()=>{if(active&&!busy)void load(prompt?.threadId);},[active]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(prompt&&!prompt.autoSend){setDraft(previous=>`${previous}${previous.trim()?"\n":""}${prompt.text}`.slice(0,3000));completePipLaunch(prompt.id);}},[prompt]);
 useEffect(()=>{onThreadChange?.(threadId);},[threadId,onThreadChange]);
 useEffect(()=>{onDraftChange?.(draft);},[draft,onDraftChange]);
 useEffect(()=>{onBusy(busy);},[busy,onBusy]);
 useEffect(()=>()=>onBusy(false),[onBusy]);
 useEffect(()=>{if(active&&!loading)input.current?.focus();},[active,loading]);
 useEffect(()=>{if(active){const box=transcript.current;if(box&&stickToBottom.current){box.scrollTop=box.scrollHeight;setNewReply(false);}else if(box)setNewReply(true);}},[chat,active,busy]);
 async function send(overrideText?:string,turnId?:string,target?:PipSnapshot) {
  const text=(overrideText||draft).trim(),destination=target?.threadId||threadId,version=target?.chat.version??chat.version;if(!text||busy||listening||!destination)return;
  stickToBottom.current=true;setBusyText("Pip is working on your message…");setBusy(true);setError("");
  pending.current=pendingByThread.current[destination]||null;
  if(!pending.current||pending.current.text!==text||pending.current.version!==version||pending.current.threadId!==destination)pending.current={id:turnId||crypto.randomUUID(),text,version,threadId:destination};
  pendingByThread.current[destination]=pending.current;
  try {
   const response=await fetch("/api/pip-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send",turnId:pending.current.id,threadId:destination,version,text,allowSearch:true})});
   const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Pip couldn't answer. Your message is still here.");
   if(pending.current)completePipLaunch(pending.current.id);apply(data);setDraft("");delete drafts.current[destination];delete pendingByThread.current[destination];pending.current=null;window.dispatchEvent(new Event("stride-workspace-changed"));input.current?.focus();
  }catch(e){setError(e instanceof Error?e.message:"Couldn't connect. Your message is still here.");}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!prompt?.autoSend||!active||loading||busy||launched.current===prompt.id)return;
  launched.current=prompt.id;
  void(async()=>{setLoading(true);try{const target=await manage({action:"create",id:prompt.id,revision});apply(target,true);if(target.chat.messages.some(message=>message.turnId===prompt.id)){completePipLaunch(prompt.id);return;}setDraft(prompt.text);await send(prompt.text,prompt.id,target);}catch(e){setDraft(prompt.text);setError(e instanceof Error?e.message:"Couldn't start this lesson.");}finally{setLoading(false);}})();
 },[prompt,active,loading]);
 const title=threads.find(thread=>thread.id===threadId)?.title||"New chat";
 const locked=busy||loading||listening;
 return <div className={`pip-chat-layout ${full?"pip-chat-full":"pip-chat-quick"}`} hidden={!active}>
  {showChats&&<button className="pip-history-scrim" aria-label="Close chat list" onClick={()=>setShowChats(false)}/>}
  <aside className={`pip-history ${showChats?"is-open":""}`} aria-label="Chat list">
   <div className="pip-history-top"><h2>Your chats</h2><button className="icon-btn pip-history-close" aria-label="Close chats" onClick={()=>setShowChats(false)}><X size={19}/></button></div>
   <button className="btn primary pip-new-chat" disabled={locked} onClick={()=>changeChat()}><Plus size={18}/>New chat</button>
   <label className="sr-only" htmlFor="pip-chat-filter">Find a chat</label><input id="pip-chat-filter" className="pip-chat-filter" placeholder="Find a chat…" value={filter} onChange={event=>setFilter(event.target.value)}/>
   <nav aria-label="Saved chats">{threads.filter(thread=>thread.title.toLowerCase().includes(filter.toLowerCase())).map(thread=><button key={thread.id} className={thread.id===threadId?"is-current":""} aria-current={thread.id===threadId?"page":undefined} disabled={locked} onClick={()=>changeChat(thread.id)}><MessageCircle size={17}/><span>{thread.title}</span></button>)}</nav>
   {!loading&&!threads.some(thread=>thread.title.toLowerCase().includes(filter.toLowerCase()))&&<p className="pip-no-chats">No matching chats.</p>}
   {full&&<a className="pip-history-profile" href="/about-you">My profile ↗</a>}
  </aside>
  <div className="pip-conversation">
   <header className="pip-thread-toolbar"><button className="icon-btn pip-show-chats" aria-label="Show chats" aria-expanded={showChats} onClick={()=>setShowChats(previous=>!previous)}><PanelLeft size={19}/></button><strong>{title}</strong><button className="icon-btn pip-toolbar-new" aria-label="New chat" title="New chat" disabled={locked} onClick={()=>changeChat()}><Plus size={20}/></button><details className="pip-thread-options" ref={optionsMenu}><summary aria-label="Chat options"><MoreHorizontal size={20}/></summary><div><button disabled={locked} onClick={()=>{if(optionsMenu.current)optionsMenu.current.open=false;setDeleting(false);setRename(title);}}><Pencil size={16}/>Rename chat</button><button disabled={locked} onClick={()=>{if(optionsMenu.current)optionsMenu.current.open=false;setRename(null);setDeleting(true);}}><Trash2 size={16}/>Delete chat</button></div></details></header>
   {rename!==null&&<form className="pip-rename" onSubmit={event=>{event.preventDefault();void renameChat();}}><label htmlFor="pip-chat-title">Chat name</label><input id="pip-chat-title" value={rename} maxLength={70} onChange={event=>setRename(event.target.value)} autoFocus/><button className="btn primary" disabled={locked||!rename.trim()}>Save name</button><button className="btn subtle" type="button" disabled={busy} onClick={()=>setRename(null)}>Cancel</button></form>}
   {deleting&&<section className="pip-delete-confirm" role="alertdialog" aria-labelledby="pip-delete-title"><h3 id="pip-delete-title">Delete this chat?</h3><p>Its messages will be removed. Saved tasks and profile details stay.</p><button className="btn subtle" disabled={busy} onClick={()=>setDeleting(false)}>Keep chat</button><button className="btn primary" disabled={locked} onClick={deleteChat}>Delete chat</button></section>}


  <div className="pip-chat-transcript" ref={transcript} onScroll={()=>{const box=transcript.current;if(box){stickToBottom.current=box.scrollHeight-box.scrollTop-box.clientHeight<100;if(stickToBottom.current)setNewReply(false);}}} role="log" aria-label="Conversation with Pip" aria-live="polite" aria-relevant="additions">
   {loading ? <p className="pip-chat-empty">Opening our conversation…</p>:!chat.messages.length ? <div className="pip-chat-welcome"><h3>What’s going on?</h3><p>A confusing topic, a rough day, an idea you’re excited about. Start wherever you are.</p><span><BookOpen size={17}/>We can work it through together.</span></div>:null}
   {chat.messages.map(message=><article className={`pip-message pip-message-${message.role}`} key={message.id}><span>{message.role==="user"?"You":"Pip"}{message.intent==="teach" ? " · Learning together":""}</span><Answer text={message.text}/>{message.role==="user" && <details className="pip-message-menu"><summary aria-label="Message options"><MoreHorizontal size={18}/></summary><button type="button" disabled={busy||listening} onClick={()=>onKeep(message.text)}>Save from this message</button></details>}
    {!!message.sources?.length && <details className="pip-chat-sources"><summary>What Pip used · {message.sources.length}</summary>{message.sources.map(source=><div key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>:<strong>{source.title} · {source.locator}</strong>}{!source.url&&<p>{source.excerpt}</p>}</div>)}</details>}
    {message.searchStatus==="unavailable"&&<small className="pip-search-unavailable">Web search didn’t return usable results.</small>}
   </article>)}
   {busy&&<p className="pip-chat-pending" role="status">{busyText}</p>}
  </div>
  {newReply&&<button className="pip-latest-reply" onClick={()=>{stickToBottom.current=true;const box=transcript.current;if(box)box.scrollTop=box.scrollHeight;setNewReply(false);}}>Latest reply ↓</button>}
  <form className="pip-chat-composer" onSubmit={event=>{event.preventDefault();void send();}}>
   <label htmlFor="pip-chat-message" className="sr-only">Message Pip</label><textarea id="pip-chat-message" ref={input} value={draft} maxLength={3000} rows={3} disabled={busy||loading} onChange={event=>setDraft(event.target.value)} placeholder="Talk to Pip…" onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}}/>
   <div className="pip-chat-send"><details className="pip-composer-menu"><summary aria-label="Conversation options" title="Conversation options"><ChevronDown size={18}/></summary><div><p>Your recent conversation stays here. Pip can search for useful information. Nothing is added to your tasks or profile unless you choose to save it.</p><button type="button" disabled={locked} onClick={()=>load(threadId)}><RefreshCw size={15}/>Reload conversation</button><button type="button" disabled={locked} onClick={()=>changeChat()}><Plus size={15}/>New chat</button></div></details><Dictation compact iconOnly showPrivacy={false} disabled={!active||busy||loading} onListening={value=>{setListening(value);onListening(value);}} onText={chunk=>setDraft(previous=>`${previous}${previous?" ":""}${chunk}`.slice(0,3000))}/><button className="btn primary" type="submit" aria-label="Send message" title="Send message" disabled={busy||loading||listening||!draft.trim()}><ArrowRight size={20}/></button></div>
   {error&&<div className="pip-chat-error" role="alert"><p>{error}</p><button type="button" disabled={busy||loading} onClick={()=>load(threadId)}>Reload conversation</button></div>}
  </form>
 </div></div>;
}
