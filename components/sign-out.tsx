"use client";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
function leaveAccount(destination = "/login") {
  try { sessionStorage.removeItem("stride-intro-draft"); sessionStorage.removeItem("stride-pip-launch"); } catch {}
  window.location.replace(destination);
}
export function finishSignOut(destination = "/login") {
  if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("stride-account"); channel.postMessage("signed-out"); channel.close(); }
  leaveAccount(destination);
}
export default function SignOut({ signedIn }: { signedIn?: boolean }) {
  const [visible, setVisible] = useState(!!signedIn), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (signedIn !== undefined) { setVisible(signedIn); return; }
    let active = true;
    fetch("/api/account", { cache: "no-store" }).then(async response => { const data = await response.json(); if (active) setVisible(response.ok && !!data.account); }).catch(() => {});
    return () => { active = false; };
  }, [signedIn]);
  useEffect(() => {
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("stride-account");
    if (channel) channel.onmessage = event => { if (event.data === "signed-out") leaveAccount(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", restored);
    return () => { channel?.close(); window.removeEventListener("pageshow", restored); };
  }, []);
  if (!visible) return null;
  async function signOut() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signout" }) });
      if (!response.ok) throw new Error("Couldn’t sign out. Try again.");
      finishSignOut();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t sign out."); setBusy(false); }
  }
  return <span className="signout-control"><button type="button" onClick={signOut} disabled={busy} className="signout-button"><LogOut size={17}/>{busy ? "Signing out…" : "Sign out"}</button>{error && <span role="alert">{error}</span>}</span>;
}
