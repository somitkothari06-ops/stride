"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, Code, CornerUpLeft, MoreHorizontal, Pin, RefreshCw, Trash2, Plus, Pencil, X, MessageCircle, PanelLeft } from "lucide-react";
import { connectionMessage, requestJson } from "@/lib/client-request";
import { Dictation } from "./voice-capture";
import { completePipLaunch } from "@/lib/pip-navigation";
import type { PipChat, PipSnapshot, PipThreadSummary } from "@/lib/types";
import "@/app/pip-canvas.css";

/* Pinned canvas: in-memory only, keyed by thread, so pins never mix between chats. */
import {addCanvasPin,MAX_PINS,type PipPin} from "@/lib/pip-canvas";


function InlineText({text}:{text:string}) {
 return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part,index)=>part.startsWith("**") ? <strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith("`") ? <code key={index}>{part.slice(1,-1)}</code>:part)}</>;
}
function CodeBlock({text,pinned,onPin}:{text:string;pinned?:boolean;onPin?:()=>void}) {
 const [copied,setCopied]=useState(false),[failed,setFailed]=useState(false);
 return <div className="pip-code-block"><div className="pip-code-block-tools"><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setFailed(false);}catch{setFailed(true);}}}>{failed?"Select the code to copy":copied?"Copied":"Copy code"}</button>{onPin?<button type="button" onClick={onPin}><Pin size={13}/>Pin</button>:pinned?<button type="button" disabled>Pinned</button>:null}</div><pre><code>{text}</code></pre></div>;
}
function Answer({text,onPinCode}:{text:string;onPinCode?:(code:string)=>void}) {
  const cells=(line:string)=>line.trim().replace(/^\||\|$/g,"").split("|").map(cell=>cell.trim());
  return <>{text.split(/(```[\s\S]*?```)/g).filter(Boolean).map((part,index)=>{
    if(part.startsWith("```")){const code=part.replace(/^```[^\n]*\n?/,"").replace(/```$/,"");return <CodeBlock key={index} text={code} onPin={onPinCode?()=>onPinCode(code):undefined}/>;}
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
 const pinsByThread=useRef(new Map<string,PipPin[]>()).current;
 const [canvasMobile,setCanvasMobile]=useState(false);
 const [pins,setPins]=useState<PipPin[]>([]),[canvasOpen,setCanvasOpen]=useState(false),[canvasNote,setCanvasNote]=useState("");
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
  const validThreads=new Set(data.threads.map(item=>item.id));for(const key of pinsByThread.keys())if(!validThreads.has(key))pinsByThread.delete(key);
  setPins(pinsByThread.get(data.threadId)||[]);setCanvasNote("");
  setChat(data.chat);setThreadId(data.threadId);setThreads(data.threads);setRevision(data.threadRevision);metadataRevision.current=data.threadRevision;
 }
 const optionsMenu=useRef<HTMLDetailsElement>(null);
 const transcript=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),pending=useRef<{id:string;text:string;version:number;threadId:string}|null>(null), launched=useRef(""),stickToBottom=useRef(true);
 const canvasPanel=useRef<HTMLElement>(null),canvasList=useRef<HTMLDivElement>(null),canvasToggle=useRef<HTMLButtonElement>(null),canvasNoteTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 async function load(requestedId?:string) {
  if(prompt?.autoSend)launched.current="";
  const sequence=++loadSequence.current;setLoading(true);setError("");
  try {await requestJson("/api/workspace?fresh=1&bootstrap=1",{cache:"no-store"},{retryNetwork:true});const data=await requestJson<PipSnapshot>("/api/pip-chat"+(requestedId?`?threadId=${encodeURIComponent(requestedId)}`:""),{cache:"no-store"},{retryNetwork:true});if(sequence!==loadSequence.current)return;
   apply(data,true);
  }catch(e){if(sequence===loadSequence.current)setError(connectionMessage(e,"Couldn’t connect. Please try again."));}finally{if(sequence===loadSequence.current)setLoading(false);}
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
 async function deleteChat(){setBusyText("Deleting chat…");setBusy(true);setError("");try{const data=await manage({action:"delete",threadId,version:chat.version,revision});delete drafts.current[threadId];delete pendingByThread.current[threadId];pinsByThread.delete(threadId);setDraft("");pending.current=null;apply(data);setDeleting(false);}catch(e){setError(e instanceof Error?e.message:"Couldn't delete this chat.");}finally{setBusy(false);}}
 function showCanvasNote(note:string){setCanvasNote(note);if(canvasNoteTimer.current)clearTimeout(canvasNoteTimer.current);canvasNoteTimer.current=setTimeout(()=>setCanvasNote(""),4000);}
 function pinToCanvas(kind:"message"|"code",messageId:string,text:string){
  if(!threadId||!text.trim())return;
  const result=addCanvasPin(pinsByThread.get(threadId)||[],{id:crypto.randomUUID(),messageId,kind,text});
  setCanvasOpen(true);
  if(result.status==="duplicate"){showCanvasNote("Already on your canvas.");return;}
  if(result.status==="full"){showCanvasNote("Remove a pin to add another.");return;}
  setCanvasNote("");pinsByThread.set(threadId,result.pins);setPins(result.pins);
 }
 function removePin(id:string){
  const next=pins.filter(pin=>pin.id!==id);
  pinsByThread.set(threadId,next);setPins(next);
  requestAnimationFrame(()=>{(next.length?canvasList:canvasPanel).current?.focus();});
 }
 function returnToPin(pin:PipPin){
  const target=transcript.current?.querySelector(`[data-message-id="${CSS.escape(pin.messageId)}"]`);
  if(target instanceof HTMLElement){target.scrollIntoView({block:"start"});target.classList.add("pip-message-recall");setTimeout(()=>target.classList.remove("pip-message-recall"),1600);}
  if(window.matchMedia("(max-width:800px)").matches)setCanvasOpen(false);
 }
 useEffect(()=>{
  const thread=threads.find(item=>item.id===threadId);
  if(!active||loading||busy||!thread?.needsTitle||titled.current.has(threadId))return;
  titled.current.add(threadId);
  void manage({action:"title",threadId,version:chat.version}).then(data=>{if(data.threadRevision>=metadataRevision.current){metadataRevision.current=data.threadRevision;setThreads(data.threads);setRevision(data.threadRevision);}}).catch(()=>{/* Naming never blocks reading or sending a message. */});
 },[active,loading,busy,threadId,chat.version,threads]);
 useEffect(()=>{if(active&&!busy)void load(prompt?.threadId);},[active]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(prompt&&!prompt.autoSend){setDraft(previous=>`${previous}${previous.trim()?"\n":""}${prompt.text}`.slice(0,3000));completePipLaunch(prompt.id);}},[prompt]);
 function closeCanvas(){setCanvasOpen(false);requestAnimationFrame(()=>canvasToggle.current?.focus());}
 useEffect(()=>{const clear=()=>{pinsByThread.clear();setPins([]);setCanvasOpen(false);};window.addEventListener("stride-signout",clear);return()=>window.removeEventListener("stride-signout",clear);},[]);
 useEffect(()=>{const media=window.matchMedia("(max-width:800px)");const update=()=>setCanvasMobile(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
 useEffect(()=>{if(full&&canvasOpen)canvasPanel.current?.focus();},[canvasOpen,full]);
 useEffect(()=>()=>{if(canvasNoteTimer.current)clearTimeout(canvasNoteTimer.current);},[]);
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
  }catch(e){setError(connectionMessage(e,"Couldn’t confirm the reply. Your message is still here; reconnect before retrying."));}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!prompt?.autoSend||!active||loading||busy||launched.current===prompt.id)return;
  launched.current=prompt.id;
  void(async()=>{setLoading(true);try{const target=await manage({action:"create",id:prompt.id,revision});apply(target,true);if(target.chat.messages.some(message=>message.turnId===prompt.id)){completePipLaunch(prompt.id);return;}setDraft(prompt.text);await send(prompt.text,prompt.id,target);}catch(e){setDraft(prompt.text);setError(e instanceof Error?e.message:"Couldn't start this lesson.");}finally{setLoading(false);}})();
 },[prompt,active,loading]);
 const title=threads.find(thread=>thread.id===threadId)?.title||"New chat";
 const locked=busy||loading||listening;
 return <div className={`pip-chat-layout ${full?"pip-chat-full":"pip-chat-quick"} ${full&&canvasOpen?"pip-canvas-open":""}`} hidden={!active}>
  {showChats&&<button className="pip-history-scrim" aria-label="Close chat list" onClick={()=>setShowChats(false)}/>}
  <aside className={`pip-history ${showChats?"is-open":""}`} aria-label="Chat list" inert={full&&canvasOpen&&canvasMobile||undefined}>
   <div className="pip-history-top"><h2>Your chats</h2><button className="icon-btn pip-history-close" aria-label="Close chats" onClick={()=>setShowChats(false)}><X size={19}/></button></div>
   <button className="btn primary pip-new-chat" disabled={locked} onClick={()=>changeChat()}><Plus size={18}/>New chat</button>
   <label className="sr-only" htmlFor="pip-chat-filter">Find a chat</label><input id="pip-chat-filter" className="pip-chat-filter" placeholder="Find a chat…" value={filter} onChange={event=>setFilter(event.target.value)}/>
   <nav aria-label="Saved chats">{threads.filter(thread=>thread.title.toLowerCase().includes(filter.toLowerCase())).map(thread=><button key={thread.id} className={thread.id===threadId?"is-current":""} aria-current={thread.id===threadId?"page":undefined} disabled={locked} onClick={()=>changeChat(thread.id)}><MessageCircle size={17}/><span>{thread.title}</span></button>)}</nav>
   {!loading&&!threads.some(thread=>thread.title.toLowerCase().includes(filter.toLowerCase()))&&<p className="pip-no-chats">No matching chats.</p>}
   {full&&<a className="pip-history-profile" href="/about-you">My profile ↗</a>}
  </aside>
  <div className="pip-conversation" inert={full&&canvasOpen&&canvasMobile||undefined}>
   <header className="pip-thread-toolbar"><button className="icon-btn pip-show-chats" aria-label="Show chats" aria-expanded={showChats} onClick={()=>setShowChats(previous=>!previous)}><PanelLeft size={19}/></button><strong>{title}</strong>{full&&<button ref={canvasToggle} className="icon-btn pip-canvas-toggle" aria-pressed={canvasOpen} aria-expanded={canvasOpen} aria-controls="pip-pinned-canvas" title="Pinned canvas" aria-label={pins.length?`Pinned canvas, ${pins.length} pinned`:"Pinned canvas"} onClick={()=>setCanvasOpen(previous=>!previous)}><Pin size={19}/>{!!pins.length&&<span className="pip-canvas-count">{pins.length}</span>}</button>}<button className="icon-btn pip-toolbar-new" aria-label="New chat" title="New chat" disabled={locked} onClick={()=>changeChat()}><Plus size={20}/></button><details className="pip-thread-options" ref={optionsMenu}><summary aria-label="Chat options"><MoreHorizontal size={20}/></summary><div><button disabled={locked} onClick={()=>{if(optionsMenu.current)optionsMenu.current.open=false;setDeleting(false);setRename(title);}}><Pencil size={16}/>Rename chat</button><button disabled={locked} onClick={()=>{if(optionsMenu.current)optionsMenu.current.open=false;setRename(null);setDeleting(true);}}><Trash2 size={16}/>Delete chat</button></div></details></header>
   {rename!==null&&<form className="pip-rename" onSubmit={event=>{event.preventDefault();void renameChat();}}><label htmlFor="pip-chat-title">Chat name</label><input id="pip-chat-title" value={rename} maxLength={70} onChange={event=>setRename(event.target.value)} autoFocus/><button className="btn primary" disabled={locked||!rename.trim()}>Save name</button><button className="btn subtle" type="button" disabled={busy} onClick={()=>setRename(null)}>Cancel</button></form>}
   {deleting&&<section className="pip-delete-confirm" role="alertdialog" aria-labelledby="pip-delete-title"><h3 id="pip-delete-title">Delete this chat?</h3><p>Its messages will be removed. Saved tasks and profile details stay.</p><button className="btn subtle" disabled={busy} onClick={()=>setDeleting(false)}>Keep chat</button><button className="btn primary" disabled={locked} onClick={deleteChat}>Delete chat</button></section>}


  <div className="pip-chat-transcript" ref={transcript} onScroll={()=>{const box=transcript.current;if(box){stickToBottom.current=box.scrollHeight-box.scrollTop-box.clientHeight<100;if(stickToBottom.current)setNewReply(false);}}} role="log" aria-label="Conversation with Pip" aria-live="polite" aria-relevant="additions">
   {loading ? <p className="pip-chat-empty">Opening our conversation…</p>:!chat.messages.length ? <div className="pip-chat-welcome"><h3>What’s going on?</h3><p>A confusing topic, a rough day, an idea you’re excited about. Start wherever you are.</p><span><BookOpen size={17}/>We can work it through together.</span></div>:null}
   {chat.messages.map(message=>{
    const pinnedWhole=pins.some(pin=>pin.messageId===message.id&&pin.kind==="message"&&pin.text===message.text);
    return <article className={`pip-message pip-message-${message.role}`} key={message.id} data-message-id={message.id}><span>{message.role==="user"?"You":"Pip"}{message.intent==="teach" ? " · Learning together":""}</span><Answer text={message.text} onPinCode={full&&message.role==="assistant"?(code:string)=>pinToCanvas("code",message.id,code):undefined}/>{message.role==="user" && <details className="pip-message-menu"><summary aria-label="Message options"><MoreHorizontal size={18}/></summary><button type="button" disabled={busy||listening} onClick={()=>onKeep(message.text)}>Save from this message</button></details>}
    {full&&message.role==="assistant"&&<details className="pip-message-menu"><summary aria-label="Message options"><MoreHorizontal size={18}/></summary><button type="button" disabled={pinnedWhole} onClick={event=>{pinToCanvas("message",message.id,message.text);const menu=event.currentTarget.closest("details");if(menu)menu.open=false;}}>{pinnedWhole?"Pinned to canvas":"Pin to canvas"}</button></details>}
    {!!message.sources?.length && <details className="pip-chat-sources"><summary>What Pip used · {message.sources.length}</summary>{message.sources.map(source=><div key={source.id}>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>:<strong>{source.title} · {source.locator}</strong>}{!source.url&&<p>{source.excerpt}</p>}</div>)}</details>}
    {message.searchStatus==="unavailable"&&<small className="pip-search-unavailable">Web search didn’t return usable results.</small>}
    </article>;
   })}
   {busy&&<p className="pip-chat-pending" role="status">{busyText}</p>}
  </div>
  {newReply&&<button className="pip-latest-reply" onClick={()=>{stickToBottom.current=true;const box=transcript.current;if(box)box.scrollTop=box.scrollHeight;setNewReply(false);}}>Latest reply ↓</button>}
  <form className="pip-chat-composer" onSubmit={event=>{event.preventDefault();void send();}}>
   <label htmlFor="pip-chat-message" className="sr-only">Message Pip</label><textarea id="pip-chat-message" ref={input} value={draft} maxLength={3000} rows={3} disabled={busy||loading} onChange={event=>setDraft(event.target.value)} placeholder="Talk to Pip…" onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}}/>
   <div className="pip-chat-send"><details className="pip-composer-menu"><summary aria-label="Conversation options" title="Conversation options"><ChevronDown size={18}/></summary><div><p>Your recent conversation stays here. Pip can search for useful information. Nothing is added to your tasks or profile unless you choose to save it.</p><button type="button" disabled={locked} onClick={()=>load(threadId)}><RefreshCw size={15}/>Reload conversation</button><button type="button" disabled={locked} onClick={()=>changeChat()}><Plus size={15}/>New chat</button></div></details><Dictation compact iconOnly showPrivacy={false} disabled={!active||busy||loading} onListening={value=>{setListening(value);onListening(value);}} onText={chunk=>setDraft(previous=>`${previous}${previous?" ":""}${chunk}`.slice(0,3000))}/><button className="btn primary" type="submit" aria-label="Send message" title="Send message" disabled={busy||loading||listening||!draft.trim()}><ArrowRight size={20}/></button></div>
   {error&&<div className="pip-chat-error" role="alert"><p>{error}</p><button type="button" disabled={busy||loading} onClick={()=>load(threadId)}>Reload conversation</button></div>}
  </form>
 </div>
 {full&&canvasOpen&&<button className="pip-canvas-scrim" aria-hidden="true" tabIndex={-1} onClick={closeCanvas}/>}
 {full&&canvasOpen&&<aside id="pip-pinned-canvas" className="pip-canvas" ref={canvasPanel} tabIndex={-1} role={canvasMobile?"dialog":"complementary"} aria-modal={canvasMobile?true:undefined} aria-label="Pinned canvas" onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();closeCanvas();}if(canvasMobile&&event.key==="Tab"){const items=Array.from(canvasPanel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]')||[]);const first=items[0],last=items.at(-1);if(!first){event.preventDefault();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===canvasPanel.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===canvasPanel.current)){event.preventDefault();first.focus();}}}}>
  <header className="pip-canvas-top"><h2>Pinned canvas</h2><button className="icon-btn pip-canvas-close" aria-label="Close canvas" onClick={closeCanvas}><X size={19}/></button></header>
  {pins.length?<div className="pip-canvas-pins" ref={canvasList} tabIndex={-1} aria-live="polite">{pins.map(pin=><article className="pip-canvas-pin" key={pin.id}>
   <header className="pip-canvas-pin-head"><span>{pin.kind==="code"?<><Code size={14}/>Code</>:<><Pin size={14}/>Explanation</>}</span><div className="pip-canvas-pin-actions">{chat.messages.some(message=>message.id===pin.messageId)&&<button type="button" onClick={()=>returnToPin(pin)}><CornerUpLeft size={14}/>Message</button>}<button type="button" aria-label="Remove pin" title="Remove pin" onClick={()=>removePin(pin.id)}><X size={15}/></button></div></header>
   <div className="pip-canvas-pin-body">{pin.kind==="code"?<CodeBlock text={pin.text}/>:<Answer text={pin.text}/>}</div>
  </article>)}</div>:<div className="pip-canvas-empty"><Pin size={22}/><p>Nothing pinned yet. Use the ⋯ menu on a Pip reply, or Pin on one of its code blocks, to keep it here beside the conversation.</p></div>}
  <footer className="pip-canvas-foot" role="status">{canvasNote||`Up to ${MAX_PINS} pins · cleared when you leave or reload Pip.`}</footer>
 </aside>}
</div>;
}
