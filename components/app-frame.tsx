"use client";

// Full-site navigation chrome. Rendered once around app pages: a fixed left
// rail on desktop, a sticky header + drawer + bottom links on compact screens.
// Reads only the display name and demo flag from /api/navigation, never sends
// that data anywhere else and never logs it.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {Sun,BookOpen,Hammer,MessageCircle,NotebookPen,Footprints,Compass,Settings2,Plug,Menu,UserRound} from "lucide-react";
const icons={Today:Sun,Coursework:BookOpen,"My Build":Hammer,Pip:MessageCircle,Journal:NotebookPen,Progress:Footprints,Explore:Compass};

type Identity = { name: string | null; demo: boolean };

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
  const [leaving, setLeaving] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  // One lightweight fetch per frame pathname; a signed-out account (401/403)
  // clears the cached identity, and fetch failures leave the prior state.
  useEffect(() => {
    if (!framed) return;
    const source = new AbortController();
    fetch("/api/navigation", { cache: "no-store", signal: source.signal })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) setIdentity({ name: null, demo: false });
          return;
        }
        const data = (await res.json()) as { demo?: boolean; name?: string };
        setIdentity({ name: data.name?.trim() || null, demo: !!data.demo });
      })
      .catch(() => {});
    return () => source.abort();
  }, [framed, pathname]);

  useEffect(()=>{const clear=()=>{setIdentity({name:null,demo:false});setDrawerOpen(false);};window.addEventListener("stride-signout",clear);return()=>window.removeEventListener("stride-signout",clear);},[]);
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
                <Icon size={19}/>{link.label}
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
        <div className="frame-top-actions">
          <button
            ref={menuButton} type="button" className="frame-menu-btn"
            aria-expanded={drawerOpen} aria-controls="frame-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={18}/>Menu
          </button>
          <a className="frame-avatar" href="/about-you" aria-label={profileLabel}>
            {initials(identity.name)}
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
        <a className="frame-tab" href="/build" aria-current={pathname === "/build" ? "page" : undefined}><Hammer size={19}/>Build</a>
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
