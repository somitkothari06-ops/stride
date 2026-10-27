"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { Dictation } from "./voice-capture";
import { completePipLaunch } from "@/lib/pip-navigation";
import type { PipChat } from "@/lib/types";

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

export default function PipConversation({active,onKeep,onListening,onBusy,onDraftChange,prompt}:{onDraftChange?:(value:string)=>void;prompt?:{id:string;text:string;autoSend?:boolean};active:boolean;onBusy:(value:boolean)=>void;onKeep:(text:string)=>void;onListening:(value:boolean)=>void}) {
 const [chat,setChat]=useState<PipChat>({version:0,messages:[]}),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[listening,setListening]=useState(false),[newReply,setNewReply]=useState(false);
 const transcript=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),pending=useRef<{id:string;text:string;version:number}|null>(null), launched=useRef(""),stickToBottom=useRef(true);
 async function load() {
  setLoading(true);setError("");
  try { const boot=await fetch("/api/workspace?fresh=1",{cache:"no-store"});if(!boot.ok)throw new Error("Open your workspace or sign in again.");const response=await fetch("/api/pip-chat",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Couldn't load this conversation.");if(pending.current && data.chat.messages.some((message:{turnId:string})=>message.turnId===pending.current!.id))setDraft("");setChat(data.chat);pending.current=null; }
  catch(e){setError(e instanceof Error?e.message:"Couldn't connect.");}finally{setLoading(false);}
 }
 useEffect(()=>{if(active&&!busy)void load();},[active]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(prompt&&!prompt.autoSend){setDraft(previous=>`${previous}${previous.trim()?"\n":""}${prompt.text}`.slice(0,3000));completePipLaunch(prompt.id);}},[prompt]);
 useEffect(()=>{onDraftChange?.(draft);},[draft,onDraftChange]);
 useEffect(()=>{onBusy(busy);},[busy,onBusy]);
 useEffect(()=>()=>onBusy(false),[onBusy]);
 useEffect(()=>{if(active&&!loading)input.current?.focus();},[active,loading]);
 useEffect(()=>{if(active){const box=transcript.current;if(box&&stickToBottom.current){box.scrollTop=box.scrollHeight;setNewReply(false);}else if(box)setNewReply(true);}},[chat,active,busy]);
 async function send(overrideText?:string,turnId?:string) {
  const text=(overrideText||draft).trim();if(!text||busy||listening)return;
  stickToBottom.current=true;setBusy(true);setError("");
  if(!pending.current||pending.current.text!==text||pending.current.version!==chat.version)pending.current={id:turnId||crypto.randomUUID(),text,version:chat.version};
  try {
   const response=await fetch("/api/pip-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send",turnId:pending.current.id,version:chat.version,text,allowSearch:true})});
   const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Pip couldn't answer. Your message is still here.");
   if(pending.current)completePipLaunch(pending.current.id);setChat(data.chat);setDraft("");pending.current=null;window.dispatchEvent(new Event("stride-workspace-changed"));input.current?.focus();
  }catch(e){setError(e instanceof Error?e.message:"Couldn't connect. Your message is still here.");}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!prompt?.autoSend||!active||loading||busy||launched.current===prompt.id)return;
  launched.current=prompt.id;
  if(chat.messages.some(message=>message.turnId===prompt.id)){completePipLaunch(prompt.id);return;}
  setDraft(prompt.text);void send(prompt.text,prompt.id);
 },[prompt,active,loading]);
 async function clear() {
  if(!window.confirm("Clear Pip's recent conversation? Saved coursework, thoughts and personal context stay in your workspace."))return;
  setBusy(true);setError("");
  try {const response=await fetch("/api/pip-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"clear",version:chat.version})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||"Couldn't clear chat.");setChat(data.chat);pending.current=null;}
  catch(e){setError(e instanceof Error?e.message:"Couldn't clear chat.");}finally{setBusy(false);}
 }
 return <div className="pip-conversation" hidden={!active}>

  <div className="pip-chat-transcript" ref={transcript} onScroll={()=>{const box=transcript.current;if(box){stickToBottom.current=box.scrollHeight-box.scrollTop-box.clientHeight<100;if(stickToBottom.current)setNewReply(false);}}} role="log" aria-label="Conversation with Pip" aria-live="polite" aria-relevant="additions">
   {loading ? <p className="pip-chat-empty">Opening our conversation…</p>:!chat.messages.length ? <div className="pip-chat-welcome"><h3>What’s going on?</h3><p>A confusing topic, a rough day, an idea you’re excited about. Start wherever you are.</p><span><BookOpen size={17}/>We can work it through together.</span></div>:null}
   {chat.messages.map(message=><article className={`pip-message pip-message-${message.role}`} key={message.id}><span>{message.role==="user"?"You":"Pip"}{message.intent==="teach" ? " · Learning together":""}</span><Answer text={message.text}/>{message.role==="user" && <details className="pip-message-menu"><summary aria-label="Message options"><MoreHorizontal size={18}/></summary><button type="button" disabled={busy||listening} onClick={()=>onKeep(message.text)}>Save from this message</button></details>}
    {!!message.sources?.length && <details className="pip-chat-sources"><summary>What Pip used · {message.sources.length}</summary>{message.sources.map(source=><div key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>:<strong>{source.title} · {source.locator}</strong>}{!source.url&&<p>{source.excerpt}</p>}</div>)}</details>}
    {message.searchStatus==="unavailable"&&<small className="pip-search-unavailable">Web search didn’t return usable results.</small>}
   </article>)}
   {busy&&<p className="pip-chat-pending" role="status">Pip is working on your message…</p>}
  </div>
  {newReply&&<button className="pip-latest-reply" onClick={()=>{stickToBottom.current=true;const box=transcript.current;if(box)box.scrollTop=box.scrollHeight;setNewReply(false);}}>Latest reply ↓</button>}
  <form className="pip-chat-composer" onSubmit={event=>{event.preventDefault();void send();}}>
   <label htmlFor="pip-chat-message" className="sr-only">Message Pip</label><textarea id="pip-chat-message" ref={input} value={draft} maxLength={3000} rows={3} disabled={busy||loading} onChange={event=>setDraft(event.target.value)} placeholder="Talk to Pip…" onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}}/>
   <div className="pip-chat-send"><details className="pip-composer-menu"><summary aria-label="Conversation options" title="Conversation options"><ChevronDown size={18}/></summary><div><p>Your recent conversation stays here. Pip can search for useful information. Nothing is added to your tasks or profile unless you choose to save it.</p><button type="button" disabled={busy||loading||listening} onClick={load}><RefreshCw size={15}/>Reload conversation</button><button type="button" disabled={busy||loading||listening||!chat.messages.length} onClick={clear}><Trash2 size={15}/>Clear conversation</button></div></details><Dictation compact iconOnly showPrivacy={false} disabled={!active||busy||loading} onListening={value=>{setListening(value);onListening(value);}} onText={chunk=>setDraft(previous=>`${previous}${previous?" ":""}${chunk}`.slice(0,3000))}/><button className="btn primary" type="submit" aria-label="Send message" title="Send message" disabled={busy||loading||listening||!draft.trim()}><ArrowRight size={20}/></button></div>
   {error&&<div className="pip-chat-error" role="alert"><p>{error}</p><button type="button" disabled={busy||loading} onClick={load}>Reload conversation</button></div>}
  </form>
 </div>;
}
