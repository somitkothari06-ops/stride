"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck, BookOpen, LogOut, Github, Mail, ChevronDown } from "lucide-react";

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
  const [social, setSocial] = useState({ google: false, github: false, available: false });
  const [socialChecked, setSocialChecked] = useState(false);
  const [openingProvider, setOpeningProvider] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  async function loadSocial() {
    setSocialChecked(false);
    try {
      const response = await fetch("/api/account/oauth", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setSocial(await response.json());
    } catch { setSocial({ google: false, github: false, available: false }); }
    finally { setSocialChecked(true); }
  }
  useEffect(() => {
    void loadSocial();
    const oauthError = new URLSearchParams(window.location.search).get("oauth_error");
    if (oauthError) {
      if (oauthError === "cancelled") setMessage("Sign-in cancelled. Your workspace is unchanged.");
      else setError("That sign-in couldn't finish or expired. Try again in the same browser tab. Your saved work is safe.");
      window.history.replaceState(null, "", "/login");
    }
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
  async function socialSignIn(provider: "google" | "github") {
    setBusy(true); setOpeningProvider(provider); setError(""); setMessage("");
    try {
      const response = await fetch("/api/account/oauth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Couldn't open this sign-in option.");
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't connect."); setBusy(false); setOpeningProvider(""); }
  }
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
    <a className="site-brand" href="/workspace">stride<span>.</span></a>
    <a href="/workspace" className="account-back"><ArrowLeft size={18} /> Back to your workspace</a>
    <section className="account-card">
      <div className="account-intro"><BookOpen size={32} /><p className="site-kicker">YOUR WORK, WITH YOU</p><h1>Pick up where <br />you left off.</h1><p>Keep your coursework, practice and progress together. Open the same workspace on another device.</p><span><ShieldCheck size={19} /> Guest mode is always an option.</span></div>
      <div className="account-form">
        {!ready ? <p role="status">Checking your connection…</p> : account ? <>
          <h2>You’re signed in.</h2><p className="account-email">{account.email}</p><a className="btn primary" href="/workspace">Open my workspace <ArrowRight size={19} /></a><button className="btn subtle" disabled={busy} onClick={() => signout()}><LogOut size={18} />{busy ? "Signing out…" : "Sign out on this device"}</button><p className="account-help">Signing out keeps your account’s work saved. This browser will start a separate guest workspace.</p>
        </> : <>
          <div className="account-tabs" aria-label="Account options"><button aria-pressed={mode === "signin"} disabled={busy} onClick={() => { setMode("signin"); setEmailOpen(true); setError(""); }}>Sign in</button><button aria-pressed={mode === "signup"} disabled={busy} onClick={() => { setMode("signup"); setEmailOpen(true); setError(""); }}>Create account</button></div>
          <h2>{mode === "signin" ? "Welcome back." : "Make this space yours."}</h2>
          <div className="social-signin" aria-label="Sign in or create an account with a provider">
            <button className="social-button social-google" disabled={busy || !social.google} onClick={() => socialSignIn("google")}><span className="google-mark" aria-hidden="true">G</span><span>{openingProvider === "google" ? "Opening Google…" : "Continue with Google"}</span>{!social.google && socialChecked && <small>{social.available ? "Setup needed" : "Unavailable"}</small>}</button>
            <button className="social-button social-github" disabled={busy || !social.github} onClick={() => socialSignIn("github")}><Github size={22} aria-hidden="true" /><span>{openingProvider === "github" ? "Opening GitHub…" : "Continue with GitHub"}</span>{!social.github && socialChecked && <small>{social.available ? "Setup needed" : "Unavailable"}</small>}</button>
          </div>
          {!socialChecked ? <p className="account-help" role="status">Checking social sign-in…</p> : !social.available ? <p className="account-help">Social sign-in couldn’t be checked. <button className="social-retry" onClick={loadSocial} disabled={busy}>Retry</button></p> : (!social.google || !social.github) ? <p className="account-help">{!social.google && !social.github ? "Google and GitHub need one-time setup." : `${!social.google ? "Google" : "GitHub"} needs one-time setup.`} Email and guest mode are available.</p> : null}
          <details className="account-email-choice" open={emailOpen} onToggle={event => setEmailOpen(event.currentTarget.open)}>
          <summary><Mail size={18} />Continue with email<ChevronDown size={17} /></summary>
          <form onSubmit={submit}>
            <label htmlFor="account-email">Email</label><input id="account-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={busy} />
            <label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : 1} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
            {mode === "signup" && <p className="account-help">Use at least 8 characters. Email sign-up is currently limited to project testers.</p>}
            <button className="btn primary" disabled={busy || !configured}>{busy ? "Connecting…" : mode === "signin" ? "Sign in" : "Create my account"}<ArrowRight size={19} /></button>
          </form>
          </details>
          {!configured && <p role="status">Account services aren’t connected. You can still use guest mode.</p>}
          <p className="account-help">Your first sign-in saves this browser’s guest workspace to your account. Existing accounts open their saved workspace without merging guest work. Export anything you want to keep first.</p>
          <button className="account-forget" disabled={busy} onClick={() => signout("/workspace")}>Continue as a guest</button>
        </>}
        {error && <p className="error-banner" role="alert">{error}</p>}{message && <p className="account-message" role="status">{message}</p>}
      </div>
    </section>
  </main>;
}
