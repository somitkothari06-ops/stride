"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {Sun,BookOpen,Hammer,MessageCircle,NotebookPen,Footprints,Compass,Settings2,Settings,UserRound,Minus,Maximize2,Minimize2,Plus} from 'lucide-react';
import {deskTools,deskToolFor,panelHref,openDeskWindow,focusDeskWindow,tileDeskWindows} from '@/lib/desktop-tools';
import type {DeskWindow} from '@/lib/desktop-tools';
import type {NavigationActivity} from '@/lib/navigation-activity';
import SignOut from './sign-out';
import DesktopHome from './desktop-home';
import DesktopToolFrame from './desktop-tool-frame';
import {useAppearance} from './appearance-provider';
import {AppearanceSchema} from '@/lib/themes';
const icons=[Sun,BookOpen,Hammer,MessageCircle,NotebookPen,Footprints,Compass];
export default function DesktopHost({initialHref}:{initialHref:string}){
 const appearance=useAppearance(),appearanceRef=useRef(appearance);appearanceRef.current=appearance;
 const stage=useRef<HTMLDivElement>(null),frames=useRef(new Map<string,HTMLIFrameElement>());
 const [windows,setWindows]=useState<DeskWindow[]>([]),[active,setActive]=useState(''),[dragging,setDragging]=useState(false);
 const [identity,setIdentity]=useState<{name?:string;demo?:boolean;activity?:NavigationActivity}>({});
 const [error,setError]=useState(''),[leaving,setLeaving]=useState(false),[layoutOpen,setLayoutOpen]=useState(false);
 const layoutMenu=useRef<HTMLDivElement>(null),layoutToggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!layoutOpen)return;const close=(e:PointerEvent)=>{if(!layoutMenu.current?.contains(e.target as Node))setLayoutOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setLayoutOpen(false);layoutToggle.current?.focus();}};document.addEventListener('pointerdown',close);window.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('keydown',escape);};},[layoutOpen]);
 const refreshEpoch=useRef(0),refreshAbort=useRef<AbortController|null>(null),ready=useRef(new Set<string>()),queued=useRef(new Map<string,string>());
 const gesture=useRef<{id:string;mode:'move'|'resize';startX:number;startY:number;rect:DeskWindow}|null>(null);
 const windowsRef=useRef(windows);windowsRef.current=windows;
 const bounds=useCallback(()=>({width:stage.current?.clientWidth||1000,height:stage.current?.clientHeight||600}),[]);
 const post=useCallback((id:string,type:string)=>{const frame=frames.current.get(id);if(ready.current.has(id)&&frame?.contentWindow)frame.contentWindow.postMessage({channel:'stride-desk',type},location.origin);else queued.current.set(id,type);},[]);
 const focus=useCallback((id:string)=>{setActive(id);setWindows(ws=>focusDeskWindow(ws,id));},[]);
 const open=useCallback((href:string)=>{
  const tool=deskToolFor(href);if(!tool)return;
  setActive(tool.id);setWindows(ws=>openDeskWindow(ws,tool,bounds()));
  if(tool.id==='pip'&&ready.current.has('pip'))post('pip','pip-launch');
  if(new URL(href,location.origin).searchParams.get('open')==='add'&&windowsRef.current.some(w=>w.id===tool.id))post(tool.id,'add-work');
  requestAnimationFrame(()=>document.querySelector<HTMLElement>(`[data-window-id="${CSS.escape(tool.id)}"] .desk-window-bar`)?.focus({preventScroll:true}));
 },[bounds,post]);
 const refresh=useCallback(()=>{
  const epoch=++refreshEpoch.current;refreshAbort.current?.abort();const source=new AbortController();refreshAbort.current=source;
  fetch('/api/navigation',{cache:'no-store',signal:source.signal}).then(async r=>{
   const data=r.ok?await r.json():null;if(epoch!==refreshEpoch.current)return;
   if(r.ok)setIdentity(data);else if(r.status===401||r.status===403){setWindows([]);setIdentity({});location.replace('/login?signed_out=1');}
  }).catch(()=>{});
 },[]);
 useEffect(()=>{open(initialHref);},[initialHref,open]);
 useEffect(()=>{
  refresh();const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},30000);
  const messages=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.data?.channel!=='stride-desk')return;
   const owned=Array.from(frames.current.entries()).find(([,frame])=>frame.contentWindow===event.source);if(!owned)return;
   if(event.data.type==='appearance'&&owned[0]==='settings'&&['preview','commit','restore'].includes(event.data.kind)){const parsed=AppearanceSchema.safeParse(event.data.value);if(parsed.success){if(event.data.kind==='preview')appearanceRef.current.preview(parsed.data);else appearanceRef.current.commit(parsed.data);}}
   if(event.data.type==='ready'){ready.current.add(owned[0]);const command=queued.current.get(owned[0]);if(command){queued.current.delete(owned[0]);post(owned[0],command);}}
   if(event.data.type==='open'&&typeof event.data.href==='string')open(event.data.href);
   if(event.data.type==='view'){const t=deskToolFor('/workspace?view='+event.data.view);if(t)setWindows(ws=>ws.map(w=>w.id===owned[0]?{...w,title:t.title}:w));}
   if(event.data.type==='focus')focus(owned[0]);
   if(event.data.type==='changed')refresh();
   if(event.data.type==='signed-out'){setWindows([]);location.replace('/login?signed_out=1');}
  };
  const signout=()=>{setWindows([]);location.replace('/login?signed_out=1');};
  window.addEventListener('message',messages);window.addEventListener('stride-signout',signout);
  const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('stride-account'):null;
  if(channel)channel.onmessage=e=>{if(e.data==='signed-out')signout();};
  return()=>{refreshEpoch.current++;refreshAbort.current?.abort();clearInterval(timer);window.removeEventListener('message',messages);window.removeEventListener('stride-signout',signout);channel?.close();};
 },[open,focus,refresh,post]);
 useEffect(()=>{
  const resize=()=>{const b=bounds();setWindows(ws=>ws.map(w=>({...w,width:Math.min(w.width,b.width),height:Math.min(w.height,b.height),x:Math.max(0,Math.min(w.x,b.width-w.width)),y:Math.max(0,Math.min(w.y,b.height-w.height))})));};
  const observer=new ResizeObserver(resize);if(stage.current)observer.observe(stage.current);return()=>observer.disconnect();
 },[bounds]);
 function update(id:string,patch:Partial<DeskWindow>){setWindows(ws=>ws.map(w=>w.id===id?{...w,...patch}:w));}
 function begin(e:ReactPointerEvent<HTMLElement>,w:DeskWindow,mode:'move'|'resize'){
  if(e.button!==0||w.maximised||(e.target as HTMLElement).closest('button'))return;
  e.preventDefault();e.currentTarget.focus({preventScroll:true});window.getSelection()?.removeAllRanges();focus(w.id);
  gesture.current={id:w.id,mode,startX:e.clientX,startY:e.clientY,rect:{...w}};setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);
 }
 function move(e:ReactPointerEvent<HTMLElement>){
  const g=gesture.current;if(!g)return;const b=bounds(),dx=e.clientX-g.startX,dy=e.clientY-g.startY,w=g.rect;
  if(g.mode==='move')update(g.id,{x:Math.max(0,Math.min(b.width-w.width,w.x+dx)),y:Math.max(0,Math.min(b.height-w.height,w.y+dy))});
  else update(g.id,{width:Math.min(b.width-w.x,Math.max(Math.min(440,b.width),w.width+dx)),height:Math.min(b.height-w.y,Math.max(Math.min(320,b.height),w.height+dy))});
 }
 function end(){gesture.current=null;setDragging(false);}
 function arrange(limit:2|4=2){setWindows(ws=>tileDeskWindows(ws,bounds(),limit));}
 async function leaveDemo(){if(leaving)return;setLeaving(true);try{const r=await fetch('/api/demo',{method:'DELETE'});if(!r.ok)throw Error();location.assign('/');}catch{setError('Couldn’t leave the demo. Please try again.');setLeaving(false);}}
 const dockTools=[...deskTools,...windows.filter(w=>!deskTools.some(t=>t.id===w.id))];
 const foreground=windows.filter(w=>!w.minimised).sort((a,b)=>b.z-a.z)[0]?.id;
 return <div className={`real-desktop${dragging?' is-dragging':''}`}>
  <header className="desk-menu"><a href="/" className="desk-brand">stride.</a><span className="desk-caption">{identity.demo?'Demo · sample student work':identity.name?`${identity.name}’s desk`:'Your desk'}</span><div className="desk-menu-actions"><div className="desk-layout-picker" ref={layoutMenu}><button ref={layoutToggle} className="desk-layout-toggle" aria-label="Arrange windows" title="Arrange windows" aria-expanded={layoutOpen} aria-controls="desk-layout-options" onClick={()=>setLayoutOpen(!layoutOpen)}><span className="desk-layout-glyph" aria-hidden="true"><i/><i/></span></button>{layoutOpen&&<div id="desk-layout-options" className="desk-layout-options"><strong>Make some room.</strong><div className="desk-layout-choices"><button onClick={()=>{arrange(2);setLayoutOpen(false);}}><span className="layout-drawing beside" aria-hidden="true"><i/><i/></span><b>Beside each other</b><small>Keep two tools in view</small></button><button onClick={()=>{arrange(4);setLayoutOpen(false);}}><span className="layout-drawing four" aria-hidden="true"><i/><i/><i/><i/></span><b>Four corners</b><small>Up to four tools at once</small></button><button onClick={()=>{const b=bounds();setWindows(ws=>ws.map((w,i)=>({...w,x:Math.min(24+i*32,Math.max(0,b.width-w.width)),y:Math.min(i*16,Math.max(0,b.height-w.height)),maximised:false})));setLayoutOpen(false);}}><span className="layout-drawing overlap" aria-hidden="true"><i/><i/></span><b>Overlap</b><small>A little space to move</small></button><button onClick={()=>{setWindows(ws=>ws.map(w=>({...w,minimised:true})));setLayoutOpen(false);}}><span className="layout-drawing clear" aria-hidden="true"><i/></span><b>Show my desk</b><small>Minimise, keep everything</small></button></div></div>}</div><button className="desk-settings-key" aria-label="Settings" title="Settings" onClick={()=>open('/settings')}><Settings size={20}/></button><button className="desk-profile" onClick={()=>open('/about-you')}><UserRound size={17}/>{identity.name||'My profile'}</button>{identity.demo?<button onClick={leaveDemo} disabled={leaving}>{leaving?'Leaving demo…':'Leave demo'}</button>:<SignOut/>}</div></header>
  {error&&<div role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
  <main ref={stage} className="desk-stage" aria-label="Your desktop">
   <DesktopHome name={identity.name} activity={identity.activity} windows={windows} open={open}/>
   {windows.map(w=><section key={w.id} className={`desk-app-window tone-${w.tone}${foreground===w.id?' focused':''}`} hidden={w.minimised} data-window-id={w.id} aria-label={`${w.title} window`} style={{left:w.maximised?0:w.x,top:w.maximised?0:w.y,width:w.maximised?'100%':w.width,height:w.maximised?'100%':w.height,zIndex:w.z}} onPointerDown={()=>{if(active!==w.id)focus(w.id);}}>
    <div className="desk-window-bar" tabIndex={0} aria-label={`Move ${w.title} window with arrow keys`} onDoubleClick={e=>{if(!(e.target as HTMLElement).closest('button'))update(w.id,{maximised:!w.maximised});}} onPointerDown={e=>begin(e,w,'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={e=>{if(e.target!==e.currentTarget||w.maximised||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const b=bounds();update(w.id,{x:Math.max(0,Math.min(b.width-w.width,w.x+(e.key==='ArrowRight'?16:e.key==='ArrowLeft'?-16:0))),y:Math.max(0,Math.min(b.height-w.height,w.y+(e.key==='ArrowDown'?16:e.key==='ArrowUp'?-16:0)))});}}>
     <span className="desk-window-name"><i/>{w.title}</span><div className="desk-window-actions">{['today','work'].includes(w.id)&&<button className="desk-add-work" onClick={()=>post(w.id,'add-work')}><Plus size={14}/>Add work</button>}<button aria-label={`Expand ${w.title} window`} title={w.maximised?'Restore size':'Expand'} onClick={()=>update(w.id,{maximised:!w.maximised})}>{w.maximised?<Minimize2 size={15}/>:<Maximize2 size={15}/>}</button><button aria-label={`Minimise ${w.title} window`} onClick={()=>{update(w.id,{minimised:true});requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-tool-id="${CSS.escape(w.id)}"]`)?.focus());}}><Minus size={17}/></button></div>
    </div>
    <DesktopToolFrame title={w.title} src={panelHref(w.href)} register={node=>{if(node)frames.current.set(w.id,node);else frames.current.delete(w.id);}} onRetry={()=>ready.current.delete(w.id)}/>
    {!w.maximised&&<div className="desk-resize" role="separator" aria-label={`Resize ${w.title} window`} title="Drag this corner to resize · arrow keys also work" tabIndex={0} onPointerDown={e=>begin(e,w,'resize')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const b=bounds();update(w.id,{width:Math.min(b.width-w.x,Math.max(440,w.width+(e.key==='ArrowRight'?32:e.key==='ArrowLeft'?-32:0))),height:Math.min(b.height-w.y,Math.max(320,w.height+(e.key==='ArrowDown'?32:e.key==='ArrowUp'?-32:0)))});}}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 13 13 3M8 13l5-5M12 13l1-1" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg></div>}
   </section>)}
  </main>
  <nav className="desk-dock" aria-label="Desktop apps">{dockTools.map((tool,i)=>{const Icon=icons[i]||(tool.id==='settings'?Settings2:tool.id==='about-you'?UserRound:BookOpen),w=windows.find(w=>w.id===tool.id),count=tool.id==='work'?identity.activity?.coursework:tool.id==='build'?identity.activity?.build:0;return <button key={tool.id} data-tool-id={tool.id} className={foreground===tool.id?'active':''} aria-label={`Open ${tool.title}${w?.minimised?', minimised':w?', running':''}`} onClick={()=>open(tool.href)}><span className={`desk-dock-icon tone-${tool.tone}`}><Icon size={22}/>{!!count&&<b title={tool.id==='work'?'Open tasks':'Active builds'}>{count>99?'99+':count}</b>}</span><span>{tool.title}</span><i className={w?'running':''} aria-hidden="true"/></button>;})}</nav>
 </div>;
}
