"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
export default function SiteHeader({desktop=false}:{desktop?:boolean}) {
  const [label, setLabel] = useState("Account");
  const [signedIn,setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/account",{cache:"no-store"}).then(async response => {
      const data = await response.json();
      setSignedIn(response.ok && !!data.account);
      setLabel(response.ok ? data.account ? "My account" : "Sign in" : "Reconnect account");
    }).catch(()=>setLabel("Account"));
  },[]);
  return <header className="site-header"><a className="site-brand" href={signedIn ? "/workspace" : "/"}>stride<span>.</span></a><nav aria-label="Website navigation">{desktop?<a href="/workspace">Your workspace</a>:<><a href="#how-it-works">How it works</a><a href="#your-course">Your course</a></>}<a href="/demo">Try the demo</a><a href="/settings">Settings</a><a href="/login">{label}</a></nav><a className="btn primary" href={signedIn ? "/workspace" : "/about-you"}>{signedIn ? "Back to my workspace" : "Start your space"}<ArrowRight size={16}/></a></header>;
}
