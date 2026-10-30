"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight, MoveUpRight } from "lucide-react";
import SiteHeader from "@/components/site-account-nav";
import LandingDesk from "@/components/landing-desk";
import LandingLiveLab from "@/components/landing-live-lab";
import { themes } from "@/lib/themes";
import "../app/nordic-landing.css";
import "../app/cinematic-lab.css";

const studioSteps = [
  {
    n: "01",
    t: "Notice",
    d: "Bring the note or question that is actually stuck.",
  },
  {
    n: "02",
    t: "Attempt",
    d: "One small try — a trace, a query, a paragraph.",
  },
  {
    n: "03",
    t: "Keep",
    d: "What you wrote and what to try next, saved for later.",
  },
];

export default function NordicLanding() {
  const wrapRef = useRef<HTMLDivElement>(null);
  /* Entrance accents are progressive: the content is never hidden while waiting. */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const targets = Array.from(wrap.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((node) => node.classList.add("nl-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("nl-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const fanThemes = [themes.forest, themes.midnight, themes.lilac];
  const centre = (fanThemes.length - 1) / 2;

  return (
    <div className="nl-wrap" ref={wrapRef}>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="nl-hero nl-hero-live" data-reveal>


          <div className="nl-hero-copy">
            <p className="nl-overline" data-stagger>
              <span className="nl-dot" aria-hidden="true" />
              A space for engineering students
            </p>
            <h1 data-stagger>
              Learn it.
              <br />
              <span className="nl-rise">Make it real.</span>
            </h1>
            <p className="nl-lede" data-stagger>
              Turn what you’re learning into something of your own. Try the team finder—then see how one idea from class makes it work.
            </p>
            <div className="live-lab-source"><span>From your class</span><strong>Filter a list</strong><p>Keep only the items you need.</p><span className="lab-source-foot">Sample note → working idea</span></div>
            <div className="nl-hero-actions" data-stagger>
              <a className="nl-btn nl-btn-primary" href="/demo">
                Try Stride
                <ArrowRight size={18} />
              </a>
              <a className="nl-btn nl-btn-ghost" href="/about-you">
                Make it yours
              </a>
            </div>
            <p className="nl-attribution" data-stagger>
              <strong>NVIDIA Nemotron</strong> on Nebius Token Factory.
            </p>
          </div>

          <LandingLiveLab />
        </section>

        {/* Interactive desk, reframed */}
        <section className="nl-studio" id="how-it-works" data-reveal aria-labelledby="nl-studio-title">
          <div className="nl-studio-head">
            <div>
              <p className="nl-overline">
                <span className="nl-dot" aria-hidden="true" />
                See it work on a real example
              </p>
              <h2 id="nl-studio-title">One desk, three ways in.</h2>
            </div>
            <ol className="nl-steps">
              {studioSteps.map((step) => (
                <li key={step.n}>
                  <b>{step.n}</b>
                  <strong>{step.t}</strong>
                  <span>{step.d}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="nl-desk-frame" id="your-course">
            <LandingDesk />
          </div>
        </section>

        {/* Theme fan */}
        <section className="nl-themes" data-reveal aria-labelledby="nl-themes-title">
          <div className="nl-themes-copy">
            <p className="nl-overline">
              <span className="nl-dot" aria-hidden="true" />
              {Object.keys(themes).length} themes. Make it yours.
            </p>
            <h2 id="nl-themes-title">Make yourself at home.</h2>
            <p className="nl-lede">
              Late-night build or a slow Sunday. Find a look that feels like you.
            </p>
            <a className="nl-btn nl-btn-ghost" href="/settings">
              Find your look
              <ArrowRight size={16} />
            </a>
          </div>
          <div className="nl-fan" role="group" aria-label="A few of Stride’s themes — each opens settings">
            {fanThemes.map((palette, index) => (
              <a
                key={palette.name}
                href="/settings"
                className="nl-fan-card"
                data-name={palette.name}
                style={
                  {
                    background: palette.bg,
                    color: palette.ink,
                    "--nl-z": index + 1,
                    "--nl-rot": `${((index - centre) * 8).toFixed(1)}deg`,
                  } as CSSProperties
                }
                aria-label={`Choose your look: ${palette.name}, opens settings`}
              >
                <span className="nl-fan-nav" aria-hidden="true">
                  <b>stride.</b>
                  <i>● ●</i>
                </span>
                <span className="nl-fan-title">A little focus.<br/>A real next step.</span>
                <span className="nl-fan-task" style={{background:palette.hero,color:palette.heroInk}}>Your next build <ArrowRight size={15}/></span>
                <span className="nl-fan-detail"><i style={{background:palette.cta}}/><span>One idea, made real.</span></span>
                <span className="nl-fan-name">{palette.name}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Close */}
        <section className="nl-close" data-reveal aria-labelledby="nl-close-title">
          <p className="nl-overline">
            <span className="nl-dot" aria-hidden="true" />
            No perfect plan required
          </p>
          <h2 id="nl-close-title">
            One small start.
            <br />
            Something to build on.
          </h2>
          <div className="nl-close-actions">
            <a className="nl-btn nl-btn-primary" href="/workspace">
              Open my workspace
              <ArrowRight size={18} />
            </a>
            <a className="nl-text-link" href="/pip">
              Not sure where to start? Talk it through with Pip
              <ArrowRight size={15} />
            </a>
          </div>
          <p className="nl-attribution">
            <strong>NVIDIA Nemotron</strong> on Nebius Token Factory.
          </p>
        </section>
      </main>

      <footer className="nl-footer">
        <a className="nl-footer-brand" href="/">
          stride<span>.</span>
        </a>
        <p>Small steps. A clearer direction.</p>
        <nav aria-label="Footer">
          <a href="/login">Sign in</a>
          <a href="/settings">Settings</a>
          <a href="/pip">Pip</a>
          <a
            href="https://github.com/somitkothari06-ops/stride"
            target="_blank"
            rel="noopener noreferrer"
          >
            Made in the open
            <ArrowRight size={14} />
          </a>
        </nav>
        <details className="nl-footer-details">
          <summary>About your data &amp; AI</summary>
          <p>
            Your story is optional. Content you use for AI help is processed
            through Nebius. Explanations can be wrong — check important details
            against your source. Saved work records what you submitted, not
            verified mastery.
          </p>
        </details>
      </footer>
    </div>
  );
}
