"use client";
import {useEffect} from 'react';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {deskToolFor} from '@/lib/desktop-tools';
export default function DesktopPanel({children}:{children:ReactNode}){
 const pathname=usePathname();
 useEffect(()=>{
  const send=(type:string,extra:Record<string,unknown>={})=>window.parent.postMessage({channel:'stride-desk',type,...extra},window.location.origin);
  send('ready');
  const links=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const a=(event.target as Element).closest<HTMLAnchorElement>('a[href]');
   if(!a||a.hasAttribute('download')||a.target==='_blank')return;
   const url=new URL(a.href,location.href);if(url.origin!==location.origin||(url.hash&&url.pathname===location.pathname&&url.search===location.search))return;
   const href=url.pathname+url.search;
   if(deskToolFor(href)){event.preventDefault();send('open',{href});}
  };
  const message=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==window.parent||event.data?.channel!=='stride-desk')return;
   if(event.data.type==='pip-launch')window.dispatchEvent(new Event('stride-pip-launch'));
   if(event.data.type==='add-work')window.dispatchEvent(new Event('stride-add-work'));
  };
  let timer:ReturnType<typeof setTimeout>|undefined;
  const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>send('changed'),300);};
  const signout=()=>send('signed-out');
  const appearance=(e:Event)=>{const detail=(e as CustomEvent).detail;send('appearance',{kind:detail?.kind,value:detail?.value});};
  window.addEventListener('stride-desk-appearance',appearance);
  const view=(e:Event)=>{const v=(e as CustomEvent<string>).detail;if(['today','work','memory','direction'].includes(v))send('view',{view:v});};
  window.addEventListener('stride-view-change',view);
  const focused=()=>send('focus');
  const resume=()=>{send('focus');window.dispatchEvent(new Event('stride-workspace-changed'));};
  document.addEventListener('click',links,true);window.addEventListener('message',message);
  window.addEventListener('stride-activity-change',changed);window.addEventListener('stride-workspace-changed',changed);window.addEventListener('stride-signout',signout);
  document.addEventListener('pointerdown',focused,true);window.addEventListener('focus',resume);
  return()=>{clearTimeout(timer);window.removeEventListener('stride-desk-appearance',appearance);window.removeEventListener('stride-view-change',view);document.removeEventListener('click',links,true);window.removeEventListener('message',message);window.removeEventListener('stride-activity-change',changed);window.removeEventListener('stride-workspace-changed',changed);window.removeEventListener('stride-signout',signout);document.removeEventListener('pointerdown',focused,true);window.removeEventListener('focus',resume);};
 },[pathname]);
 return <div className="app-frame embedded-tool" data-route={pathname}><div className="frame-window-content">{children}</div></div>;
}
