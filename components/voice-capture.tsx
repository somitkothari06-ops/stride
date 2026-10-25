"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Mic, Square, ArrowRight } from "lucide-react";
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; start(): void; stop(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function Dictation({ onText, disabled = false, onListening }: { onText: (text: string) => void; disabled?: boolean; onListening?: (active: boolean) => void }) {
  const [listening, setListening] = useState(false), [message, setMessage] = useState("");
  const [supported, setSupported] = useState<boolean | null>(null);
  const recognition = useRef<Recognition | null>(null), callback = useRef(onText), listeningCallback = useRef(onListening), committed = useRef(0), interimText = useRef(""), timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  callback.current = onText; listeningCallback.current = onListening;
  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    const stop = () => { if (document.hidden) recognition.current?.stop(); };
    document.addEventListener("visibilitychange", stop);
    return () => { document.removeEventListener("visibilitychange", stop); if (timeout.current) clearTimeout(timeout.current); const r = recognition.current; if (r) { r.onresult = null; r.onerror = null; r.onend = null; r.abort(); } };
  }, []);
  useEffect(() => { if (disabled) recognition.current?.stop(); }, [disabled]);
  function start() {
    const w = window as SpeechWindow, Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { setMessage("Voice isn’t available in this browser. Type below, or use your device’s keyboard dictation."); return; }
    const previous = recognition.current; if (previous) { previous.onresult = null; previous.onerror = null; previous.onend = null; previous.abort(); }
    if (timeout.current) clearTimeout(timeout.current);
    const r = new Constructor(); recognition.current = r; committed.current = 0; interimText.current = "";
    r.lang = "en-IN"; r.continuous = true; r.interimResults = true;
    r.onresult = (event) => {
      if (recognition.current !== r) return;
      let interim = "";
      for (let i = committed.current; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) { callback.current(result[0].transcript); committed.current = i + 1; }
        else interim += result[0].transcript;
      }
      interimText.current = interim;
      setMessage(interim || "Listening… Speak naturally. Stop when you’re done.");
    };
    r.onerror = (event) => { if (recognition.current !== r) return; setMessage(event.error === "not-allowed" || event.error === "service-not-allowed" ? "Microphone access was denied. Allow it in browser settings, or type below." : event.error === "no-speech" ? "No speech detected. Try again, or type below." : "Voice recognition couldn’t connect. Your text is still here; try again or type."); };
    r.onend = () => { if (recognition.current !== r) return; if (interimText.current) { callback.current(interimText.current); interimText.current = ""; setMessage("Stopped. The last words were a partial result—check the transcript carefully."); } setListening(false); listeningCallback.current?.(false); if (timeout.current) clearTimeout(timeout.current); setMessage((m) => m.startsWith("Listening") ? "Stopped. Check your transcript below." : m); };
    try { r.start(); setListening(true); listeningCallback.current?.(true); setMessage("Listening… Speak naturally. Stop when you’re done."); timeout.current = setTimeout(() => r.stop(), 120000); }
    catch { setListening(false); listeningCallback.current?.(false); setMessage("Couldn’t start the microphone. Try again, or type below."); }
  }
  return <div className="dictation"><button type="button" className={`btn voice-button ${listening ? "is-listening" : ""}`} disabled={disabled || supported === null} aria-pressed={listening} onClick={() => listening ? recognition.current?.stop() : start()}>{listening ? <Square size={18} /> : <Mic size={18} />}{listening ? "Stop listening" : "Speak instead"}</button><p className="voice-status" role="status">{message || (supported === false ? "Voice isn’t supported here. You can still type below." : "English (India) · up to 2 minutes per recording")}</p><small>Starts only when you tap. Your browser may send audio to its speech service. Stride saves text, not audio.</small></div>;
}
export default function VoiceCapture({ landing = false, active = true, onWork, onNote }: { landing?: boolean; active?: boolean; onWork?: (text: string) => void; onNote?: (text: string) => Promise<boolean> }) {
  const [kind, setKind] = useState<"intro" | "work" | "note">(landing ? "intro" : "work"), [text, setText] = useState(""), [busy, setBusy] = useState(false), [listening, setListening] = useState(false), [notice, setNotice] = useState("");
  const id = useId();
  async function useText() {
    setNotice("");
    if (kind === "intro") {
      try { sessionStorage.setItem("stride-intro-draft", text); window.location.assign("/about-you"); }
      catch { setNotice("Your browser blocked draft storage. Copy this text and paste it into Your story on the setup page."); }
    } else if (kind === "work") onWork?.(text);
    else { setBusy(true); try { if (await onNote?.(text)) { setText(""); setNotice("Saved to your thought inbox below."); } else setNotice("Couldn’t save. Your text is still here."); } finally { setBusy(false); } }
  }
  return <section className="voice-capture" aria-labelledby={`${id}-title`}><div className="capture-heading"><div><p className="eyebrow">SAY IT WHILE IT’S ON YOUR MIND</p><h2 id={`${id}-title`}>{landing ? "Start with your story." : "Talk it through. Keep it here."}</h2></div><Mic size={28} aria-hidden="true" /></div><p>{landing ? "What you’re studying, what you’ve tried, or what you’re still figuring out." : "A deadline, an idea, or something you don’t want to forget."}</p>{!landing && <fieldset className="capture-options" disabled={busy || listening}><legend>What would you like to capture?</legend>{([["work", "Coursework"], ["note", "Thought"], ["intro", "About me"]] as const).map(([value, label]) => <label key={value}><input type="radio" name={`${id}-kind`} checked={kind === value} onChange={() => { setKind(value); setNotice(""); }} />{label}</label>)}</fieldset>}<Dictation disabled={busy || !active} onListening={setListening} onText={(chunk) => setText((previous) => `${previous}${previous ? " " : ""}${chunk}`.slice(0, 6000))} /><label className="transcript-label" htmlFor={`${id}-text`}>Your words · edit anything</label><textarea id={`${id}-text`} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} rows={3} disabled={busy} placeholder={kind === "work" ? "My operating systems assignment is due on 29 October…" : kind === "intro" ? "I’m in my second year, and I like building things…" : "I want to try building a small game this weekend…"} /><small>{text.length.toLocaleString()} / 6,000 characters{text.length >= 6000 ? " · Limit reached. Further words won’t be added; save this entry first." : ""}</small><div className="capture-footer"><span>{kind === "work" ? "One item at a time. Review the details and date before saving." : kind === "intro" ? "Opens your personal setup. Nothing is saved to your profile yet." : "A private note, kept separately from coursework and assessed work."}</span><button type="button" className="btn primary" disabled={busy || listening || text.trim().length < (kind === "work" ? 10 : 1)} onClick={useText}>{busy ? "Saving…" : kind === "work" ? "Organise coursework" : kind === "intro" ? "Use my introduction" : "Save thought"}<ArrowRight size={17} /></button></div>{notice && <p role="status">{notice}</p>}</section>;
}
