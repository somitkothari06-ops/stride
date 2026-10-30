"use client";
import { useEffect, useRef, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Code2, MessageCircle, MoveUpRight } from 'lucide-react';
import SiteHeader from '@/components/site-account-nav';
import LandingWorld from '@/components/landing-world';
import LandingLiveLab from '@/components/landing-live-lab';
import { themes } from '@/lib/themes';
import '../app/cinematic-lab.css';
import '../app/cinematic-landing.css';

export default function CinematicLanding(){
 const page=useRef<HTMLDivElement>(null);
 useEffect(()=>{
   if(!('IntersectionObserver' in window))return;
   const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('cl-arrived');observer.unobserve(entry.target);}}),{threshold:.12});
   page.current?.querySelectorAll('[data-arrive]').forEach(node=>observer.observe(node));return()=>observer.disconnect();
 },[]);
 return <div className="cl-root" ref={page}>
  <SiteHeader/>
  <main>
   <section className="cl-hero" aria-labelledby="cl-title">
    <div className="cl-hero-copy">
     <p className="cl-eyebrow"><span/> YOUR COLLEGE WORK. YOUR OWN WAY FORWARD.</p>
     <h1 id="cl-title">Learn it.<br/>{" "}<em>Make it</em><br/>{" "}<span className="cl-title-end">yours<span className="cl-stop">.</span></span></h1>
     <p className="cl-lead">Your notes are a starting point.<br/>{" "}Stride helps you understand them, try something real and keep going.</p>
     <div className="cl-actions"><a className="cl-key" href="/demo">Step inside <ArrowRight size={20}/></a><a className="cl-secondary" href="/about-you">Start your space <MoveUpRight size={16}/></a></div>
     <p className="cl-provider"><span className="cl-provider-mark" aria-hidden="true">N</span><span>Powered by <strong>NVIDIA Nemotron</strong><br/>{" "}on Nebius Token Factory</span></p>
    </div>
    <LandingWorld/>
    <a className="cl-scroll" href="#your-course"><ArrowDown size={14}/> A little less watching. A little more doing.</a>
   </section>
   <section className="cl-live" id="your-course" aria-labelledby="cl-live-title" data-arrive>
    <div className="cl-section-copy"><p className="cl-eyebrow">01 / GIVE THE IDEA A JOB</p><h2 id="cl-live-title">Don’t just<br/>{" "}get the answer.<br/>{" "}<em>Make it work.</em></h2><p>A football match. Three players. One of them still needs a team.</p><p>Try the filter. Change the code if you like. Then ask Nemotron to explain your actual result.</p><div className="cl-loop"><span>TRY</span><i/><span>UNDERSTAND</span><i/><span>BUILD ON IT</span></div><a className="cl-secondary" href="/build">Bring your own project <ArrowRight size={16}/></a></div>
    <LandingLiveLab/>
   </section>
   <section className="cl-path" id="how-it-works" aria-labelledby="cl-path-title" data-arrive>
    <div className="cl-path-heading"><p className="cl-eyebrow">02 / YOUR SPACE, CONNECTED</p><h2 id="cl-path-title">One thing leads<br/>{" "}to <em>your next thing.</em></h2></div>
    <div className="cl-path-links"><a href="/workspace?open=course"><span className="cl-path-number">01</span><BookOpen size={24}/><div><h3>Bring your class.</h3><p>Your notes, slides and past questions. Learn from what you’re actually being taught.</p></div><MoveUpRight size={20}/></a><a href="/build"><span className="cl-path-number">02</span><Code2 size={24}/><div><h3>Make something yours.</h3><p>Pick a project. Try the next piece. Keep the code, the attempt and what you learned.</p></div><MoveUpRight size={20}/></a><a href="/pip"><span className="cl-path-number">03</span><MessageCircle size={24}/><div><h3>Talk it through.</h3><p>A stuck question or an unfinished idea. Pip helps you find a way into it.</p></div><MoveUpRight size={20}/></a></div>
   </section>
   <section className="cl-personal" aria-labelledby="cl-personal-title" data-arrive>
    <div><p className="cl-eyebrow">03 / MAKE YOURSELF AT HOME</p><h2 id="cl-personal-title">A space you<br/>{" "}<em>want to return to.</em></h2><p>Change the colours. Set your pace.<br/>{" "}Come back to the work you left in progress.</p><a className="cl-key cl-key-outline" href="/settings">Find your look <ArrowRight size={18}/></a></div>
    <div className="cl-theme-sculpture" aria-label="Explore Stride themes">{[themes.forest,themes.midnight,themes.lilac].map((theme,i)=><a key={theme.name} className="cl-theme-sheet" href="/settings" style={{'--sheet-bg':theme.bg,'--sheet-ink':theme.ink,'--sheet-focus':theme.hero,'--sheet-focus-ink':theme.heroInk,'--sheet-cta':theme.cta,'--sheet-cta-ink':theme.ctaInk,'--sheet-index':i} as CSSProperties}><b>stride.</b><span className="cl-sheet-title">A little focus.<br/>{" "}A real next step.</span><span className="cl-sheet-task">Your next build <ArrowRight size={15}/></span><span className="cl-sheet-bottom">{theme.name}<MoveUpRight size={16}/></span></a>)}</div>
   </section>
   <section className="cl-end" data-arrive><p className="cl-eyebrow">YOU DON’T NEED A PERFECT PLAN.</p><h2>You need<br/>{" "}<em>a place to start.</em><span>↗</span></h2><div><a className="cl-key" href="/demo">Try Stride <ArrowRight size={20}/></a><a className="cl-secondary" href="/about-you">Make it yours <ArrowRight size={16}/></a></div></section>
  </main>
  <footer className="cl-footer"><a href="/" className="cl-wordmark">stride.</a><span>Learn. Try. Keep going.</span><nav aria-label="Footer"><a href="/login">Sign in</a><a href="/settings">Settings</a><a href="https://github.com/somitkothari06-ops/stride" target="_blank" rel="noopener noreferrer">Made in the open ↗</a></nav><details><summary>About your data &amp; AI</summary><p>Your story is optional. Content used for AI help is processed through Nebius. Check important explanations against your sources. Saved attempts aren’t proof of mastery.</p></details></footer>
 </div>;
}
