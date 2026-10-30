"use client";
import {useEffect,useRef,useState} from 'react';

// A document load is not proof that the app hydrated. Wait for its own ready
// message so a failed asset request never leaves an unexplained blank window.
export default function DesktopToolFrame({title,src,register,onRetry}:{title:string;src:string;register:(node:HTMLIFrameElement|null)=>void;onRetry:()=>void}){
 const frame=useRef<HTMLIFrameElement|null>(null);
 const [attempt,setAttempt]=useState(0),[status,setStatus]=useState<'opening'|'slow'|'ready'>('opening');
 useEffect(()=>{
  const timer=setTimeout(()=>setStatus(s=>s==='ready'?s:'slow'),12000);
  const message=(e:MessageEvent)=>{if(e.origin===location.origin&&e.source===frame.current?.contentWindow&&e.data?.channel==='stride-desk'&&e.data.type==='ready'){clearTimeout(timer);setStatus('ready');}};
  window.addEventListener('message',message);
  return()=>{clearTimeout(timer);window.removeEventListener('message',message);};
 },[attempt]);
 return <><iframe key={attempt} ref={node=>{frame.current=node;register(node);}} title={`${title} app`} src={src} className="desk-tool-frame"/>{status!=='ready'&&<div className="desk-tool-opening" role="status"><span className="desk-opening-mark" aria-hidden="true"/><strong>{status==='slow'?`${title} is taking longer to open.`:`Opening ${title}…`}</strong>{status==='slow'&&<><p>Try loading this window again.</p><button onClick={()=>{onRetry();setStatus('opening');setAttempt(n=>n+1);}}>Reload {title}</button></>}</div>}</>;
}
