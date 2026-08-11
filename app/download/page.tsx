"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function DownloadPage() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
    const prompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent); };
    const done = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", prompt); window.removeEventListener("appinstalled", done); };
  }, []);

  async function installECHO() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <main className="downloadPage">
      <nav className="downloadNav">
        <Link href="/download" className="brand">ECHO</Link>
        <div className="navLinks"><a href="#features">FEATURES</a><a href="#install">INSTALL</a><Link href="/">OPEN ECHO</Link></div>
      </nav>

      <section className="hero">
        <div className="orb" aria-hidden="true"><span>E</span></div>
        <p className="eyebrow">ECHO • PERSONAL AI ASSISTANT</p>
        <h1>Your assistant.<br /><span>Ready when you are.</span></h1>
        <p className="lead">A private-feeling, app-like AI workspace for conversations, memory, voice, and supported Google tools — available straight from the web.</p>
        <div className="actions"><Link href="/" className="primaryButton">USE ECHO NOW</Link>{!installed && installEvent && <button type="button" className="secondaryButton" onClick={installECHO}>INSTALL ECHO</button>}</div>
        {installed && <p className="installedNote">✓ ECHO is installed on this device.</p>}
        {!installEvent && !installed && <p className="installHint">Supported browsers may show <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>}
      </section>

      <section id="features" className="features" aria-label="ECHO features">
        <article><span>01</span><h2>CONVERSATIONS</h2><p>ECHO keeps recent conversation context so follow-up questions feel like part of the same conversation.</p></article>
        <article><span>02</span><h2>CONNECTED TOOLS</h2><p>With your permission, ECHO can work with supported Google services such as Gmail and Calendar.</p></article>
        <article><span>03</span><h2>VOICE CONTROL</h2><p>Tap ECHO to speak a command. The microphone isn't kept running in the background.</p></article>
        <article><span>04</span><h2>CHAT HISTORY</h2><p>Continue previous conversations instead of starting from zero every time you open ECHO.</p></article>
        <article><span>05</span><h2>INSTALLABLE</h2><p>Install ECHO from a supported browser and launch it from your phone or desktop like a web app.</p></article>
        <article><span>06</span><h2>ONE WORKSPACE</h2><p>Chat, memory, voice, system controls, and permissions are organized in one ECHO experience.</p></article>
      </section>

      <section id="install" className="installSection">
        <div><p className="eyebrow">NO APP STORE REQUIRED</p><h2>Install ECHO as a web app.</h2><p>Open ECHO in a supported browser, choose Install or Add to Home Screen, and launch it from your device like an app. Availability of the install prompt depends on your browser and device.</p></div>
        <div className="installActions">{!installed && installEvent && <button type="button" className="secondaryButton" onClick={installECHO}>INSTALL ECHO</button>}<Link href="/" className="primaryButton">OPEN THE APP</Link></div>
      </section>

      <section className="trustSection">
        <p className="eyebrow">YOUR CONNECTIONS</p><h2>You choose what ECHO can access.</h2><p>Google features require you to connect and authorize the requested permissions. You can manage your connected account and permissions from ECHO Settings. ECHO does not get access to Google services simply because you visit this page.</p><Link href="/#settings">VIEW ECHO SETTINGS →</Link>
      </section>

      <section className="legalSection"><div><h3>PRIVACY</h3><p>Use only the permissions you are comfortable granting. Connected-service access is intended to be controlled from your ECHO settings and Google's authorization system.</p></div><div><h3>TERMS</h3><p>ECHO is provided as an evolving software project. Features, browser support, and connected-service availability may change as the project develops.</p></div></section>

      <footer><span>© 2026 ECHO</span><div><Link href="/">Launch ECHO</Link><span>•</span><a href="#features">Features</a><span>•</span><a href="#install">Install</a></div></footer>

      <style jsx>{`
        .downloadPage{min-height:100dvh;background:#050607;color:#e9fbff;font-family:Inter,ui-sans-serif,system-ui,sans-serif;overflow:hidden}.downloadNav{height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid rgba(98,207,255,.08);background:rgba(5,6,7,.8);backdrop-filter:blur(14px);position:sticky;top:0;z-index:10}.brand{color:#e9fbff;text-decoration:none;font-size:20px;font-weight:950;letter-spacing:.16em;text-shadow:0 0 22px rgba(98,207,255,.35)}.navLinks{display:flex;gap:22px;align-items:center}.navLinks a,footer a,.trustSection a{color:#8ed8ff;text-decoration:none;font-size:9px;font-weight:900;letter-spacing:.1em}.hero{position:relative;max-width:900px;margin:0 auto;padding:clamp(70px,11vw,130px) 24px 100px;text-align:center}.hero:before{content:"";position:absolute;top:60px;left:50%;width:520px;height:320px;transform:translateX(-50%);background:rgba(60,180,255,.07);filter:blur(80px);pointer-events:none}.orb{position:relative;width:92px;height:92px;margin:0 auto 28px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(142,216,255,.45);background:radial-gradient(circle at 38% 30%,#bdefff 0 4%,#62cfff 17%,#0b2430 62%,#050607 100%);box-shadow:0 0 25px rgba(98,207,255,.3),inset 0 0 30px rgba(189,239,255,.18)}.orb span{font-size:34px;font-weight:950;color:#e9fbff;text-shadow:0 0 18px #62cfff}.eyebrow{color:#62cfff;font-size:9px;font-weight:900;letter-spacing:.18em}.hero h1{position:relative;margin:20px 0;font-size:clamp(42px,8vw,78px);line-height:.98;letter-spacing:-.055em}.hero h1 span{color:#8ed8ff}.lead{position:relative;max-width:680px;margin:0 auto;color:rgba(210,235,245,.62);font-size:15px;line-height:1.7}.actions{position:relative;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:32px}.primaryButton,.secondaryButton{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:10px;text-decoration:none;font:inherit;font-size:9px;font-weight:900;letter-spacing:.1em;cursor:pointer}.primaryButton{border:1px solid rgba(98,207,255,.4);background:#62cfff;color:#041015}.secondaryButton{border:1px solid rgba(98,207,255,.25);background:rgba(98,207,255,.06);color:#bdefff}.installedNote,.installHint{position:relative;margin:16px 0 0;color:#66808e;font-size:10px}.installedNote{color:#8ed8ff}.features{max-width:1100px;margin:0 auto;padding:0 24px 90px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.features article{min-height:180px;padding:24px;border:1px solid rgba(98,207,255,.1);border-radius:16px;background:rgba(255,255,255,.015)}.features article span{color:#62cfff;font-size:9px;font-weight:900}.features h2{margin:30px 0 10px;font-size:12px;letter-spacing:.12em}.features p,.installSection p,.trustSection p,.legalSection p{margin:0;color:rgba(210,235,245,.55);font-size:11px;line-height:1.7}.installSection{max-width:1100px;margin:0 auto 60px;padding:38px 24px;display:flex;align-items:center;justify-content:space-between;gap:30px;border-top:1px solid rgba(98,207,255,.1);border-bottom:1px solid rgba(98,207,255,.1)}.installSection h2,.trustSection h2{margin:9px 0;font-size:28px;letter-spacing:-.03em}.installActions{display:flex;gap:9px;flex:none}.trustSection{max-width:760px;margin:0 auto;padding:45px 24px 70px;text-align:center}.trustSection a{display:inline-block;margin-top:20px}.legalSection{max-width:1100px;margin:0 auto;padding:35px 24px;display:grid;grid-template-columns:1fr 1fr;gap:45px;border-top:1px solid rgba(98,207,255,.08)}.legalSection h3{font-size:10px;letter-spacing:.13em;color:#8ed8ff}.legalSection p{font-size:10px}footer{display:flex;justify-content:space-between;align-items:center;padding:24px clamp(20px,5vw,72px);color:#526875;font-size:9px;letter-spacing:.08em}footer div{display:flex;gap:9px;align-items:center}@media(max-width:700px){.downloadNav{height:60px}.navLinks{gap:10px}.navLinks a{font-size:7px}.navLinks a:first-child{display:none}.hero{padding-top:65px}.features{grid-template-columns:1fr;padding-bottom:55px}.features article{min-height:auto}.installSection{margin:0 0 35px;display:grid}.installActions{width:100%;display:grid}.installActions>*{width:100%}.hero h1{font-size:47px}.lead{font-size:13px}.legalSection{grid-template-columns:1fr;gap:22px}.trustSection h2{font-size:24px}footer{display:grid;gap:12px}footer div{justify-content:flex-start}}
      `}</style>
    </main>
  );
}
