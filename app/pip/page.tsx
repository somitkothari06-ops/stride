"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,BookOpen,Compass,LayoutDashboard,Leaf,MessageCircle,UserRound} from "lucide-react";
import PipConversation from "@/components/pip-conversation";
import {PipMark} from "@/components/companion";
import {readPipLaunch,type PipLaunch} from "@/lib/pip-navigation";
export default function PipRoom() {
 const [prompt,setPrompt]=useState<PipLaunch>(),[busy,setBusy]=useState(false),[listening,setListening]=useState(false);
 useEffect(()=>setPrompt(readPipLaunch()),[]);
 return <div className="pip-room"><a className="skip-link" href="#pip-chat-message">Skip to chat</a>
  <aside className="pip-room-sidebar"><a className="site-brand" href="/workspace">stride.</a><nav aria-label="Workspace navigation"><a className="is-current" href="/pip" aria-current="page"><MessageCircle size={20}/>Pip</a><a href="/workspace"><LayoutDashboard size={20}/>Today</a><a href="/workspace?view=work"><BookOpen size={20}/>My work</a><a href="/workspace?view=memory"><Leaf size={20}/>Memory</a><a href="/workspace?view=direction"><Compass size={20}/>Direction</a></nav><a className="pip-room-profile" href="/about-you"><UserRound size={20}/>My profile</a></aside>
  <main className="pip-room-main"><header><div><PipMark listening={listening}/><h1>Pip</h1></div><a href="/workspace"><ArrowLeft size={17}/>Back to workspace</a></header>
   <PipConversation prompt={prompt} active onBusy={setBusy} onListening={setListening} onKeep={text=>window.dispatchEvent(new CustomEvent("stride-companion-open",{detail:{captureText:text}}))}/>
   <span className="sr-only" role="status">{busy?"Pip is replying":""}</span>
  </main>
 </div>;
}
