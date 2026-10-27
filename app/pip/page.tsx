"use client";
import SignOut from "@/components/sign-out";
import {useEffect,useState} from "react";
import {ArrowLeft,BookOpen,Compass,LayoutDashboard,Leaf,MessageCircle,UserRound} from "lucide-react";
import PipConversation from "@/components/pip-conversation";
import {PipMark} from "@/components/companion";
import {readPipLaunch,type PipLaunch} from "@/lib/pip-navigation";
export default function PipRoom() {
 const [prompt,setPrompt]=useState<PipLaunch>(),[busy,setBusy]=useState(false),[listening,setListening]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{setPrompt(readPipLaunch());setReady(true);},[]);
 return <div className="pip-room"><a className="skip-link" href="#pip-chat-message">Skip to chat</a>
  <main className="pip-room-main"><header><a className="site-brand pip-room-wordmark" href="/workspace">stride.</a><div><PipMark listening={listening}/><h1>Pip</h1></div><nav className="pip-account-actions"><a className="settings-shortcut" href="/settings">Settings</a><SignOut/><a href="/workspace"><ArrowLeft size={17}/>Back to workspace</a></nav></header>
   <PipConversation full prompt={prompt} active={ready} onBusy={setBusy} onListening={setListening} onKeep={text=>window.dispatchEvent(new CustomEvent("stride-companion-open",{detail:{captureText:text}}))}/>
   <span className="sr-only" role="status">{busy?"Updating chat":""}</span>
  </main>
 </div>;
}
