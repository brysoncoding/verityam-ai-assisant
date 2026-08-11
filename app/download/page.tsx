"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function DownloadPage() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(isStandalone);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
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
        <Link href="/" className="brand">ECHO</Link>
        <Link href="/" className="navLink">OPEN ECHO</Link>
      </nav>

      <section className="hero">
        <div className="orb" aria-hidden="true"><span>E</span></div>
        <p className="eyebrow">ECHO • PERSONAL AI ASSISTANT</p>
        <h1>Your assistant.<br /><span>Ready when you are.</span></h1>
        <p className="lead">Chat with ECHO, manage your memories, use connected Google services, and bring the assistant with you wherever the web works.</p>
        <div className="actions">
          <Link href="/" className="primaryButton">USE ECHO NOW</Link>
          {!installed && installEvent && <button type="button" className="secondaryButton" onClick={installECHO}>INSTALL ECHO</button>}
        </div>
        {installed && <p className="installedNote">✓ ECHO is installed on this device.</p>}
        {!installEvent && !installed && <p className="installHint">On supported browsers, use your browser's <strong>Install app</strong> or <strong>Add to Home Screen</strong> option.</p>}
      </section>

      <section className="features" aria-label="ECHO features">
        <article><span>01</span><h2>CONVERSATIONS</h2><p>Keep context while you talk with ECHO and continue chats across sessions.</p></article>
        <article><span>02</span><h2>CONNECTED TOOLS</h2><p>Connect supported Google services so ECHO can work with your calendar and Gmail.</p></article>
        <article><span>03</span><h2>INSTALLABLE</h2><p>Use ECHO like an app from your phone or desktop without waiting for an app-store release.</p></article>
      </section>

      <section className="installSection">
        <div><p className="eyebrow">NO APP STORE REQUIRED</p><h2>Install ECHO as a web app.</h2><p>Open ECHO in a supported browser, choose Install or Add to Home Screen, and launch it from your device like an app.</p></div>
        <Link href="/" className="secondaryButton">OPEN THE APP</Link>
      </section>

      <footer><span>© 2026 ECHO</span><Link href="/">Launch ECHO</Link></footer>

      <style jsx>{`
        .downloadPage{min-height:100dvh;background:#050607;color:#e9fbff;font-family:Inter,ui-sans-serif,system-ui,sans-serif;overflow:hidden}.downloadNav{height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid rgba(98,207,255,.08);background:rgba(5,6,7,.8);backdrop-filter:blur(14px)}.brand{color:#e9fbff;text-decoration:none;font-size:20px;font-weight:950;letter-spacing:.16em;text-shadow:0 0 22px rgba(98,207,255,.35)}.navLink{color:#8ed8ff;text-decoration:none;font-size:9px;font-weight:900;letter-spacing:.12em}.hero{position:relative;max-width:900px;margin:0 auto;padding:clamp(70px,11vw,130px) 24px 100px;text-align:center}.hero:before{content:"";position:absolute;top:60px;left:50%;width:520px;height:320px;transform:translateX(-50%);background:rgba(60,180,255,.07);filter:blur(80px);pointer-events:none}.orb{position:relative;width:92px;height:92px;margin:0 auto 28px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(142,216,255,.45);background:radial-gradient(circle at 38% 30%,#bdefff 0 4%,#62cfff 17%,#0b2430 62%,#050607 100%);box-shadow:0 0 25px rgba(98,207,255,.3),inset 0 0 30px rgba(189,239,255,.18)}.orb span{font-size:34px;font-weight:950;color:#e9fbff;text-shadow:0 0 18px #62cfff}.eyebrow{color:#62cfff;font-size:9px;font-weight:900;letter-spacing:.18em}.hero h1{position:relative;margin:20px 0;font-size:clamp(42px,8vw,78px);line-height:.98;letter-spacing:-.055em}.hero h1 span{color:#8ed8ff}.lead{position:relative;max-width:650px;margin:0 auto;color:rgba(210,235,245,.62);font-size:15px;line-height:1.7}.actions{position:relative;display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:32px}.primaryButton,.secondaryButton{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:10px;text-decoration:none;font:inherit;font-size:9px;font-weight:900;letter-spacing:.1em;cursor:pointer}.primaryButton{border:1px solid rgba(98,207,255,.4);background:#62cfff;color:#041015}.secondaryButton{border:1px solid rgba(98,207,255,.25);background:rgba(98,207,255,.06);color:#bdefff}.installedNote,.installHint{position:relative;margin:16px 0 0;color:#66808e;font-size:10px}.installedNote{color:#8ed8ff}.features{max-width:1100px;margin:0 auto;padding:0 24px 90px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.features article{min-height:190px;padding:24px;border:1px solid rgba(98,207,255,.1);border-radius:16px;background:rgba(255,255,255,.015)}.features article span{color:#62cfff;font-size:9px;font-weight:900}.features h2{margin:30px 0 10px;font-size:12px;letter-spacing:.12em}.features p,.installSection p{margin:0;color:rgba(210,235,245,.55);font-size:11px;line-height:1.7}.installSection{max-width:1100px;margin:0 auto 70px;padding:34px 24px;display:flex;align-items:center;justify-content:space-between;gap:30px;border-top:1px solid rgba(98,207,255,.1);border-bottom:1px solid rgba(98,207,255,.1)}.installSection h2{margin:9px 0;font-size:26px;letter-spacing:-.03em}.installSection .secondaryButton{flex:none}footer{display:flex;justify-content:space-between;padding:24px clamp(20px,5vw,72px);color:#526875;font-size:9px;letter-spacing:.08em}footer a{color:#8ed8ff;text-decoration:none}@media(max-width:700px){.downloadNav{height:60px}.hero{padding-top:65px}.features{grid-template-columns:1fr;padding-bottom:55px}.features article{min-height:auto}.installSection{margin-bottom:35px;display:grid}.installSection .secondaryButton{width:100%}.hero h1{font-size:47px}.lead{font-size:13px}}
      `}</style>
    </main>
  );
}
