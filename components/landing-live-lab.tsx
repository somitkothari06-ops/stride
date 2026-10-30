"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Code2,RotateCcw} from 'lucide-react';
import {landingFeedbackOutput} from "@/lib/landing-lab";
import {browserPreview} from '@/lib/browser-preview';
import {landingStarter as starter,landingPlayerRows} from "@/lib/landing-example";
export default function LandingLiveLab(){
 const [code,setCode]=useState(starter),[lines,setLines]=useState<string[]>([]),[preview,setPreview]=useState(''),[running,setRunning]=useState(false),[ran,setRan]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[feedback,setFeedback]=useState<{explanation:string;tryNext:string}|null>(null),[question,setQuestion]=useState('');
 const scene=useRef<HTMLDivElement>(null);
 const frame=useRef<HTMLIFrameElement>(null),channel=useRef(''),timer=useRef<ReturnType<typeof setTimeout>|null>(null),runCode=useRef(''),controller=useRef<AbortController|null>(null),epoch=useRef(0);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow||event.data?.channel!==channel.current||typeof event.data?.line!=='string')return;setLines(old=>[...old.slice(-29),event.data.line.slice(0,2000)]);if(event.data.done){setRunning(false);setRan(runCode.current);if(timer.current)clearTimeout(timer.current);}};window.addEventListener('message',receive);return()=>{window.removeEventListener('message',receive);controller.current?.abort();if(timer.current)clearTimeout(timer.current);};},[]);
 function invalidate(){epoch.current++;controller.current?.abort();setBusy(false);setFeedback(null);setError('');setRan('');}
 function run(){invalidate();if(timer.current)clearTimeout(timer.current);setLines([]);setRunning(true);runCode.current=code;channel.current=crypto.randomUUID();setPreview(browserPreview(code,'JavaScript',channel.current));timer.current=setTimeout(()=>{setRunning(false);setLines(old=>[...old,'This browser could not finish the run. Try again.']);},3500);}
 function reset(){invalidate();channel.current='';setPreview('');setLines([]);setCode(starter);setQuestion('');setRunning(false);if(timer.current)clearTimeout(timer.current);}
 async function explain(){
  if(!ran||ran!==code||running||busy)return;
  const version=++epoch.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;setBusy(true);setError('');
  try{
   const response=await fetch('/api/landing-lab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,...landingFeedbackOutput(lines),question:question.trim()||'Explain my result and give me one change to try.'}),signal:abort.signal});
   const result=await response.json().catch(()=>null);if(version!==epoch.current)return;
   if(!response.ok||!result?.feedback){setError(response.status===429?'This live demo has reached its AI limit. You can still edit and run the code.':'Nemotron couldn’t answer just now. Your code still runs—try again shortly.');return;}
   setFeedback(result.feedback);
  }catch{if(version===epoch.current&&!abort.signal.aborted)setError('Couldn’t reach Nemotron. Your code still works—try again shortly.');}
  finally{if(version===epoch.current)setBusy(false);}
 }

 const rows=landingPlayerRows(lines);
 useEffect(()=>{
  if(!ran||ran!==code||!scene.current||document.documentElement.dataset.motion==='reduced'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ghosts:HTMLElement[]=[];const animations:Animation[]=[];
  const tick=requestAnimationFrame(()=>{
   const root=scene.current;if(!root)return;
   const targets=Array.from(root.querySelectorAll<HTMLElement>('[data-result-player]'));
   for(const target of targets){
    const source=Array.from(root.querySelectorAll<HTMLElement>('[data-source-player]')).find(node=>node.dataset.sourcePlayer===target.dataset.resultPlayer);
    const from=source?.querySelector<HTMLElement>('.lab-roster-avatar'),to=target.querySelector<HTMLElement>('.live-player-avatar');
    if(!from||!to||typeof from.animate!=='function')continue;
    const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
    if(a.bottom<0||a.top>innerHeight||b.top>innerHeight||b.bottom<0)continue;
    const ghost=document.createElement('span');ghost.className='lab-travelling-player';ghost.textContent=from.textContent;ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:`${a.left}px`,top:`${a.top}px`,width:`${a.width}px`,height:`${a.height}px`});document.body.appendChild(ghost);ghosts.push(ghost);
    const animation=ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${b.left-a.left}px,${b.top-a.top}px) scale(.9)`,opacity:0}],{duration:460,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
    animations.push(animation);animation.onfinish=()=>ghost.remove();
   }
  });
  return()=>{cancelAnimationFrame(tick);animations.forEach(animation=>animation.cancel());ghosts.forEach(ghost=>ghost.remove());};
 },[ran,code]);
 return <div className="live-lab-scene" ref={scene}>


  <div className="live-lab-window">
   <header className="live-lab-top"><div><strong>Try it live</strong><span>A Stride project, in miniature</span></div></header>
   <div className="live-lab-brief"><h2>Make a team finder.</h2><p>You’re organising a football match. Find the players who haven’t joined a team.</p></div>
   <div className="lab-roster" aria-label="Example players"><div className="lab-roster-head"><span>Player</span><span>Team</span></div>{[{name:'Riya',team:'Falcons'},{name:'Dev',team:null},{name:'Sam',team:'Tigers'}].map(player=><div key={player.name} data-source-player={player.name} data-match={rows===null?undefined:rows.some(row=>row.name===player.name)}><span className="lab-roster-avatar">{player.name.slice(0,1)}</span><strong>{player.name}</strong><small>{player.team||'No team yet'}</small></div>)}</div>
   <div className="lab-rule"><span>Who do you want to find?</span><div role="group" aria-label="Choose which players to find">{[{label:'Needs a team',source:starter},{label:'Already on a team',source:starter.replace('!p.team','!!p.team')}].map(choice=><button type="button" key={choice.label} disabled={running} aria-pressed={code===choice.source} onClick={()=>{invalidate();setLines([]);setPreview('');channel.current='';setCode(choice.source);}}>{choice.label}</button>)}</div></div>
   <details className="lab-code-details"><summary><Code2 size={15}/>See and edit the code</summary>
   <div className="live-lab-file"><span><Code2 size={14}/> players.js</span><button type="button" onClick={reset} disabled={running} aria-label="Reset the example"><RotateCcw size={14}/> Reset</button></div>
   <div className="live-lab-editor"><div aria-hidden="true">{code.split('\n').map((_,i)=><span key={i}>{i+1}</span>)}</div><label className="sr-only" htmlFor="landing-code">Edit the example JavaScript</label><textarea id="landing-code" spellCheck={false} value={code} maxLength={6000} disabled={running} onChange={e=>{invalidate();setLines([]);setPreview('');channel.current='';setCode(e.target.value);}}/></div>
   </details>
   <div className="live-lab-run"><button type="button" disabled={running||!code.trim()} onClick={run}>{running?'Finding…':'Find players'}<ArrowRight size={17}/></button></div>
   <section className={`live-lab-output ${lines.length?'has-output':''}`} aria-label="Code output" aria-live="polite"><div><span>{rows!==null?"Players found":"Result"}</span>{ran===code&&!!ran&&<span>{rows!==null?`${rows.length} ${rows.length===1?"match":"matches"}`:"Run finished"}</span>}</div>{lines.length?<>{rows!==null&&<div className="live-player-results">{rows.length?rows.map((row,index)=><div key={index} data-result-player={row.name}><span className="live-player-avatar">{row.name.slice(0,1)}</span><strong>{row.name}</strong><span>{row.team===null?'Needs a team':row.team}</span></div>):<p>No players matched your filter.</p>}</div>}<details open={rows===null}><summary>View raw output</summary><pre>{lines.filter(line=>line!=='Finished.').join('\n')||'No output. Try console.log().'}</pre></details></>:<p>Choose a group, then press Find players.</p>}</section>
   {!!ran&&ran===code&&<div className="live-lab-ai"><div className="live-lab-ask"><label className="sr-only" htmlFor="landing-question">Ask about this code</label><input id="landing-question" maxLength={600} value={question} onChange={e=>{epoch.current++;controller.current?.abort();setBusy(false);setFeedback(null);setError('');setQuestion(e.target.value);}} placeholder="Ask why this works, or what to try next…"/><button type="button" onClick={()=>void explain()} disabled={busy||running}>{busy?'Thinking…':'Explain result'}<ArrowRight size={15}/></button></div><small>Nemotron uses this code and result to explain it.</small>{error&&<p role="alert">{error}</p>}{feedback&&<div className="live-lab-feedback"><p>{feedback.explanation}</p><strong>Try this</strong><p>{feedback.tryNext}</p><a href="/demo">Explore the full workspace <ArrowRight size={14}/></a></div>}</div>}
   {preview&&<iframe ref={frame} title="Isolated example runner" sandbox="allow-scripts" srcDoc={preview} hidden/>}
  </div>
  <div className="live-lab-caption"><span>One concept from class. Something you can use.</span><span>No sign-up. Give it a go. <ArrowRight size={15}/></span></div>
 </div>;
}
