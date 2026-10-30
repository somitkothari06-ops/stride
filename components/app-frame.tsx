"use client";

// Full-site navigation chrome. Rendered once around app pages: a fixed left
// rail on desktop, a sticky header + drawer + bottom links on compact screens.
// Reads only the display name and demo flag from /api/navigation, never sends
// that data anywhere else and never logs it.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {Sun,BookOpen,Hammer,MessageCircle,NotebookPen,Footprints,Compass,Settings2,Plug,Menu,UserRound,Bell,ArrowUpRight} from "lucide-react";
const icons={Today:Sun,Coursework:BookOpen,"My Build":Hammer,Pip:MessageCircle,Journal:NotebookPen,Progress:Footprints,Explore:Compass};

import type {NavigationActivity} from '@/lib/navigation-activity';
type Identity = { name: string | null; demo: boolean; activity?:NavigationActivity };

const FRAME_ROUTE =
  /^\/(?:workspace|build|pip|journal|settings|about-you)(?:\/|$)|^\/study(?:\/|$)/;
const EXCLUDED = /^\/(?:$|\?)|^\/(?:login|demo)(?:\/|$)|^\/design-lab/;

const NAV_GROUPS = [
  {
    label: "Your day",
    links: [
      { label: "Today", href: "/workspace?view=today", path: "/workspace", view: "today" },
      { label: "Coursework", href: "/workspace?view=work", path: "/workspace", view: "work" },
      { label: "My Build", href: "/build", path: "/build" },
      { label: "Pip", href: "/pip", path: "/pip" },
    ],
  },
  {
    label: "Your progress",
    links: [
      { label: "Journal", href: "/journal", path: "/journal" },
      { label: "Progress", href: "/workspace?view=memory", path: "/workspace", view: "memory" },
      { label: "Explore", href: "/workspace?view=direction", path: "/workspace", view: "direction" },
    ],
  },
] as const;

