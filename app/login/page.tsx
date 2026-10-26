"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck, BookOpen, LogOut } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [account, setAccount] = useState<{ email: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    // Email confirmation may return an implicit-flow fragment. Never persist it in the browser.
    if (window.location.hash) {
      const values = new URLSearchParams(window.location.hash.slice(1));
      setMessage(values.has("error") ? "That confirmation link expired. Try creating your account again or sign in if already confirmed." : "Email confirmed. Sign in below to open your workspace.");
      window.history.replaceState(null, "", "/login");
    }
    fetch("/api/account", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        if (data.error?.code === "AUTH_EXPIRED") { setConfigured(true); setError(data.error.message); return; }
        throw new Error(data.error?.message || "Couldn't check your account.");
      }
      setConfigured(data.configured); setAccount(data.account);
    }).catch(() => setError("Couldn't check your account. Reload to try again.")).finally(() => setReady(true));
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Couldn't complete this request.");
      setPassword("");
      if (data.confirmationRequired) { setMessage("Check your email and follow the confirmation link, then return here to sign in. Email delivery may take a few minutes."); setMode("signin"); }
      else window.location.assign("/workspace");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't connect."); }
    finally { setBusy(false); }
  }
  async function signout(destination = "/login") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signout" }) });
      if (!response.ok) throw new Error("Couldn't sign out. Please try again.");
      window.location.assign(destination);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't sign out."); setBusy(false); }
  }
  return <main className="account-page">
    <a className="site-brand" href="/">stride<span>.</span></a>
    <a href="/workspace" className="account-back"><ArrowLeft size={18} /> Back to your workspace</a>
    <section className="account-card">
      <div className="account-intro"><BookOpen size={32} /><p className="site-kicker">YOUR WORK, WITH YOU</p><h1>Pick up where <br />you left off.</h1><p>Keep your coursework, practice and progress together. Open the same workspace on another device.</p><span><ShieldCheck size={19} /> Guest mode is always an option.</span></div>
      <div className="account-form">
        {!ready ? <p role="status">Checking your connection…</p> : account ? <>
          <h2>You’re signed in.</h2><p className="account-email">{account.email}</p><a className="btn primary" href="/workspace">Open my workspace <ArrowRight size={19} /></a><button className="btn subtle" disabled={busy} onClick={() => signout()}><LogOut size={18} />{busy ? "Signing out…" : "Sign out on this device"}</button><p className="account-help">Signing out keeps your account’s work saved. This browser will start a separate guest workspace.</p>
        </> : <>
          <div className="account-tabs" aria-label="Account options"><button aria-pressed={mode === "signin"} disabled={busy} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button><button aria-pressed={mode === "signup"} disabled={busy} onClick={() => { setMode("signup"); setError(""); }}>Create account</button></div>
          <h2>{mode === "signin" ? "Welcome back." : "Make this space yours."}</h2>
          <form onSubmit={submit}>
            <label htmlFor="account-email">Email</label><input id="account-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={busy} />
            <label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : 1} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
            {mode === "signup" && <p className="account-help">Use at least 8 characters. Confirmation emails are currently limited to project testers while email delivery is being connected.</p>}
            <button className="btn primary" disabled={busy || !configured}>{busy ? "Connecting…" : mode === "signin" ? "Sign in" : "Create my account"}<ArrowRight size={19} /></button>
          </form>
          {!configured && <p role="status">Account services aren’t connected. You can still use guest mode.</p>}
          <p className="account-help">Your first sign-in saves this browser’s guest workspace to your account. Existing accounts open their saved workspace without merging guest work. Export anything you want to keep first.</p>
          <button className="account-forget" disabled={busy} onClick={() => signout("/workspace")}>Continue as a guest</button>
        </>}
        {error && <p className="error-banner" role="alert">{error}</p>}{message && <p className="account-message" role="status">{message}</p>}
      </div>
    </section>
  </main>;
}
