"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play, RotateCcw, MoveHorizontal } from 'lucide-react';
import type { WorldController } from '@/lib/landing-world-scene';

const chapters = [
  { short: 'The note', title: 'Start with something from class.', text: 'A list of players. One rule: find the ones without a team.', word: 'Learn.' },
  { short: 'The connection', title: 'See what the idea can do.', text: 'A filter keeps what you need. Give that idea a job of its own.', word: 'Connect.' },
  { short: 'The build', title: 'Turn the idea into a tool.', text: 'Now your list is a team finder for the match you’re organising.', word: 'Build.' },
  { short: 'Your next step', title: 'Something you can build on.', text: 'Keep your attempt. Come back to it. Make the next version yours.', word: 'Keep going.' },
];
export default function LandingWorld(){
  const canvas=useRef<HTMLCanvasElement>(null),controller=useRef<WorldController|null>(null);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[chapter,setChapter]=useState(0),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(false),[exploded,setExploded]=useState(false);
  useEffect(()=>{
    let gone=false;const mq=matchMedia('(prefers-reduced-motion: reduce)');
    const isReduced=()=>mq.matches||document.documentElement.dataset.motion==='reduced';
    const change=()=>{const value=isReduced();setReduced(value);controller.current?.reduced(value);};change();mq.addEventListener('change',change);
    const observer=new MutationObserver(change);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
    void import('@/lib/landing-world-scene').then(async module=>{
      await document.fonts.ready;if(gone||!canvas.current)return;
      try {controller.current=module.createLandingWorld(canvas.current,{reduced:isReduced(),onChapter:setChapter,onPlaying:setPlaying,onFailure:()=>{setFailed(true);setReady(false);}});setReady(true);}
      catch {setFailed(true);setReady(false);}
    }).catch(()=>{if(!gone)setFailed(true);});
    return()=>{gone=true;mq.removeEventListener('change',change);observer.disconnect();controller.current?.destroy();controller.current=null;};
  },[]);
  function select(index:number){setExploded(false);setChapter(index);controller.current?.chapter(index);}
  return <div className="world-exhibit" data-ready={ready&&!failed} data-chapter={chapter}>
    <div className="world-exhibit-top"><span><i/> AN IDEA, TAKING SHAPE</span><button className="world-disassemble" type="button" disabled={!ready} aria-pressed={exploded} onClick={()=>{setExploded(!exploded);setChapter(2);controller.current?.explode(!exploded);}}>{exploded?'Put it together ↙':'Pull it apart ↗'}</button></div>
    <div className="world-viewport">
      <div className="world-chapter-word" aria-hidden="true">{chapters[chapter].word}</div>
      <div className="world-static" aria-hidden="true"><div className="world-static-note"><small>YOUR NOTES</small><strong>Filter a list.</strong><span>Riya <b>Falcons</b></span><span className="free-player">Dev <b>No team yet</b></span><span>Sam <b>Tigers</b></span></div><div className="world-static-bridge"/><div className="world-static-result"><small>YOUR BUILD</small><strong>Team finder.</strong><span>Dev needs a team ↗</span></div></div>
      <canvas ref={canvas} aria-hidden="true" className="world-canvas"/>
      <div className="world-view-hint">{ready&&!reduced?<><span className="world-drag-hint"><MoveHorizontal size={13}/> Drag to explore</span><span className="world-touch-hint">Choose a chapter below</span></>:failed?'Explore the example below':'A note. A connection. A build.'}</div>
      <span className="world-model-label">INTERACTIVE MODEL</span>
    </div>
    <div className="world-chapter-copy"><span className="world-counter">0{chapter+1}<span> / 04</span></span><div><h2>{chapters[chapter].title}</h2><p>{chapters[chapter].text}</p></div></div>
    <div className="world-transport"><div className="world-chapters" aria-label="Explore the introduction">{chapters.map((item,index)=><button type="button" key={item.short} aria-pressed={chapter===index} onClick={()=>select(index)}><span>0{index+1}</span>{item.short}</button>)}</div><div className="world-playback"><button type="button" className="world-tool" disabled={!ready||reduced} aria-label={playing?'Pause introduction':'Play introduction'} onClick={()=>{setExploded(false);if(playing)controller.current?.pause();else controller.current?.play();}}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><button type="button" className="world-tool" disabled={!ready} aria-label="Replay introduction" onClick={()=>{select(0);if(!reduced)controller.current?.play();}}><RotateCcw size={16}/></button></div></div>
    <a className="world-try-link" href="#your-course">Try the working example <ArrowRight size={16}/></a>
  </div>;
}