function initials(name: string | null) {
  return (name ?? "").split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0].toUpperCase()).join("");
}

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const framed = FRAME_ROUTE.test(pathname) && !EXCLUDED.test(pathname);
  const [view, setView] = useState("today");
  const [identity, setIdentity] = useState<Identity>({ name: null, demo: false });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activityOpen,setActivityOpen]=useState(false);
  const [leaving, setLeaving] = useState(false);
  const navigationEpoch=useRef(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  // One lightweight fetch per frame pathname; a signed-out account (401/403)
  // clears the cached identity, and fetch failures leave the prior state.
  useEffect(() => {
    if (!framed) return;
    const source = new AbortController();
    const refresh=()=>{if(document.visibilityState!=="visible")return;const epoch=++navigationEpoch.current;fetch("/api/navigation", { cache: "no-store", signal: source.signal })
      .then(async (res) => {
        if(epoch!==navigationEpoch.current)return;
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) setIdentity({ name: null, demo: false });
          return;
        }
        const data = (await res.json()) as { demo?: boolean; name?: string; activity?:NavigationActivity };
        if(epoch!==navigationEpoch.current)return;
        setIdentity({ name: data.name?.trim() || null, demo: !!data.demo,activity:data.activity });
      })
      .catch(() => {});};
    refresh();const timer=window.setInterval(refresh,30000);window.addEventListener("focus",refresh);window.addEventListener("stride-activity-change",refresh);
    return () => {navigationEpoch.current++;source.abort();clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("stride-activity-change",refresh);};
  }, [framed, pathname]);

  useEffect(()=>{const clear=()=>{navigationEpoch.current++;setActivityOpen(false);setIdentity({name:null,demo:false});setDrawerOpen(false);};window.addEventListener("stride-signout",clear);return()=>window.removeEventListener("stride-signout",clear);},[]);
  useEffect(()=>{if(!activityOpen)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setActivityOpen(false);document.querySelector<HTMLButtonElement>('.frame-activity-toggle')?.focus();}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[activityOpen]);
  // Workspace active view comes from the URL and follows in-page view changes.
  useEffect(() => {
    if (!framed) return;
    const read = () => {
      const current = new URLSearchParams(window.location.search).get("view");
      setView(current||"today");
    };
    read();
    const onView = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail) setView(detail);
    };
    window.addEventListener("popstate", read);
    window.addEventListener("stride-view-change", onView);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("stride-view-change", onView);
    };
  }, [framed]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  };

  useEffect(() => {
    if (drawerOpen) drawer.current?.focus();
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
      if(event.key==='Tab'){const items=Array.from(drawer.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')||[]),first=items[0],last=items.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===drawer.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    };
    const prior=document.body.style.overflow;document.body.style.overflow="hidden";window.addEventListener("keydown", onKey);
    return () => {document.body.style.overflow=prior;window.removeEventListener("keydown", onKey);};
  }, [drawerOpen]);

  // Leaving demo removes demo data only; the underlying account stays signed in.
  const leaveDemo = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      const response=await fetch("/api/demo", { method: "DELETE" });if(!response.ok)throw new Error("Could not leave demo.");
      window.location.assign("/");
    } catch {setLeaving(false);window.alert("Could not leave the demo. Please try again.");} finally {
      setLeaving(false);
    }
  };

  const activeFor = (link: (typeof NAV_GROUPS)[number]["links"][number]) =>
    "view" in link
      ? pathname === link.path && view === link.view
      : pathname === link.path || pathname.startsWith(`${link.path}/`);

  const profileLabel = identity.name
    ? `My profile: ${identity.name}`
    : "My profile";

  const brand = (
    <a className="frame-brand" href="/workspace" aria-label="Stride home">
      stride.
    </a>
  );

  const badgeFor=(label:string)=>label==='Coursework'?identity.activity?.coursework||0:label==='My Build'?identity.activity?.build||0:0;
  const badgeLabel=(label:string,count:number)=>label==='Coursework'?`${count} open ${count===1?"task":"tasks"}`:`${count} active ${count===1?"build":"builds"}`;
  const countBadge=(label:string)=>{const count=badgeFor(label);return count>0?<span className="frame-count" title={badgeLabel(label,count)}><span aria-hidden="true">{count>99?'99+':count}</span><span className="sr-only">{badgeLabel(label,count)}</span></span>:null;};
  const activityCount=(identity.activity?.coursework||0)+(identity.activity?.build||0);
  const navBody = (
    <>
      {NAV_GROUPS.map((group) => (
        <div className="frame-group" key={group.label}>
          <p className="frame-group-label">{group.label}</p>
          {group.links.map((link) => {
            const active = activeFor(link);const Icon=icons[link.label];
            return (
              <a
                key={link.label}
                href={link.href}
                className={`frame-link${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setDrawerOpen(false);
                  if (drawerOpen) menuButton.current?.focus();
                }}
              >
                <span className="frame-icon"><Icon size={19}/></span><span>{link.label}</span>{countBadge(link.label)}
              </a>
            );
          })}
        </div>
      ))}
    </>
  );

  const railFoot = (
    <footer className="frame-rail-foot">
      <a className="frame-profile" href="/about-you" aria-label={profileLabel}>
        <span className="frame-avatar" aria-hidden="true">{initials(identity.name)||<UserRound size={21}/>}</span>
        <span className="frame-profile-name">{identity.name ?? "Profile"}</span>
      </a>
      <a className="frame-link" href="/settings"><Settings2 size={18}/>Settings</a>
      <a className="frame-link" href="/workspace?open=integrations"><Plug size={18}/>Connections</a>
    </footer>
  );

  if (!framed) return <>{children}</>;

  const todayActive = pathname === "/workspace" && view === "today";

  return (
    <div className="app-frame" data-route={pathname} data-demo={identity.demo||undefined}>
      <div className="app-frame-rail">
        {brand}
        <nav className="frame-nav" aria-label="Primary">{navBody}</nav>
        {railFoot}
      </div>
      <header className="frame-top">
        {brand}
        <div className="frame-top-actions"><a className="frame-top-settings" href="/settings"><Settings2 size={17}/><span>Settings</span></a>
          <button
            ref={menuButton} type="button" className="frame-menu-btn"
            aria-expanded={drawerOpen} aria-controls="frame-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={18}/>Menu
          </button>
          <a className="frame-avatar" href="/about-you" aria-label={profileLabel}>
            <span className="frame-top-initial" aria-hidden="true">{initials(identity.name)||<UserRound size={18}/>}</span><span className="frame-top-profile-name">{identity.name||"Your profile"}<small>My profile</small></span><ArrowUpRight size={15}/>
          </a>
        </div>
      </header>
      <div className="app-frame-body">
        {identity.demo && (
          <div className="frame-demo">
            <a href="/demo">Demo · sample student work</a>
            <button type="button" className="frame-demo-leave" onClick={leaveDemo} disabled={leaving}>
              {leaving ? "Leaving demo…" : "Leave demo"}
            </button>
          </div>
        )}
        <div className="frame-desk-bar"><span>Your desk <span aria-hidden="true">/</span> {pathname==='/workspace'?({today:'Today',work:'Coursework',memory:'Progress',direction:'Explore'}[view]||'Today'):pathname==='/build'?'My Build':pathname==='/pip'?'Pip':pathname==='/journal'?'Journal':pathname==='/settings'?'Settings':pathname==='/about-you'?'Your profile':'Notes'}</span><div className="frame-activity"><button type="button" className="frame-activity-toggle" onClick={()=>setActivityOpen(!activityOpen)} aria-expanded={activityOpen} aria-controls="desk-activity" aria-label={`On your desk: ${activityCount} open tasks and active builds`}><Bell size={17}/><span>On your desk</span>{activityCount>0&&<b>{activityCount>99?'99+':activityCount}</b>}</button>{activityOpen&&<div id="desk-activity" className="frame-activity-list"><strong>Ready when you are</strong>{identity.activity?<><a href="/workspace?view=work">{identity.activity.coursework} open tasks <ArrowUpRight size={16}/></a><a href="/build">{identity.activity.build?'Continue your build':'Start a build'}<ArrowUpRight size={16}/></a><a href="/journal">{identity.activity.journal} saved journal entries <ArrowUpRight size={16}/></a><small>Counts show saved work, not unread messages.</small></>:<p>Open your workspace to see your work.</p>}<button type="button" onClick={()=>setActivityOpen(false)}>Close</button></div>}</div></div>
        {children}
      </div>
      <div className={`frame-scrim${drawerOpen ? " open" : ""}`} onClick={closeDrawer} aria-hidden="true" />
      <div
        id="frame-drawer" ref={drawer} tabIndex={-1} role="dialog"
        aria-modal="true" aria-label="Menu"
        className={`frame-drawer${drawerOpen ? " open" : ""}`}
      >
        <button type="button" className="frame-close" onClick={closeDrawer} aria-label="Close menu">✕</button>
        {brand}
        <nav className="frame-nav" aria-label="Menu">{navBody}</nav>
        {railFoot}
      </div>
      <nav className="frame-tabs" aria-label="Quick navigation">
        <a className="frame-tab" href="/workspace?view=today" aria-current={todayActive ? "page" : undefined}><Sun size={19}/>Today</a>
        <a className="frame-tab" href="/build" aria-current={pathname === "/build" ? "page" : undefined}><Hammer size={19}/>Build{countBadge("My Build")}</a>
        <a className="frame-tab" href="/pip" aria-current={pathname === "/pip" ? "page" : undefined}><MessageCircle size={19}/>Pip</a>
        <button
          type="button" className="frame-tab" aria-expanded={drawerOpen}
          aria-controls="frame-drawer" onClick={() => setDrawerOpen(true)}
        >
          <Menu size={19}/>Menu
        </button>
      </nav>
    </div>
  );
}
